// src/routes/productRoutes.js

const { Router } = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const productController = require('../controllers/productController');

const router = Router();

const createProductSchema = z.object({
  name: z.string().min(1, 'Product name required'),
  brand: z.string().optional(),
  category: z.string().optional(),
  gtin: z.string().max(14).optional(),
  barcode: z.string().max(50).optional(),
  description: z.string().optional(),
});

const registerUnitSchema = z.object({
  serialNumber: z.string().optional(),
  batchNumber: z.string().optional(),
  manufactureDate: z.string().optional(),
  expiryDate: z.string().optional(),
  location: z.string().optional(),
});

// Product catalogue — manufacturers can create, anyone authenticated can view
router.get('/', authenticate, productController.getProducts);
router.get('/:productId', authenticate, productController.getProduct);
router.post('/', authenticate, authorize('manufacturer', 'admin'), validate(createProductSchema), productController.createProduct);

// Unit management — manufacturer registers units under a product
router.post('/:productId/units', authenticate, authorize('manufacturer'), validate(registerUnitSchema), productController.registerUnit);
router.get('/:productId/units', authenticate, productController.getUnitsByProduct);

module.exports = router;

