// src/utils/hash.js
// SHA-256 hashing utilities for product/unit fingerprinting.

const crypto = require('crypto');

/**
 * Compute a SHA-256 hex digest of a product-unit detail payload.
 * Keys are sorted for deterministic hashing regardless of object key order.
 *
 * @param {Object} details  The unit detail fields to hash.
 * @returns {string}  Lowercase hex SHA-256 hash.
 */
function computeUnitHash(details) {
  const sorted = Object.keys(details)
    .sort()
    .reduce((acc, key) => {
      acc[key] = details[key];
      return acc;
    }, {});
  const canonical = JSON.stringify(sorted);
  return crypto.createHash('sha256').update(canonical).digest('hex');
}

module.exports = { computeUnitHash };

