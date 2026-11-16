// src/routes/sellerRoutes.js
// Routes for seller management and verification assessments.

const { Router } = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const sellerController = require('../controllers/sellerController');

const router = Router();

const createSellerSchema = z.object({
  legalName: z.string().min(1, 'Legal name is required'),
  website: z.string().url().optional().or(z.literal('')),
  registrationRef: z.string().optional(),
  region: z.string().optional(),
});

// Public read of seller trust
router.get('/:sellerId/trust', sellerController.getSellerTrust);
router.get('/:sellerId/assessments', sellerController.getSellerAssessments);
router.get('/:sellerId', sellerController.getSeller);

// Admin-only or privileged actions
router.post('/', authenticate, authorize('admin', 'manufacturer'), validate(createSellerSchema), sellerController.createSeller);
router.post('/:sellerId/assess', authenticate, authorize('admin'), sellerController.assessSeller);

module.exports = router;

