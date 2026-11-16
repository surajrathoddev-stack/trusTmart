// src/services/sellerService.js
// Client for Ruchita's seller-verification / trust-score service.
// Coordinates external assessment, PostgreSQL persistence (seller_evidence + seller_verification_assessments),
// and on-chain anchoring of cryptographic evidence hashes.

const axios = require('axios');
const env = require('../config/env');
const db = require('../config/database');
const { computeUnitHash } = require('../utils/hash');
const blockchainService = require('./blockchainService');

const TIMEOUT_MS = 5000;

const client = axios.create({
  baseURL: env.SELLER_SERVICE_BASE_URL,
  timeout: TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Standard fallback when external seller service is unreachable.
 * Never upgrade missing signals to authentic.
 */
function unknownFallback(sellerId, reason = 'Seller verification service unavailable — defaulting to UNKNOWN.') {
  return {
    sellerId: parseInt(sellerId, 10),
    evidenceStatus: 'UNKNOWN',
    verificationStatus: 'UNVERIFIED',
    score: null,
    explanation: reason,
    evidenceHash: null,
    onChainTx: null,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Check if the external seller verification service is alive.
 */
async function checkSellerServiceHealth() {
  try {
    const res = await client.get('/health', { timeout: 2000 });
    return res.status === 200 && res.data ? 'available' : 'degraded';
  } catch {
    return 'unavailable';
  }
}

/**
 * Trigger assessment of a seller:
 * 1. Query seller info from database.
 * 2. Call Ruchita's FastAPI endpoint (POST /api/sellers/assess).
 * 3. Normalize response and compute deterministic evidence hash.
 * 4. Save evidence row in seller_evidence and assessment in seller_verification_assessments.
 * 5. Anchor assessment on-chain via smart contract.
 * 6. Record transaction in chain_transactions.
 */
async function assessSeller(sellerId, inputOverride = {}) {
  const numericId = parseInt(sellerId, 10);

  // 1. Fetch seller profile
  let seller = null;
  try {
    const sellerRes = await db.query(
      'SELECT seller_id, legal_name, website, registration_ref, region FROM sellers WHERE seller_id = $1',
      [numericId]
    );
    if (sellerRes.rows.length > 0) {
      seller = sellerRes.rows[0];
    }
  } catch (err) {
    console.warn('Could not read seller from database:', err.message);
  }

  const legalName = inputOverride.legalName || (seller ? seller.legal_name : `Seller-${numericId}`);
  const website = inputOverride.website || (seller ? seller.website : null);
  const registrationNumber = inputOverride.registrationNumber || (seller ? seller.registration_ref : null);
  const address = inputOverride.address || (seller ? seller.region : null);

  // 2. Call Ruchita's service
  let apiResponse = null;
  try {
    const response = await client.post('/api/sellers/assess', {
      legalName,
      website: website || undefined,
      registrationNumber: registrationNumber || undefined,
      address: address || undefined,
    });
    apiResponse = response.data;
  } catch (err) {
    console.warn(`Seller service call failed for seller ${numericId}:`, err.message);
    return unknownFallback(numericId, `External assessment unavailable: ${err.message}`);
  }

  // 3. Normalize response
  const rawStatus = apiResponse.evidenceStatus || apiResponse.evidence_status || 'UNKNOWN';
  let verificationStatus = 'UNVERIFIED';
  if (rawStatus === 'VERIFIED') verificationStatus = 'AUTHENTIC';
  else if (rawStatus === 'HIGH_RISK') verificationStatus = 'SUSPICIOUS';

  const score = apiResponse.score !== undefined ? apiResponse.score : null;
  const explanation = apiResponse.explanation || 'Assessment completed by seller-verification service.';

  // 4. Compute deterministic evidence hash
  const hashPayload = {
    sellerId: numericId,
    legalName,
    registrationNumber: registrationNumber || '',
    evidenceStatus: rawStatus,
    score: score !== null ? score : 'none',
    explanation,
  };
  const evidenceHash = computeUnitHash(hashPayload);

  // 5. Anchor on-chain
  let onChainTx = null;
  try {
    const txResult = await blockchainService.recordSellerVerificationOnChain(
      numericId,
      evidenceHash,
      verificationStatus
    );
    if (txResult) {
      onChainTx = txResult.txHash;
    }
  } catch (err) {
    console.warn('On-chain seller verification anchoring failed:', err.message);
  }

  // 6. Persist to PostgreSQL
  let assessmentId = null;
  try {
    // Record evidence
    await db.query(
      `INSERT INTO seller_evidence (seller_id, evidence_type, evidence_status, source_url, notes, evidence_hash, checked_at)
       VALUES ($1, 'REGISTRY_CHECK', $2, $3, $4, $5, NOW())`,
      [numericId, rawStatus, website || null, explanation, evidenceHash]
    );

    // Record assessment
    const assessRes = await db.query(
      `INSERT INTO seller_verification_assessments (seller_id, verification_status, trust_score, explanation, evidence_hash, on_chain_tx, assessed_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING assessment_id`,
      [numericId, verificationStatus, score, explanation, evidenceHash, onChainTx]
    );
    assessmentId = assessRes.rows[0].assessment_id;

    // Record chain transaction if transaction succeeded
    if (onChainTx) {
      await db.query(
        `INSERT INTO chain_transactions (assessment_id, tx_hash, network, tx_status)
         VALUES ($1, $2, $3, 'CONFIRMED')
         ON CONFLICT (tx_hash) DO NOTHING`,
        [assessmentId, onChainTx, env.BLOCKCHAIN_NETWORK]
      );
    }
  } catch (dbErr) {
    console.warn('Failed to persist seller assessment to DB:', dbErr.message);
  }

  return {
    sellerId: numericId,
    legalName,
    evidenceStatus: rawStatus,
    verificationStatus,
    score,
    explanation,
    evidenceHash,
    onChainTx,
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Retrieve trust information for a seller:
 * Checks database for latest assessment; falls back to live assessment or safe UNKNOWN.
 */
async function getSellerTrust(sellerId) {
  const numericId = parseInt(sellerId, 10);
  try {
    const res = await db.query(
      `SELECT * FROM seller_verification_assessments
       WHERE seller_id = $1
       ORDER BY assessed_at DESC LIMIT 1`,
      [numericId]
    );

    if (res.rows.length > 0) {
      const row = res.rows[0];
      return {
        sellerId: numericId,
        verificationStatus: row.verification_status,
        evidenceStatus: row.verification_status === 'AUTHENTIC' ? 'VERIFIED' : (row.verification_status === 'SUSPICIOUS' ? 'HIGH_RISK' : 'UNKNOWN'),
        score: row.trust_score,
        explanation: row.explanation,
        evidenceHash: row.evidence_hash,
        onChainTx: row.on_chain_tx,
        checkedAt: row.assessed_at,
      };
    }

    // No stored assessment yet — trigger assessment
    return await assessSeller(numericId);
  } catch (err) {
    console.warn(`Could not fetch trust data for seller ${numericId}:`, err.message);
    return unknownFallback(numericId);
  }
}

/**
 * Retrieve all historical assessments for a seller.
 */
async function getSellerAssessmentHistory(sellerId) {
  const numericId = parseInt(sellerId, 10);
  try {
    const res = await db.query(
      `SELECT * FROM seller_verification_assessments
       WHERE seller_id = $1
       ORDER BY assessed_at DESC`,
      [numericId]
    );
    return res.rows;
  } catch (err) {
    console.warn(`Could not fetch assessment history for seller ${numericId}:`, err.message);
    return [];
  }
}

module.exports = {
  assessSeller,
  getSellerTrust,
  getSellerAssessmentHistory,
  checkSellerServiceHealth,
  unknownFallback,
};
