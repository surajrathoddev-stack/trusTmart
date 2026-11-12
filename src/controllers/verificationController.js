// src/controllers/verificationController.js
// Consumer-facing product verification.

const verificationService = require('../services/verificationService');

async function verifyProduct(req, res, next) {
  try {
    const { unitId } = req.params;
    const result = await verificationService.verifyProduct(unitId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { verifyProduct };

