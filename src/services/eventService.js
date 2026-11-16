// src/services/eventService.js
// Business logic for supply-chain custody, transfer, and status events.
// Aligned with Avika's schema: supply_chain_events, product_unit, chain_transactions.

const db = require('../config/database');
const { AppError } = require('../middleware/errorHandler');
const { computeUnitHash } = require('../utils/hash');
const blockchainService = require('./blockchainService');
const env = require('../config/env');

function normalizeEventType(type) {
  if (!type) return 'TRANSFERRED';
  const upper = type.toUpperCase().replace(/[\s-]/g, '_');
  if (upper === 'CUSTODY_TRANSFER') return 'TRANSFERRED';
  if (upper === 'STATUS_CHANGE') return 'RECEIVED';
  if (upper === 'LOCATION_UPDATE') return 'LOCATION_UPDATE';
  if (upper === 'REGISTERED') return 'REGISTERED';
  if (upper === 'SOLD') return 'SOLD';
  return 'TRANSFERRED';
}

/**
 * Record a supply chain event for a unit.
 */
async function createEvent({ unitId, eventType, fromLocation, toLocation, statusAfter, notes, actorId, sellerId }) {
  // 1. Fetch current unit
  const unitResult = await db.query('SELECT * FROM product_unit WHERE unit_id = $1', [unitId]);
  if (unitResult.rows.length === 0) {
    throw new AppError('Product unit not found', 404);
  }
  const unit = unitResult.rows[0];

  if (unit.is_sold) {
    throw new AppError('Cannot record events on a sold unit', 400);
  }

  const normalizedEvent = normalizeEventType(eventType);
  const statusBefore = unit.current_status;
  const finalStatusAfter = (statusAfter || statusBefore || 'IN_TRANSIT').toUpperCase();
  const finalLocation = toLocation || unit.current_location || 'Transit Hub';

  // 2. Deterministic new hash
  const detailPayload = {
    unitId: unit.unit_id,
    productId: String(unit.product_id),
    serialNumber: unit.serial_number,
    eventType: normalizedEvent,
    fromLocation: fromLocation || unit.current_location || '',
    toLocation: finalLocation,
    statusAfter: finalStatusAfter,
    actorId: actorId ? String(actorId) : 'system',
  };
  const newHash = computeUnitHash(detailPayload);

  // 3. Record on blockchain
  let onChainTx = null;
  try {
    const txResult = await blockchainService.recordEventOnChain(
      unit.data_hash,
      normalizedEvent,
      newHash
    );
    if (txResult) {
      onChainTx = txResult.txHash;
    }
  } catch (err) {
    console.warn('Blockchain event recording skipped/failed:', err.message);
  }

  // 4. Insert into supply_chain_events
  const eventResult = await db.query(
    `INSERT INTO supply_chain_events (unit_id, event_type, actor_user_id, seller_id,
     from_location, location, status_before, status_after, data_hash, note, on_chain_tx)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      unitId,
      normalizedEvent,
      actorId ? parseInt(actorId, 10) : null,
      sellerId ? parseInt(sellerId, 10) : null,
      fromLocation || unit.current_location,
      finalLocation,
      statusBefore,
      finalStatusAfter,
      newHash,
      notes || null,
      onChainTx,
    ]
  );
  const event = eventResult.rows[0];

  // 5. Update unit state in product_unit
  await db.query(
    `UPDATE product_unit
     SET current_location = $1,
         current_status = $2,
         data_hash = $3,
         on_chain_tx = COALESCE($4, on_chain_tx)
     WHERE unit_id = $5`,
    [finalLocation, finalStatusAfter, newHash, onChainTx, unitId]
  );

  // 6. Record transaction if present
  if (onChainTx) {
    try {
      await db.query(
        `INSERT INTO chain_transactions (event_id, unit_id, tx_hash, network, tx_status)
         VALUES ($1, $2, $3, $4, 'CONFIRMED')
         ON CONFLICT (tx_hash) DO NOTHING`,
        [event.event_id, unitId, onChainTx, env.BLOCKCHAIN_NETWORK]
      );
    } catch (e) {
      console.warn('Could not record chain transaction for event:', e.message);
    }
  }

  return {
    id: event.event_id,
    event_id: event.event_id,
    unit_id: event.unit_id,
    event_type: event.event_type,
    from_location: event.from_location,
    to_location: event.location,
    status_before: event.status_before,
    status_after: event.status_after,
    data_hash: event.data_hash,
    notes: event.note,
    on_chain_tx: event.on_chain_tx,
    created_at: event.created_at,
  };
}

/**
 * Mark a unit as sold (retailer-only). Single on-chain call to markSoldOnChain.
 */
async function markUnitSold(unitId, actorId, sellerId = null) {
  const unitResult = await db.query('SELECT * FROM product_unit WHERE unit_id = $1', [unitId]);
  if (unitResult.rows.length === 0) {
    throw new AppError('Product unit not found', 404);
  }
  const unit = unitResult.rows[0];

  if (unit.is_sold) {
    throw new AppError('Unit is already marked as sold', 400);
  }

  // 1. Single on-chain call
  let onChainTx = null;
  try {
    const txResult = await blockchainService.markSoldOnChain(unit.data_hash);
    if (txResult) {
      onChainTx = txResult.txHash;
    }
  } catch (err) {
    console.warn('Blockchain markSold skipped/failed:', err.message);
  }

  // 2. Insert SOLD event
  const eventResult = await db.query(
    `INSERT INTO supply_chain_events (unit_id, event_type, actor_user_id, seller_id,
     from_location, location, status_before, status_after, data_hash, note, on_chain_tx)
     VALUES ($1, 'SOLD', $2, $3, $4, $4, $5, 'SOLD', $6, 'Unit marked as sold at retail point of sale', $7)
     RETURNING *`,
    [
      unitId,
      actorId ? parseInt(actorId, 10) : null,
      sellerId ? parseInt(sellerId, 10) : null,
      unit.current_location,
      unit.current_status,
      unit.data_hash,
      onChainTx,
    ]
  );
  const event = eventResult.rows[0];

  // 3. Update unit as sold
  await db.query(
    `UPDATE product_unit
     SET is_sold = TRUE,
         current_status = 'SOLD',
         on_chain_tx = COALESCE($1, on_chain_tx)
     WHERE unit_id = $2`,
    [onChainTx, unitId]
  );

  // 4. Record transaction
  if (onChainTx) {
    try {
      await db.query(
        `INSERT INTO chain_transactions (event_id, unit_id, tx_hash, network, tx_status)
         VALUES ($1, $2, $3, $4, 'CONFIRMED')
         ON CONFLICT (tx_hash) DO NOTHING`,
        [event.event_id, unitId, onChainTx, env.BLOCKCHAIN_NETWORK]
      );
    } catch (e) {
      console.warn('Could not record chain transaction for sold unit:', e.message);
    }
  }

  return {
    id: event.event_id,
    event_id: event.event_id,
    unit_id: event.unit_id,
    event_type: 'SOLD',
    status_before: event.status_before,
    status_after: 'SOLD',
    on_chain_tx: event.on_chain_tx,
    created_at: event.created_at,
  };
}

/**
 * Get all events for a unit (custody timeline).
 */
async function getEventsByUnit(unitId) {
  const result = await db.query(
    `SELECT e.*, u.full_name as actor_name, s.legal_name as seller_name
     FROM supply_chain_events e
     LEFT JOIN users u ON e.actor_user_id = u.user_id
     LEFT JOIN sellers s ON e.seller_id = s.seller_id
     WHERE e.unit_id = $1
     ORDER BY e.created_at ASC`,
    [unitId]
  );

  return result.rows.map((row) => ({
    id: row.event_id,
    event_id: row.event_id,
    unit_id: row.unit_id,
    event_type: row.event_type,
    from_location: row.from_location,
    to_location: row.location,
    location: row.location,
    status_before: row.status_before,
    status_after: row.status_after,
    data_hash: row.data_hash,
    detail_hash: row.data_hash,
    actor_id: row.actor_user_id,
    actor_name: row.actor_name,
    seller_id: row.seller_id,
    seller_name: row.seller_name,
    notes: row.note,
    note: row.note,
    on_chain_tx: row.on_chain_tx,
    created_at: row.created_at,
  }));
}

module.exports = {
  createEvent,
  markUnitSold,
  getEventsByUnit,
};
