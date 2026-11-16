// src/services/productService.js
// Business logic for ProductMaster (catalogue) and ProductUnit (physical units).
// Aligned with Avika's schema (product_master, product_unit).

const db = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { computeUnitHash } = require('../utils/hash');
const { generateQR } = require('../utils/qr');
const blockchainService = require('./blockchainService');
const env = require('../config/env');

const VALID_DOMAINS = [
  'ELECTRONICS',
  'APPAREL_FASHION',
  'COSMETICS_PERSONAL_CARE',
  'AUTOMOTIVE_INDUSTRIAL',
  'PHARMACEUTICALS',
  'FMCG_FOOD_BEVERAGE',
];

/**
 * Create a catalogue-level product in product_master.
 */
async function createProduct({ name, productName, brand, category, domain, gtin, description, manufacturerId }) {
  const finalName = productName || name;
  if (!finalName) {
    throw new AppError('Product name is required', 400);
  }

  // Validate or default domain to a permitted enum
  let finalDomain = (domain || category || 'ELECTRONICS').toUpperCase().replace(/[\s-]/g, '_');
  if (!VALID_DOMAINS.includes(finalDomain)) {
    finalDomain = 'ELECTRONICS';
  }

  const result = await db.query(
    `INSERT INTO product_master (product_name, brand, domain, gtin, description, source_name, source_record_id)
     VALUES ($1, $2, $3, $4, $5, 'MANUFACTURER', $6)
     RETURNING *`,
    [finalName, brand || 'Generic', finalDomain, gtin || null, description || null, manufacturerId ? String(manufacturerId) : '1']
  );

  const row = result.rows[0];
  return {
    id: row.product_id,
    product_id: row.product_id,
    name: row.product_name,
    product_name: row.product_name,
    brand: row.brand,
    domain: row.domain,
    category: row.domain,
    gtin: row.gtin,
    description: row.description,
    created_at: row.created_at,
  };
}

/**
 * Get all products.
 */
async function getProducts() {
  const result = await db.query('SELECT * FROM product_master ORDER BY created_at DESC');
  return result.rows.map((row) => ({
    id: row.product_id,
    product_id: row.product_id,
    name: row.product_name,
    product_name: row.product_name,
    brand: row.brand,
    domain: row.domain,
    category: row.domain,
    gtin: row.gtin,
    description: row.description,
    created_at: row.created_at,
  }));
}

/**
 * Get single product by ID.
 */
async function getProductById(id) {
  const numericId = parseInt(id, 10);
  const result = await db.query('SELECT * FROM product_master WHERE product_id = $1', [numericId]);
  if (result.rows.length === 0) {
    throw new AppError('Product not found in catalogue', 404);
  }
  const row = result.rows[0];
  return {
    id: row.product_id,
    product_id: row.product_id,
    name: row.product_name,
    product_name: row.product_name,
    brand: row.brand,
    domain: row.domain,
    category: row.domain,
    gtin: row.gtin,
    description: row.description,
    created_at: row.created_at,
  };
}

/**
 * Register a physical unit linked to a ProductMaster record.
 * Computes deterministic SHA-256 hash, anchors on-chain, generates QR code.
 */
