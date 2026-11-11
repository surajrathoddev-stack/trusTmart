// src/routes/userRoutes.js

const { Router } = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const { authenticate, authorize } = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = Router();

const createUserSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['admin', 'manufacturer', 'supplier', 'retailer', 'consumer']),
  fullName: z.string().optional(),
  walletAddress: z.string().max(42).optional(),
});

const updateUserSchema = z.object({
  role: z.enum(['admin', 'manufacturer', 'supplier', 'retailer', 'consumer']).optional(),
  status: z.enum(['pending', 'approved', 'suspended']).optional(),
  full_name: z.string().optional(),
  wallet_address: z.string().max(42).optional(),
});

// All user management routes require admin role
router.use(authenticate, authorize('admin'));

router.get('/', userController.getUsers);
router.get('/:id', userController.getUser);
router.post('/', validate(createUserSchema), userController.createUser);
router.patch('/:id', validate(updateUserSchema), userController.updateUser);

module.exports = router;

