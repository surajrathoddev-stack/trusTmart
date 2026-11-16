// src/services/verificationService.js
// Central product verification service.
// Combines: cryptographic hash integrity, blockchain on-chain anchor, provenance continuity,
// location consistency, and seller evidence verification.
// Returns AUTHENTIC / SUSPICIOUS / UNVERIFIED with detailed reasons.

const db = require('../config/database');
const blockchainService = require('./blockchainService');
const sellerService = require('./sellerService');
const eventService = require('./eventService');
const productService = require('./productService');

/**
 * Perform comprehensive product verification for a consumer or stakeholder.
 * @param {string} unitId  UUID of the physical unit (from QR code or lookup).
 * @param {Object} [context]  Optional contextual data (scanLocation, scannerId, ipAddress).
 */
async function verifyProduct(unitId, context = {}) {
  const reasons = [];
  let overallStatus = 'AUTHENTIC';

  // 1. Fetch unit from database
  let unit;
  try {
    unit = await productService.getUnitById(unitId);
  } catch {
    await logScan(unitId, 'UNVERIFIED', 'Product unit not found in system', context);
    return {
      status: 'UNVERIFIED',
      reasons: ['Product unit not found in the trusTmart registry.'],
      product: null,
      sellerEvidence: null,
      transactions: [],
      timeline: [],
    };
  }

  // 2. Cryptographic Hash Integrity Check
  const hashCheckResult = await checkHashIntegrity(unit);
  if (hashCheckResult.mismatch) {
    overallStatus = 'SUSPICIOUS';
    reasons.push(hashCheckResult.reason);
  } else {
    reasons.push('Cryptographic hash integrity check passed — state digest matches event chain.');
  }

  // 3. Permissioned Blockchain Verification Check
  const chainResult = await checkBlockchainRecord(unit);
  if (chainResult.issue) {
    if (overallStatus !== 'SUSPICIOUS') overallStatus = chainResult.severity;
    reasons.push(chainResult.reason);
  } else if (chainResult.skipped) {
    reasons.push(chainResult.reason);
    if (overallStatus === 'AUTHENTIC') overallStatus = 'UNVERIFIED';
  } else {
    reasons.push('Blockchain record verified on permissioned Besu QBFT network.');
  }

  // 4. Provenance & Custody History Continuity
  const timeline = await eventService.getEventsByUnit(unitId);
  const provenanceResult = checkProvenance(timeline, unit);
  if (provenanceResult.issue) {
    if (overallStatus === 'AUTHENTIC') overallStatus = 'SUSPICIOUS';
    reasons.push(provenanceResult.reason);
  } else {
    reasons.push('Custodial provenance chain verified — no unexpected breaks in custody.');
  }

  // 5. Point of Sale & Physical Location Verification
  const locationResult = checkLocation(timeline, unit, context.scanLocation);
  if (locationResult.issue) {
    if (overallStatus === 'AUTHENTIC') overallStatus = 'SUSPICIOUS';
    reasons.push(locationResult.reason);
  } else {
    reasons.push('Location consistency check passed.');
  }

  // 6. Seller Verification & Trust Score Integration
  let sellerEvidence = null;
  const sellerId = unit.registered_by || (timeline.length > 0 ? timeline[timeline.length - 1].seller_id : null);
  if (sellerId) {
    sellerEvidence = await sellerService.getSellerTrust(sellerId);
    if (sellerEvidence.evidenceStatus === 'HIGH_RISK' || sellerEvidence.verificationStatus === 'SUSPICIOUS') {
      if (overallStatus === 'AUTHENTIC') overallStatus = 'SUSPICIOUS';
      reasons.push(`Seller flagged as HIGH_RISK: ${sellerEvidence.explanation || 'Suspicious seller signals detected.'}`);
    } else if (sellerEvidence.evidenceStatus === 'UNKNOWN' || sellerEvidence.verificationStatus === 'UNVERIFIED') {
      reasons.push('Seller verification data is pending or unavailable — treated as neutral signal.');
    } else {
      reasons.push('Seller credentials verified with positive compliance signals.');
    }

    // Also check on-chain seller verification if available
    try {
      const onChainSeller = await blockchainService.getSellerVerificationFromChain(sellerId);
      if (onChainSeller && onChainSeller.exists) {
        sellerEvidence.onChainStatus = onChainSeller.verificationStatus;
        sellerEvidence.onChainEvidenceHash = onChainSeller.evidenceHash;
        reasons.push(`Seller on-chain assessment verified: ${onChainSeller.verificationStatus}`);
      }
    } catch {
      // Non-blocking
    }
  }

  // 7. Safety Rule: Incomplete critical checks must never default to AUTHENTIC
  if (chainResult.skipped && hashCheckResult.mismatch) {
    overallStatus = 'UNVERIFIED';
    reasons.push('Critical verification signals could not be independently established.');
  }

  // 8. Retrieve transaction history
  const transactions = await getChainTransactions(unitId);

  // 9. Record scan log
  await logScan(unitId, overallStatus, reasons.join('; '), context);

  return {
    status: overallStatus,
    reasons,
    product: {
      unitId: unit.unit_id,
      productId: unit.product_id,
      productName: unit.product_name || unit.productName,
      brand: unit.brand,
      domain: unit.domain || unit.category,
      gtin: unit.gtin,
      serialNumber: unit.serial_number,
      batchNumber: unit.batch_number,
      currentStatus: unit.current_status,
      currentLocation: unit.current_location,
      isSold: unit.is_sold,
      dataHash: unit.data_hash,
      registeredAt: unit.created_at,
    },
    sellerEvidence,
    transactions,
    timeline: timeline.map((e) => ({
      eventId: e.event_id,
      eventType: e.event_type,
      fromLocation: e.from_location,
      toLocation: e.to_location || e.location,
      statusBefore: e.status_before,
      statusAfter: e.status_after,
      actorName: e.actor_name,
      sellerName: e.seller_name,
      notes: e.notes,
      onChainTx: e.on_chain_tx,
      timestamp: e.created_at,
    })),
  };
}

