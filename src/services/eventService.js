// src/services/eventService.js
// Business logic for supply-chain events (custody/location/status changes).

const db = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { computeUnitHash } = require('../utils/hash');
const blockchainService = require('./blockchainService');

/**
 * Create a supply-chain event for a unit.
 * Recalculates hash and records on-chain.
 */
async function createEvent({ unitId, eventType, fromLocation, toLocation, statusAfter, notes, actorId, actorRole }) {
  // Get the current unit
  const unitResult = await db.query('SELECT * FROM product_units WHERE id = $1', [unitId]);
  if (unitResult.rows.length === 0) {
    throw new AppError('Product unit not found', 404);
  }
  const unit = unitResult.rows[0];

  const statusBefore = unit.status;

  // Build updated detail payload for hash recalculation
  const detailPayload = {
    unitId: unit.id,
    productId: unit.product_id,
    serialNumber: unit.serial_number || '',
    batchNumber: unit.batch_number || '',
    eventType,
    toLocation: toLocation || '',
    statusAfter: statusAfter || statusBefore,
    actorId,
    timestamp: new Date().toISOString(),
  };
  const newHash = computeUnitHash(detailPayload);

  // Record on-chain
  let onChainTx = null;
  try {
    const txResult = await blockchainService.recordEventOnChain(unit.detail_hash, eventType, newHash);
    onChainTx = txResult?.txHash || null;
  } catch (err) {
    console.warn('Blockchain event recording skipped or failed:', err.message);
  }

  // Insert the event
  const eventResult = await db.query(
    `INSERT INTO supply_chain_events (unit_id, event_type, from_location, to_location,
     status_before, status_after, detail_hash, actor_id, actor_role, notes, on_chain_tx)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [unitId, eventType, fromLocation || unit.current_location, toLocation || null,
     statusBefore, statusAfter || statusBefore, newHash, actorId, actorRole, notes || null, onChainTx]
  );

  // Update the unit's current state
  const updateFields = [];
  const updateParams = [];

  if (toLocation) {
    updateParams.push(toLocation);
    updateFields.push(`current_location = $${updateParams.length}`);
  }
  if (statusAfter) {
    updateParams.push(statusAfter);
    updateFields.push(`status = $${updateParams.length}`);
  }
  updateParams.push(newHash);
  updateFields.push(`detail_hash = $${updateParams.length}`);

  if (onChainTx) {
    updateParams.push(onChainTx);
    updateFields.push(`on_chain_tx = $${updateParams.length}`);
  }

  updateFields.push('updated_at = NOW()');
  updateParams.push(unitId);

  await db.query(
    `UPDATE product_units SET ${updateFields.join(', ')} WHERE id = $${updateParams.length}`,
    updateParams
  );

  // Record chain transaction
  if (onChainTx) {
    await db.query(
      `INSERT INTO chain_transactions (tx_hash, status, unit_id, event_id)
       VALUES ($1, 'pending', $2, $3)`,
      [onChainTx, unitId, eventResult.rows[0].id]
    );
  }

  return eventResult.rows[0];
}

/**
 * Mark a unit as sold (retailer-only).
 */
async function markUnitSold(unitId, actorId) {
  const unitResult = await db.query('SELECT * FROM product_units WHERE id = $1', [unitId]);
  if (unitResult.rows.length === 0) {
    throw new AppError('Product unit not found', 404);
  }

  const unit = unitResult.rows[0];
  if (unit.status === 'sold') {
    throw new AppError('Unit is already marked as sold', 400);
  }

  // Record on-chain
  let onChainTx = null;
  try {
    const txResult = await blockchainService.markSoldOnChain(unit.detail_hash);
    onChainTx = txResult?.txHash || null;
  } catch (err) {
    console.warn('Blockchain sold marking skipped or failed:', err.message);
  }

  // Create the "sold" event
  const event = await createEvent({
    unitId,
    eventType: 'sold',
    fromLocation: unit.current_location,
    toLocation: unit.current_location,
    statusAfter: 'sold',
    notes: 'Unit marked as sold by retailer',
    actorId,
    actorRole: 'retailer',
  });

  return event;
}

/**
 * Get all events for a unit (custody timeline).
 */
async function getEventsByUnit(unitId) {
  const result = await db.query(
    `SELECT e.*, u.full_name as actor_name
     FROM supply_chain_events e
     LEFT JOIN users u ON e.actor_id = u.id
     WHERE e.unit_id = $1
     ORDER BY e.created_at ASC`,
    [unitId]
  );
  return result.rows;
}

module.exports = { createEvent, markUnitSold, getEventsByUnit };

