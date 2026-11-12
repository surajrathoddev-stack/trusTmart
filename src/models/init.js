// src/models/init.js
// Database schema initialization.
// WORKING ASSUMPTION: These tables are based on the brief's description of
// Avika's schema. Exact field names may need reconciliation with her actual
// migrations. All assumptions are documented in the completion report.

const db = require('../config/database');

const initSQL = `
-- Users table: covers all five roles
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manufacturer', 'supplier', 'retailer', 'consumer')),
  status        VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'suspended')),
  wallet_address VARCHAR(42),
  full_name     VARCHAR(255),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ProductMaster: catalogue-level items (owned by Avika conceptually)
CREATE TABLE IF NOT EXISTS product_master (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(255) NOT NULL,
  brand         VARCHAR(255),
  category      VARCHAR(100),
  gtin          VARCHAR(14),           -- stored as string to preserve leading zeros
  barcode       VARCHAR(50),           -- stored as string to preserve leading zeros
  description   TEXT,
  manufacturer_id UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ProductUnit: one row per physical unit, distinct from ProductMaster's GTIN/barcode
CREATE TABLE IF NOT EXISTS product_units (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id    UUID NOT NULL REFERENCES product_master(id),
  serial_number VARCHAR(100),
  batch_number  VARCHAR(100),
  manufacture_date DATE,
  expiry_date   DATE,
  detail_hash   VARCHAR(64) NOT NULL,  -- SHA-256 hex hash of unit details
  status        VARCHAR(20) NOT NULL DEFAULT 'registered'
                CHECK (status IN ('registered', 'in_transit', 'delivered', 'sold', 'flagged')),
  current_location VARCHAR(255),
  registered_by UUID NOT NULL REFERENCES users(id),
  on_chain_tx   VARCHAR(66),           -- tx hash of the registration transaction
  qr_payload    TEXT,                  -- base64 QR data URI
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SupplyChainEvents: one row per custody/location/status change
CREATE TABLE IF NOT EXISTS supply_chain_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id       UUID NOT NULL REFERENCES product_units(id),
  event_type    VARCHAR(30) NOT NULL CHECK (event_type IN ('custody_transfer', 'location_update', 'status_change', 'sold')),
  from_location VARCHAR(255),
  to_location   VARCHAR(255),
  status_before VARCHAR(20),
  status_after  VARCHAR(20),
  detail_hash   VARCHAR(64),          -- recalculated hash at the time of the event
  actor_id      UUID NOT NULL REFERENCES users(id),
  actor_role    VARCHAR(20) NOT NULL,
  notes         TEXT,
  on_chain_tx   VARCHAR(66),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ScanLogs: consumer/partner QR scans
CREATE TABLE IF NOT EXISTS scan_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id       UUID NOT NULL REFERENCES product_units(id),
  scanner_id    UUID REFERENCES users(id), -- nullable for anonymous consumer scans
  scan_type     VARCHAR(20) NOT NULL DEFAULT 'verification',
  result        VARCHAR(20),              -- AUTHENTIC / SUSPICIOUS / UNVERIFIED
  ip_address    VARCHAR(45),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ChainTransactions: blockchain transaction receipts
CREATE TABLE IF NOT EXISTS chain_transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tx_hash       VARCHAR(66) NOT NULL UNIQUE,
  block_number  BIGINT,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  unit_id       UUID REFERENCES product_units(id),
  event_id      UUID REFERENCES supply_chain_events(id),
  from_address  VARCHAR(42),
  gas_used      BIGINT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SellerEvidence: consumed from Ruchita's service, cached locally
CREATE TABLE IF NOT EXISTS seller_evidence (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id     UUID NOT NULL REFERENCES users(id),
  evidence_status VARCHAR(20) NOT NULL DEFAULT 'UNKNOWN'
                CHECK (evidence_status IN ('VERIFIED', 'UNKNOWN', 'HIGH_RISK')),
  trust_score   DECIMAL(5,2),
  factor_breakdown JSONB,
  explanation   TEXT,
  source_urls   TEXT[],
  checked_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

async function initDatabase() {
  try {
    await db.query(initSQL);
    console.log('Database tables initialized successfully.');
  } catch (err) {
    console.error('Database initialization failed:', err.message);
    throw err;
  }
}

module.exports = { initDatabase };

