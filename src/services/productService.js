// src/services/productService.js
// Business logic for ProductMaster and ProductUnit management.

const { v4: uuidv4 } = require('uuid');
const db = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { computeUnitHash } = require('../utils/hash');
const { generateQR } = require('../utils/qr');
const blockchainService = require('./blockchainService');

/**
 * Create a catalogue-level product (ProductMaster).
 */
async function createProduct({ name, brand, category, gtin, barcode, description, manufacturerId }) {
  const result = await db.query(
    `INSERT INTO product_master (name, brand, category, gtin, barcode, description, manufacturer_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [name, brand || null, category || null, gtin || null, barcode || null, description || null, manufacturerId]
  );
  return result.rows[0];
}

/**
 * Get all products, optionally filtered by manufacturer.
 */
async function getProducts(manufacturerId) {
  let sql = 'SELECT * FROM product_master';
  const params = [];
  if (manufacturerId) {
    params.push(manufacturerId);
    sql += ' WHERE manufacturer_id = $1';
  }
  sql += ' ORDER BY created_at DESC';
  const result = await db.query(sql, params);
  return result.rows;
}

/**
 * Get a single product by ID.
 */
async function getProductById(id) {
  const result = await db.query('SELECT * FROM product_master WHERE id = $1', [id]);
  if (result.rows.length === 0) {
    throw new AppError('Product not found', 404);
  }
  return result.rows[0];
}

/**
 * Register a physical ProductUnit linked to an existing ProductMaster.
 * Computes SHA-256 hash, anchors on-chain, generates QR code.
 */
async function registerUnit({ productId, serialNumber, batchNumber, manufactureDate, expiryDate, location, registeredBy }) {
  // Verify the product exists
  const product = await getProductById(productId);

  // Build the detail payload for hashing
  const detailPayload = {
    productId,
    productName: product.name,
    serialNumber: serialNumber || '',
    batchNumber: batchNumber || '',
    manufactureDate: manufactureDate || '',
    registeredBy,
    timestamp: new Date().toISOString(),
  };

  const detailHash = computeUnitHash(detailPayload);

  // Register on-chain (will gracefully degrade if blockchain is not configured)
  let onChainTx = null;
  try {
    const txResult = await blockchainService.registerUnitOnChain(detailHash);
    onChainTx = txResult?.txHash || null;
  } catch (err) {
    console.warn('Blockchain registration skipped or failed:', err.message);
    // Continue — off-chain record is still created. Tx can be retried later.
  }

  // Insert the unit
  const result = await db.query(
    `INSERT INTO product_units (product_id, serial_number, batch_number, manufacture_date, expiry_date,
     detail_hash, status, current_location, registered_by, on_chain_tx)
     VALUES ($1, $2, $3, $4, $5, $6, 'registered', $7, $8, $9)
     RETURNING *`,
    [productId, serialNumber || null, batchNumber || null, manufactureDate || null, expiryDate || null,
     detailHash, location || null, registeredBy, onChainTx]
  );

  const unit = result.rows[0];

  // Generate QR code
  const qrPayload = await generateQR(unit.id);
  await db.query('UPDATE product_units SET qr_payload = $1 WHERE id = $2', [qrPayload, unit.id]);
  unit.qr_payload = qrPayload;

  // Record the chain transaction if we got one
  if (onChainTx) {
    await db.query(
      `INSERT INTO chain_transactions (tx_hash, status, unit_id, from_address)
       VALUES ($1, 'pending', $2, $3)`,
      [onChainTx, unit.id, null]
    );
  }

  return unit;
}

/**
 * Get a unit by ID, including its parent product details.
 */
async function getUnitById(unitId) {
  const result = await db.query(
    `SELECT u.*, pm.name as product_name, pm.brand, pm.category, pm.gtin, pm.barcode
     FROM product_units u
     JOIN product_master pm ON u.product_id = pm.id
     WHERE u.id = $1`,
    [unitId]
  );
  if (result.rows.length === 0) {
    throw new AppError('Product unit not found', 404);
  }
  return result.rows[0];
}

/**
 * Get all units for a product.
 */
async function getUnitsByProduct(productId) {
  const result = await db.query(
    'SELECT * FROM product_units WHERE product_id = $1 ORDER BY created_at DESC',
    [productId]
  );
  return result.rows;
}

module.exports = { createProduct, getProducts, getProductById, registerUnit, getUnitById, getUnitsByProduct };

