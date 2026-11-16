// src/controllers/verificationController.js
// Consumer-facing product verification controller.

const verificationService = require('../services/verificationService');

async function verifyProduct(req, res, next) {
  try {
    const unitId = req.params.unitId || req.body.unitId;
    const context = {
      scanLocation: req.query.location || req.body.location || null,
      scannerId: req.user ? req.user.id : null,
      ipAddress: req.ip || req.socket?.remoteAddress,
    };
    const result = await verificationService.verifyProduct(unitId, context);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

module.exports = { verifyProduct };