async function registerUnit({ productId, serialNumber, batchNumber, location, registeredBy }) {
  const product = await getProductById(productId);

  const cleanSerial = serialNumber || `SN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

  // Deterministic fingerprint
  const detailPayload = {
    productId: String(product.product_id),
    productName: product.product_name,
    brand: product.brand,
    serialNumber: cleanSerial,
    batchNumber: batchNumber || 'BATCH-001',
    manufacturerUserId: String(registeredBy),
  };
  const dataHash = computeUnitHash(detailPayload);

  // Anchor on-chain
  let onChainTx = null;
  try {
    const txResult = await blockchainService.registerUnitOnChain(dataHash);
    if (txResult) {
      onChainTx = txResult.txHash;
    }
  } catch (err) {
    console.warn('Blockchain registration skipped/failed:', err.message);
  }

  // Insert physical unit into product_unit
  const result = await db.query(
    `INSERT INTO product_unit (product_id, serial_number, batch_number, manufacturer_user_id,
     data_hash, current_status, current_location, is_sold, on_chain_tx)
     VALUES ($1, $2, $3, $4, $5, 'REGISTERED', $6, FALSE, $7)
     RETURNING *`,
    [
      product.product_id,
      cleanSerial,
      batchNumber || null,
      registeredBy ? parseInt(registeredBy, 10) : null,
      dataHash,
      location || 'Manufacturing Facility',
      onChainTx,
    ]
  );

  const unit = result.rows[0];

  // Generate QR code data URI
  const qrPayload = await generateQR(unit.unit_id);
  await db.query('UPDATE product_unit SET qr_payload = $1 WHERE unit_id = $2', [qrPayload, unit.unit_id]);
  unit.qr_payload = qrPayload;

  // Insert chain transaction record if available
  if (onChainTx) {
    try {
      await db.query(
        `INSERT INTO chain_transactions (unit_id, tx_hash, network, tx_status)
         VALUES ($1, $2, $3, 'CONFIRMED')
         ON CONFLICT (tx_hash) DO NOTHING`,
        [unit.unit_id, onChainTx, env.BLOCKCHAIN_NETWORK]
      );
    } catch (e) {
      console.warn('Could not record chain_transaction:', e.message);
    }
  }

  return {
    id: unit.unit_id,
    unit_id: unit.unit_id,
    product_id: unit.product_id,
    serial_number: unit.serial_number,
    batch_number: unit.batch_number,
    detail_hash: unit.data_hash,
    data_hash: unit.data_hash,
    status: unit.current_status,
    current_status: unit.current_status,
    current_location: unit.current_location,
    is_sold: unit.is_sold,
    qr_payload: unit.qr_payload,
    on_chain_tx: unit.on_chain_tx,
    created_at: unit.created_at,
  };
}

/**
 * Get physical unit by UUID.
 */
async function getUnitById(unitId) {
  const result = await db.query(
    `SELECT u.*, pm.product_name, pm.brand, pm.domain, pm.gtin, pm.description
     FROM product_unit u
     JOIN product_master pm ON u.product_id = pm.product_id
     WHERE u.unit_id = $1`,
    [unitId]
  );

  if (result.rows.length === 0) {
    throw new AppError('Product unit not found', 404);
  }

  const row = result.rows[0];
  return {
    id: row.unit_id,
    unit_id: row.unit_id,
    product_id: row.product_id,
    product_name: row.product_name,
    productName: row.product_name,
    brand: row.brand,
    domain: row.domain,
    category: row.domain,
    gtin: row.gtin,
    serial_number: row.serial_number,
    serialNumber: row.serial_number,
    batch_number: row.batch_number,
    batchNumber: row.batch_number,
    detail_hash: row.data_hash,
    data_hash: row.data_hash,
    status: row.current_status,
    current_status: row.current_status,
    current_location: row.current_location,
    is_sold: row.is_sold,
    on_chain_tx: row.on_chain_tx,
    qr_payload: row.qr_payload,
    registered_by: row.manufacturer_user_id,
    created_at: row.created_at,
  };
}

/**
 * Get all units under a product.
 */
async function getUnitsByProduct(productId) {
  const numericId = parseInt(productId, 10);
  const result = await db.query(
    'SELECT * FROM product_unit WHERE product_id = $1 ORDER BY created_at DESC',
    [numericId]
  );
  return result.rows.map((row) => ({
    id: row.unit_id,
    unit_id: row.unit_id,
    product_id: row.product_id,
    serial_number: row.serial_number,
    batch_number: row.batch_number,
    detail_hash: row.data_hash,
    data_hash: row.data_hash,
    status: row.current_status,
    current_status: row.current_status,
    current_location: row.current_location,
    is_sold: row.is_sold,
    on_chain_tx: row.on_chain_tx,
    created_at: row.created_at,
  }));
}

module.exports = {
  createProduct,
  getProducts,
  getProductById,
  registerUnit,
  getUnitById,
  getUnitsByProduct,
};
