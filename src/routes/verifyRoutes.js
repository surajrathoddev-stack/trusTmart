// src/routes/verifyRoutes.js

const { Router } = require('express');
const verificationController = require('../controllers/verificationController');

const router = Router();

// Consumer verification — no authentication required for basic check
router.get('/:unitId', verificationController.verifyProduct);

module.exports = router;

