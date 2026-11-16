// src/models/init.js
// Aligned with docs/SCHEMA_CONTRACT.md and Avika's migrations:
// - 001_users_roles_sellers.sql
// - 002_products_units_events.sql
// Provides tables, constraints, indices, and compatibility views.

const db = require('../config/database');

const initSQL = `
-- 1. Roles table
CREATE TABLE IF NOT EXISTS roles (
  role_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  role_name TEXT NOT NULL UNIQUE
);

INSERT INTO roles (role_name) VALUES
  ('ADMIN'), ('MANUFACTURER'), ('SUPPLIER'),
  ('RETAILER'), ('CONSUMER')
ON CONFLICT (role_name) DO NOTHING;

-- 2. Users table (Avika schema: user_id BIGINT, role_id BIGINT)
CREATE TABLE IF NOT EXISTS users (
  user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role_id BIGINT NOT NULL REFERENCES roles(role_id),
  wallet_address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);
CREATE INDEX IF NOT EXISTS ix_users_role ON users(role_id);

-- 3. Sellers table (Avika schema: seller_id BIGINT)
CREATE TABLE IF NOT EXISTS sellers (
  seller_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  legal_name TEXT NOT NULL,
  website TEXT,
  registration_ref TEXT,
  region TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_sellers_legal_name ON sellers(legal_name);

-- 4. Seller Evidence table (Multiple evidence records per seller)
CREATE TABLE IF NOT EXISTS seller_evidence (
  evidence_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  seller_id BIGINT NOT NULL REFERENCES sellers(seller_id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL DEFAULT 'REGISTRY_CHECK',
  evidence_status TEXT NOT NULL DEFAULT 'UNKNOWN'
    CHECK (evidence_status IN ('VERIFIED','UNKNOWN','HIGH_RISK')),
  source_url TEXT,
  notes TEXT,
  evidence_hash TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_seller_evidence_seller ON seller_evidence(seller_id);

-- 5. Seller Verification Assessments (Separate assessment history from evidence)
CREATE TABLE IF NOT EXISTS seller_verification_assessments (
  assessment_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  seller_id BIGINT NOT NULL REFERENCES sellers(seller_id) ON DELETE CASCADE,
  verification_status TEXT NOT NULL
    CHECK (verification_status IN ('AUTHENTIC', 'SUSPICIOUS', 'UNVERIFIED')),
  trust_score DECIMAL(5,2),
  explanation TEXT,
  evidence_hash TEXT NOT NULL,
  on_chain_tx TEXT,
  assessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_assessments_seller ON seller_verification_assessments(seller_id);

-- 6. Product Master (Catalogue items across 6 regulated domains)
CREATE TABLE IF NOT EXISTS product_master (
  product_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  gtin TEXT,
  product_name TEXT NOT NULL,
  brand TEXT NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN (
    'ELECTRONICS','APPAREL_FASHION','COSMETICS_PERSONAL_CARE',
    'AUTOMOTIVE_INDUSTRIAL','PHARMACEUTICALS','FMCG_FOOD_BEVERAGE')),
  description TEXT,
  model_part_number TEXT,
  regulatory_id TEXT,
  source_name TEXT NOT NULL DEFAULT 'MANUFACTURER',
  source_url TEXT,
  source_record_id TEXT,
  collected_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_product_master_gtin
  ON product_master (gtin) WHERE gtin IS NOT NULL;
CREATE INDEX IF NOT EXISTS ix_product_master_domain ON product_master (domain);

-- 7. Product Unit (Physical instance with unique UUID)
CREATE TABLE IF NOT EXISTS product_unit (
  unit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id BIGINT NOT NULL REFERENCES product_master(product_id),
  serial_number TEXT NOT NULL,
  batch_number TEXT,
  manufacturer_user_id BIGINT REFERENCES users(user_id),
  data_hash TEXT NOT NULL,
  current_status TEXT NOT NULL DEFAULT 'REGISTERED'
    CHECK (current_status IN ('REGISTERED', 'IN_TRANSIT', 'DELIVERED', 'SOLD', 'FLAGGED')),
  current_location TEXT,
  is_sold BOOLEAN NOT NULL DEFAULT FALSE,
  on_chain_tx TEXT,
  qr_payload TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, serial_number)
);
CREATE INDEX IF NOT EXISTS ix_product_unit_product ON product_unit(product_id);
CREATE INDEX IF NOT EXISTS ix_product_unit_data_hash ON product_unit(data_hash);

-- 8. Supply Chain Events
CREATE TABLE IF NOT EXISTS supply_chain_events (
  event_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES product_unit(unit_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'REGISTERED','TRANSFERRED','RECEIVED','LOCATION_UPDATE','SOLD')),
  actor_user_id BIGINT REFERENCES users(user_id),
  seller_id BIGINT REFERENCES sellers(seller_id),
  from_location TEXT,
  location TEXT,
  status_before TEXT,
  status_after TEXT,
  data_hash TEXT,
  note TEXT,
  on_chain_tx TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_events_unit ON supply_chain_events (unit_id);

-- 9. Chain Transactions
CREATE TABLE IF NOT EXISTS chain_transactions (
  tx_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id BIGINT REFERENCES supply_chain_events(event_id),
  assessment_id BIGINT REFERENCES seller_verification_assessments(assessment_id),
  unit_id UUID REFERENCES product_unit(unit_id),
  tx_hash TEXT NOT NULL UNIQUE,
  network TEXT NOT NULL DEFAULT 'besu-qbft',
  block_number BIGINT,
  gas_used BIGINT,
  from_address TEXT,
  tx_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (tx_status IN ('PENDING','CONFIRMED','FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_chain_tx_hash ON chain_transactions(tx_hash);
CREATE INDEX IF NOT EXISTS ix_chain_tx_unit ON chain_transactions(unit_id);

-- 10. Scan Logs
CREATE TABLE IF NOT EXISTS scan_logs (
  scan_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  unit_id UUID REFERENCES product_unit(unit_id) ON DELETE CASCADE,
  scanned_by_user_id BIGINT REFERENCES users(user_id),
  result TEXT NOT NULL
    CHECK (result IN ('AUTHENTIC','SUSPICIOUS','UNVERIFIED')),
  reason TEXT,
  scan_location TEXT,
  ip_address TEXT,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS ix_scan_logs_unit ON scan_logs (unit_id);

-- 11. Backward compatibility view
CREATE OR REPLACE VIEW product_units AS
  SELECT
    unit_id AS id,
    product_id,
    serial_number,
    batch_number,
    manufacturer_user_id AS registered_by,
    data_hash AS detail_hash,
    current_status AS status,
    current_location,
    is_sold,
    on_chain_tx,
    qr_payload,
    created_at,
    created_at AS updated_at
  FROM product_unit;
`;

async function initDatabase() {
  try {
    await db.query(initSQL);
    console.log('Database tables aligned with SCHEMA_CONTRACT.md initialized successfully.');
  } catch (err) {
    console.error('Database initialization warning/error:', err.message);
    if (process.env.NODE_ENV !== 'test') {
      throw err;
    }
  }
}

module.exports = { initDatabase };
