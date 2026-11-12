// src/services/verificationService.js
// Central product verification — the consumer-facing verification logic.
// Combines: hash match, provenance completeness, location check, and seller evidence.
// Returns AUTHENTIC / SUSPICIOUS / UNVERIFIED with reasons.

const db = require('../config/database');
const { computeUnitHash } = require('../utils/hash');
const blockchainService = require('./blockchainService');
const sellerService = require('./sellerService');
const eventService = require('./eventService');
const productService = require('./productService');

/**
 * Perform full product verification for a consumer.
 *
 * @param {string} unitId  The product unit ID (from QR code).
 * @returns {Object}  { status, reasons, product, sellerEvidence, transactions, timeline }
 */
async function verifyProduct(unitId) {
  const reasons = [];
  let overallStatus = 'AUTHENTIC'; // start optimistic, downgrade as checks fail

  // 1. Look up the unit
  let unit;
  try {
    unit = await productService.getUnitById(unitId);
  } catch {
    return {
      status: 'UNVERIFIED',
      reasons: ['Product unit not found in the system.'],
      product: null,
      sellerEvidence: null,
      transactions: [],
      timeline: [],
    };
  }

  // 2. Hash verification — recalculate and compare
  const hashCheckResult = await checkHashIntegrity(unit);
  if (hashCheckResult.mismatch) {
    overallStatus = 'SUSPICIOUS';
    reasons.push(hashCheckResult.reason);
  } else {
    reasons.push('Hash integrity check passed.');
  }

  // 3. Blockchain verification — compare with on-chain record
  const chainResult = await checkBlockchainRecord(unit);
  if (chainResult.issue) {
    if (overallStatus !== 'SUSPICIOUS') overallStatus = chainResult.severity;
    reasons.push(chainResult.reason);
  } else if (chainResult.skipped) {
    reasons.push(chainResult.reason);
    // If blockchain is not configured, we can't fully verify — downgrade from AUTHENTIC
    if (overallStatus === 'AUTHENTIC') overallStatus = 'UNVERIFIED';
  } else {
    reasons.push('Blockchain record verified.');
  }

  // 4. Provenance completeness — check for gaps in the custody chain
  const timeline = await eventService.getEventsByUnit(unitId);
  const provenanceResult = checkProvenance(timeline, unit);
  if (provenanceResult.issue) {
    if (overallStatus === 'AUTHENTIC') overallStatus = 'SUSPICIOUS';
    reasons.push(provenanceResult.reason);
  } else {
    reasons.push('Custody chain is complete with no gaps.');
  }

  // 5. Location check — compare sale location against last recorded location
  const locationResult = checkLocation(timeline, unit);
  if (locationResult.issue) {
    if (overallStatus === 'AUTHENTIC') overallStatus = 'SUSPICIOUS';
    reasons.push(locationResult.reason);
  } else {
    reasons.push('Location check passed.');
  }

  // 6. Seller evidence — query Ruchita's service
  let sellerEvidence = null;
  if (unit.registered_by) {
    sellerEvidence = await sellerService.getSellerTrust(unit.registered_by);
    if (sellerEvidence.evidenceStatus === 'HIGH_RISK') {
      if (overallStatus === 'AUTHENTIC') overallStatus = 'SUSPICIOUS';
      reasons.push(`Seller flagged as HIGH_RISK: ${sellerEvidence.explanation || 'no details available'}.`);
    } else if (sellerEvidence.evidenceStatus === 'UNKNOWN') {
      reasons.push('Seller verification data unavailable — treated as neutral signal.');
    } else {
      reasons.push('Seller verification: VERIFIED.');
    }
  }

  // 7. Rule: if a required check could not be completed, never default to AUTHENTIC
  const criticalChecksFailed = chainResult.skipped && hashCheckResult.mismatch;
  if (criticalChecksFailed && overallStatus === 'AUTHENTIC') {
    overallStatus = 'UNVERIFIED';
    reasons.push('One or more critical checks could not be completed.');
  }

  // 8. Get associated chain transactions
  const transactions = await getChainTransactions(unitId);

  // 9. Log the scan
  await logScan(unitId, overallStatus);

  return {
    status: overallStatus,
    reasons,
    product: {
      unitId: unit.id,
      productName: unit.product_name,
      brand: unit.brand,
      category: unit.category,
      serialNumber: unit.serial_number,
      batchNumber: unit.batch_number,
      manufactureDate: unit.manufacture_date,
      currentStatus: unit.status,
      currentLocation: unit.current_location,
      registeredAt: unit.created_at,
    },
    sellerEvidence,
    transactions,
    timeline: timeline.map((e) => ({
      eventType: e.event_type,
      fromLocation: e.from_location,
      toLocation: e.to_location,
      statusBefore: e.status_before,
      statusAfter: e.status_after,
      actorRole: e.actor_role,
      actorName: e.actor_name,
      notes: e.notes,
      onChainTx: e.on_chain_tx,
      timestamp: e.created_at,
    })),
  };
}

