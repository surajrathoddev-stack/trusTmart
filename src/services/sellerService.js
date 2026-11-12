// src/services/sellerService.js
// Client for Ruchita's seller-verification / trust-score service.
// WORKING ASSUMPTION: API shapes are based on Section 9 of the brief.
// Actual endpoints/fields must be confirmed with Ruchita.

const axios = require('axios');
const env = require('../config/env');
const db = require('../config/database');

const TIMEOUT_MS = 5000; // 5-second timeout for seller service calls

const client = axios.create({
  baseURL: env.SELLER_SERVICE_BASE_URL,
  timeout: TIMEOUT_MS,
  headers: { 'Content-Type': 'application/json' },
});

/**
 * Default response when the seller service is unavailable or returns an error.
 * Per brief: fall back to UNKNOWN rather than failing the whole verification.
 */
function unknownFallback(sellerId) {
  return {
    sellerId,
    evidenceStatus: 'UNKNOWN',
    score: null,
    factorBreakdown: null,
    explanation: 'Seller verification service unavailable — defaulting to UNKNOWN.',
    sourceUrls: [],
    checkedAt: new Date().toISOString(),
  };
}

/**
 * Assess a seller — POST /api/sellers/assess
 */
async function assessSeller(sellerId, sellerData = {}) {
  try {
    const response = await client.post('/api/sellers/assess', {
      sellerId,
      ...sellerData,
    });
    const data = response.data;

    // Cache the result locally
    await cacheTrustData(sellerId, data);

    return {
      sellerId: data.sellerId || sellerId,
      evidenceStatus: data.evidenceStatus || data.evidence_status || 'UNKNOWN',
      score: data.score ?? data.trust_score ?? null,
      factorBreakdown: data.factorBreakdown || data.factor_breakdown || null,
      explanation: data.explanation || null,
      sourceUrls: data.sourceUrls || data.source_urls || [],
      checkedAt: data.checkedAt || data.checked_at || new Date().toISOString(),
    };
  } catch (err) {
    console.warn(`Seller assessment failed for ${sellerId}:`, err.message);
    return unknownFallback(sellerId);
  }
}

/**
 * Get trust info for a seller — GET /api/sellers/:sellerId/trust
 */
async function getSellerTrust(sellerId) {
  try {
    const response = await client.get(`/api/sellers/${sellerId}/trust`);
    const data = response.data;

    // Cache the result
    await cacheTrustData(sellerId, data);

    return {
      sellerId: data.sellerId || sellerId,
      evidenceStatus: data.evidenceStatus || data.evidence_status || 'UNKNOWN',
      score: data.score ?? data.trust_score ?? null,
      factorBreakdown: data.factorBreakdown || data.factor_breakdown || null,
      explanation: data.explanation || null,
      sourceUrls: data.sourceUrls || data.source_urls || [],
      checkedAt: data.checkedAt || data.checked_at || new Date().toISOString(),
    };
  } catch (err) {
    console.warn(`Seller trust lookup failed for ${sellerId}:`, err.message);

    // Try local cache before falling back to UNKNOWN
    const cached = await getCachedTrustData(sellerId);
    if (cached) {
      return cached;
    }

    return unknownFallback(sellerId);
  }
}

/**
 * Cache seller trust data in the local seller_evidence table.
 */
async function cacheTrustData(sellerId, data) {
  try {
    await db.query(
      `INSERT INTO seller_evidence (seller_id, evidence_status, trust_score, factor_breakdown, explanation, source_urls, checked_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (seller_id) DO UPDATE SET
         evidence_status = EXCLUDED.evidence_status,
         trust_score = EXCLUDED.trust_score,
         factor_breakdown = EXCLUDED.factor_breakdown,
         explanation = EXCLUDED.explanation,
         source_urls = EXCLUDED.source_urls,
         checked_at = EXCLUDED.checked_at`,
      [
        sellerId,
        data.evidenceStatus || data.evidence_status || 'UNKNOWN',
        data.score ?? data.trust_score ?? null,
        JSON.stringify(data.factorBreakdown || data.factor_breakdown || null),
        data.explanation || null,
        data.sourceUrls || data.source_urls || [],
        data.checkedAt || data.checked_at || new Date().toISOString(),
      ]
    );
  } catch (err) {
    // Non-fatal — caching failure should not block verification
    console.warn('Failed to cache seller trust data:', err.message);
  }
}

/**
 * Retrieve cached trust data from the local database.
 */
async function getCachedTrustData(sellerId) {
  try {
    const result = await db.query(
      'SELECT * FROM seller_evidence WHERE seller_id = $1 ORDER BY checked_at DESC LIMIT 1',
      [sellerId]
    );
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      sellerId: row.seller_id,
      evidenceStatus: row.evidence_status,
      score: row.trust_score,
      factorBreakdown: row.factor_breakdown,
      explanation: row.explanation,
      sourceUrls: row.source_urls,
      checkedAt: row.checked_at,
    };
  } catch {
    return null;
  }
}

module.exports = { assessSeller, getSellerTrust, unknownFallback };