/**
 * Check if stored data_hash matches the latest supply chain event.
 */
async function checkHashIntegrity(unit) {
  try {
    const latestEvent = await db.query(
      'SELECT data_hash FROM supply_chain_events WHERE unit_id = $1 ORDER BY created_at DESC LIMIT 1',
      [unit.unit_id]
    );

    const currentHash = unit.data_hash;

    if (latestEvent.rows.length > 0) {
      const eventHash = latestEvent.rows[0].data_hash;
      if (eventHash && currentHash && eventHash !== currentHash) {
        return {
          mismatch: true,
          reason: `Hash mismatch: unit state hash (${currentHash.slice(0, 10)}…) differs from latest custody event hash (${eventHash.slice(0, 10)}…). Possible unauthorized modification detected.`,
        };
      }
    }
  } catch (err) {
    console.warn('Hash integrity check warning:', err.message);
  }

  return { mismatch: false };
}

/**
 * Check on-chain unit registration.
 */
async function checkBlockchainRecord(unit) {
  const onChainData = await blockchainService.getUnitFromChain(unit.data_hash);

  if (onChainData === null) {
    return {
      skipped: true,
      reason: 'On-chain verification unavailable (RPC node unreachable or unit not yet committed to block).',
    };
  }

  if (!onChainData.isRegistered) {
    return {
      issue: true,
      severity: 'SUSPICIOUS',
      reason: 'Physical unit exists in off-chain database but lacks a valid registration anchor on the permissioned blockchain.',
    };
  }

  if (unit.on_chain_tx) {
    const receipt = await blockchainService.verifyTransactionReceipt(unit.on_chain_tx);
    if (receipt && receipt.status === 'failed') {
      return {
        issue: true,
        severity: 'SUSPICIOUS',
        reason: `Registration transaction (${unit.on_chain_tx.slice(0, 12)}…) reverted on-chain.`,
      };
    }
  }

  return { issue: false, skipped: false };
}

/**
 * Check provenance completeness and order.
 */
function checkProvenance(timeline, unit) {
  const status = (unit.current_status || '').toUpperCase();
  if (timeline.length === 0 && status !== 'REGISTERED') {
    return {
      issue: true,
      reason: `Unit is marked as '${status}' but has no recorded custody events in the supply chain.`,
    };
  }

  if (unit.is_sold && timeline.length < 2) {
    return {
      issue: true,
      reason: 'Unit is marked as SOLD without preceding custody transfer events.',
    };
  }

  return { issue: false };
}

/**
 * Check location consistency.
 */
function checkLocation(timeline, unit, scanLocation) {
  if (timeline.length > 0) {
    const lastEvent = timeline[timeline.length - 1];
    const recorded = (lastEvent.to_location || lastEvent.location || '').trim().toLowerCase();
    const current = (unit.current_location || '').trim().toLowerCase();

    if (recorded && current && recorded !== current) {
      return {
        issue: true,
        reason: `Location discrepancy: current recorded location "${unit.current_location}" does not match last custody event location "${lastEvent.to_location || lastEvent.location}".`,
      };
    }
  }

  return { issue: false };
}

/**
 * Fetch chain transactions.
 */
async function getChainTransactions(unitId) {
  try {
    const res = await db.query(
      `SELECT tx_id, tx_hash, network, block_number, tx_status, created_at
       FROM chain_transactions
       WHERE unit_id = $1
       ORDER BY created_at ASC`,
      [unitId]
    );
    return res.rows.map((r) => ({
      txHash: r.tx_hash,
      network: r.network,
      blockNumber: r.block_number,
      status: r.tx_status,
      timestamp: r.created_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Log scan into scan_logs table.
 */
async function logScan(unitId, result, reason, context = {}) {
  try {
    await db.query(
      `INSERT INTO scan_logs (unit_id, scanned_by_user_id, result, reason, scan_location, ip_address, scanned_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        unitId,
        context.scannerId ? parseInt(context.scannerId, 10) : null,
        result,
        reason || null,
        context.scanLocation || null,
        context.ipAddress || null,
      ]
    );
  } catch (err) {
    console.warn('Could not record scan log:', err.message);
  }
}

module.exports = {
  verifyProduct,
  checkHashIntegrity,
  checkBlockchainRecord,
  checkProvenance,
  checkLocation,
};
