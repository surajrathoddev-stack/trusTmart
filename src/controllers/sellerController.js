// src/controllers/sellerController.js
// Handles seller profiles, verification requests, and assessment histories.

const sellerService = require('../services/sellerService');
const db = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

/**
 * Register a new seller profile.
 */
async function createSeller(req, res, next) {
  try {
    const { legalName, website, registrationRef, region } = req.body;
    if (!legalName) {
      throw new AppError('legalName is required', 400);
    }

    const result = await db.query(
      `INSERT INTO sellers (legal_name, website, registration_ref, region)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [legalName, website || null, registrationRef || null, region || null]
    );

    const s = result.rows[0];
    res.status(201).json({
      success: true,
      data: {
        sellerId: s.seller_id,
        legalName: s.legal_name,
        website: s.website,
        registrationRef: s.registration_ref,
        region: s.region,
        createdAt: s.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get seller by ID.
 */
async function getSeller(req, res, next) {
  try {
    const { sellerId } = req.params;
    const result = await db.query('SELECT * FROM sellers WHERE seller_id = $1', [parseInt(sellerId, 10)]);
    if (result.rows.length === 0) {
      throw new AppError('Seller not found', 404);
    }
    const s = result.rows[0];
    res.json({
      success: true,
      data: {
        sellerId: s.seller_id,
        legalName: s.legal_name,
        website: s.website,
        registrationRef: s.registration_ref,
        region: s.region,
        createdAt: s.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Trigger verification assessment for a seller.
 */
async function assessSeller(req, res, next) {
  try {
    const { sellerId } = req.params;
    const result = await sellerService.assessSeller(sellerId, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * Get seller trust status.
 */
async function getSellerTrust(req, res, next) {
  try {
    const { sellerId } = req.params;
    const result = await sellerService.getSellerTrust(sellerId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

/**
 * Get assessment history.
 */
async function getSellerAssessments(req, res, next) {
  try {
    const { sellerId } = req.params;
    const history = await sellerService.getSellerAssessmentHistory(sellerId);
    res.json({ success: true, data: history });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createSeller,
  getSeller,
  assessSeller,
  getSellerTrust,
  getSellerAssessments,
};

