// src/controllers/productController.js
// Handles product catalogue and unit registration.

const productService = require('../services/productService');

async function createProduct(req, res, next) {
  try {
    const product = await productService.createProduct({
      ...req.body,
      manufacturerId: req.user.id,
    });
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

async function getProducts(req, res, next) {
  try {
    const products = await productService.getProducts(req.query.manufacturerId);
    res.json({ success: true, data: products });
  } catch (err) {
    next(err);
  }
}

async function getProduct(req, res, next) {
  try {
    const product = await productService.getProductById(req.params.productId);
    res.json({ success: true, data: product });
  } catch (err) {
    next(err);
  }
}

async function registerUnit(req, res, next) {
  try {
    const unit = await productService.registerUnit({
      productId: req.params.productId,
      serialNumber: req.body.serialNumber,
      batchNumber: req.body.batchNumber,
      manufactureDate: req.body.manufactureDate,
      expiryDate: req.body.expiryDate,
      location: req.body.location,
      registeredBy: req.user.id,
    });
    res.status(201).json({
      success: true,
      data: {
        unitId: unit.id,
        qrPayload: unit.qr_payload,
        detailHash: unit.detail_hash,
        onChainTx: unit.on_chain_tx,
        unit,
      },
    });
  } catch (err) {
    next(err);
  }
}

async function getUnitsByProduct(req, res, next) {
  try {
    const units = await productService.getUnitsByProduct(req.params.productId);
    res.json({ success: true, data: units });
  } catch (err) {
    next(err);
  }
}

async function getUnit(req, res, next) {
  try {
    const unit = await productService.getUnitById(req.params.unitId);
    res.json({ success: true, data: unit });
  } catch (err) {
    next(err);
  }
}

module.exports = { createProduct, getProducts, getProduct, registerUnit, getUnitsByProduct, getUnit };

