// src/routes/verifyRoutes.js
// Public consumer verification endpoint — does not require auth for basic check.

const { Router } = require('express');
const verificationController = require('../controllers/verificationController');

const router = Router();

// GET with unitId param
router.get('/:unitId', verificationController.verifyProduct);

// POST with unitId in params or in request body
router.post('/:unitId', verificationController.verifyProduct);
router.post('/', verificationController.verifyProduct);

module.exports = router;
