// src/routes/authRoutes.js

const { Router } = require('express');
const { z } = require('zod');
const { validate } = require('../middleware/validate');
const authController = require('../controllers/authController');

const router = Router();

const loginSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(1, 'Password required'),
});

const registerSchema = z.object({
  email: z.string().email('Valid email required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  fullName: z.string().min(1, 'Full name required').optional(),
});

router.post('/login', validate(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.post('/register', validate(registerSchema), authController.registerConsumer);

module.exports = router;