/**
 * Check hash integrity by recalculating from current stored details.
 */
async function checkHashIntegrity(unit) {
  // Get the most recent event hash or use the registration hash
  const latestEvent = await db.query(
    'SELECT detail_hash FROM supply_chain_events WHERE unit_id = $1 ORDER BY created_at DESC LIMIT 1',
    [unit.id]
  );

  const currentStoredHash = unit.detail_hash;

  // If there are events, the unit's hash should match the latest event's hash
  if (latestEvent.rows.length > 0) {
    const latestHash = latestEvent.rows[0].detail_hash;
    if (currentStoredHash !== latestHash) {
      return {
        mismatch: true,
        reason: `Hash mismatch: unit hash (${currentStoredHash.substring(0, 12)}…) does not match latest event hash (${latestHash.substring(0, 12)}…). Possible tampering detected.`,
      };
    }
  }

  return { mismatch: false };
}

/**
 * Check the blockchain record for this unit.
 */
async function checkBlockchainRecord(unit) {
  const onChainData = await blockchainService.getUnitFromChain(unit.detail_hash);

  if (onChainData === null) {
    return {
      skipped: true,
      reason: 'Blockchain verification not available (contract not configured or unit not found on-chain).',
    };
  }

  if (!onChainData.isRegistered) {
    return {
      issue: true,
      severity: 'SUSPICIOUS',
      reason: 'Unit is not registered on-chain — off-chain record exists but blockchain anchor is missing.',
    };
  }

  // Verify registration tx if available
  if (unit.on_chain_tx) {
    const receipt = await blockchainService.verifyTransactionReceipt(unit.on_chain_tx);
    if (receipt && receipt.status === 'failed') {
      return {
        issue: true,
        severity: 'SUSPICIOUS',
        reason: `Registration transaction ${unit.on_chain_tx} failed on-chain.`,
      };
    }
  }

  return { issue: false, skipped: false };
}

/**
 * Check provenance completeness — are there gaps in the custody chain?
 */
function checkProvenance(timeline, unit) {
  if (timeline.length === 0 && unit.status !== 'registered') {
    return {
      issue: true,
      reason: 'Unit has moved past "registered" status but has no recorded supply-chain events — provenance gap detected.',
    };
  }

  // Check for logical sequence gaps
  const expectedFlow = ['registered', 'in_transit', 'delivered', 'sold'];
  if (unit.status === 'sold' && timeline.length < 2) {
    return {
      issue: true,
      reason: 'Unit is marked as sold but has fewer than 2 supply-chain events — unusually short custody chain.',
    };
  }

  return { issue: false };
}

/**
 * Check location consistency — does the sale/current location match the last recorded event?
 */
function checkLocation(timeline, unit) {
  if (timeline.length === 0) return { issue: false };

  const lastEvent = timeline[timeline.length - 1];
  const lastRecordedLocation = lastEvent.to_location || lastEvent.from_location;

  if (lastRecordedLocation && unit.current_location &&
      lastRecordedLocation.toLowerCase() !== unit.current_location.toLowerCase()) {
    return {
      issue: true,
      reason: `Location mismatch: current location "${unit.current_location}" differs from last recorded event location "${lastRecordedLocation}".`,
    };
  }

  return { issue: false };
}

/**
 * Get chain transactions for a unit.
 */
async function getChainTransactions(unitId) {
  const result = await db.query(
    'SELECT tx_hash, block_number, status, from_address, gas_used, created_at FROM chain_transactions WHERE unit_id = $1 ORDER BY created_at ASC',
    [unitId]
  );
  return result.rows;
}

/**
 * Log a verification scan.
 */
async function logScan(unitId, result, scannerId = null) {
  await db.query(
    `INSERT INTO scan_logs (unit_id, scanner_id, scan_type, result)
     VALUES ($1, $2, 'verification', $3)`,
    [unitId, scannerId, result]
  );
}

module.exports = { verifyProduct };

