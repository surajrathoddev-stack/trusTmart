CREATE TABLE product_master (
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
  source_name TEXT NOT NULL,
  source_url TEXT,
  source_record_id TEXT,
  collected_at DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (source_url IS NOT NULL OR source_record_id IS NOT NULL)
);

CREATE UNIQUE INDEX ux_product_master_gtin
  ON product_master (gtin) WHERE gtin IS NOT NULL;
CREATE INDEX ix_product_master_domain ON product_master (domain);

CREATE TABLE product_unit (
  unit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id BIGINT NOT NULL REFERENCES product_master(product_id),
  serial_number TEXT NOT NULL,
  batch_number TEXT,
  manufacturer_user_id BIGINT REFERENCES users(user_id),
  data_hash TEXT NOT NULL,
  current_status TEXT NOT NULL DEFAULT 'REGISTERED',
  current_location TEXT,
  is_sold BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, serial_number)
);

CREATE TABLE supply_chain_events (
  event_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES product_unit(unit_id),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'REGISTERED','TRANSFERRED','RECEIVED','LOCATION_UPDATE','SOLD')),
  actor_user_id BIGINT REFERENCES users(user_id),
  seller_id BIGINT REFERENCES sellers(seller_id),
  location TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_events_unit ON supply_chain_events (unit_id);

CREATE TABLE chain_transactions (
  tx_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id BIGINT NOT NULL REFERENCES supply_chain_events(event_id),
  tx_hash TEXT NOT NULL UNIQUE,
  network TEXT NOT NULL DEFAULT 'sepolia',
  block_number BIGINT,
  tx_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (tx_status IN ('PENDING','CONFIRMED','FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE scan_logs (
  scan_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  unit_id UUID REFERENCES product_unit(unit_id),
  scanned_by_user_id BIGINT REFERENCES users(user_id),
  result TEXT NOT NULL
    CHECK (result IN ('AUTHENTIC','SUSPICIOUS','UNVERIFIED')),
  reason TEXT,
  scan_location TEXT,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_scan_logs_unit ON scan_logs (unit_id);