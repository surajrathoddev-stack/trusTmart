# trusTmart — Shared Database Schema Contract

**Version:** 1.1.0  
**Status:** Approved for Integration  
**Lead Authors:** Avika (Database Lead), Suraj Rathod (Backend & Blockchain Lead)  
**Target Database:** PostgreSQL 14+

---

## 1. Overview & Conventions

This document establishes the official off-chain relational schema contract for the trusTmart platform. All backend modules (Core API, Seller Verification, Product Catalogue, and Blockchain Orchestration) must adhere to these table definitions, column names, casing, and referential constraints.

### Key Conventions
- **Identifier Strategy:**
  - `BIGINT GENERATED ALWAYS AS IDENTITY` for relational entities (`user_id`, `role_id`, `seller_id`, `product_id`, `event_id`, `tx_id`, `scan_id`, `evidence_id`, `assessment_id`).
  - `UUID` (`gen_random_uuid()`) exclusively for physical `product_unit.unit_id` to ensure globally unique QR-scannable identifiers across independent manufacturing facilities.
- **Table Naming:** Singular for entities (`product_unit`, `product_master`, `scan_logs`), lowercase snake_case throughout.
- **Enums & Constraints:** Stored as `TEXT` with strict SQL `CHECK` constraints for portability and zero-downtime evolution.
- **Timestamps:** `TIMESTAMPTZ` with `DEFAULT NOW()` for all temporal audit fields.

---

## 2. Table Definitions

### 2.1 Access Control & Stakeholder Management

#### `roles`
System authorization roles governing platform actions.
```sql
CREATE TABLE roles (
  role_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  role_name TEXT NOT NULL UNIQUE
);

INSERT INTO roles (role_name) VALUES
  ('ADMIN'), ('MANUFACTURER'), ('SUPPLIER'), ('RETAILER'), ('CONSUMER')
ON CONFLICT (role_name) DO NOTHING;
```

#### `users`
Registered actors across the supply chain.
```sql
CREATE TABLE users (
  user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role_id BIGINT NOT NULL REFERENCES roles(role_id),
  wallet_address TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_users_email ON users(email);
CREATE INDEX ix_users_role ON users(role_id);
```

---

### 2.2 Seller Entity, Evidence & Assessment

#### `sellers`
Business entities registered or assessed within trusTmart.
```sql
CREATE TABLE sellers (
  seller_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  legal_name TEXT NOT NULL,
  website TEXT,
  registration_ref TEXT,
  region TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_sellers_legal_name ON sellers(legal_name);
```

#### `seller_evidence`
Discrete evidence artifacts collected per seller (e.g. MCA check, FSSAI licence, domain review, physical verification). Supports multiple independent records per seller.
```sql
CREATE TABLE seller_evidence (
  evidence_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  seller_id BIGINT NOT NULL REFERENCES sellers(seller_id) ON DELETE CASCADE,
  evidence_type TEXT NOT NULL DEFAULT 'REGISTRY_CHECK',
  evidence_status TEXT NOT NULL DEFAULT 'UNKNOWN'
    CHECK (evidence_status IN ('VERIFIED', 'UNKNOWN', 'HIGH_RISK')),
  source_url TEXT,
  notes TEXT,
  evidence_hash TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_seller_evidence_seller ON seller_evidence(seller_id);
```

#### `seller_verification_assessments`
Historical log of verification assessments produced by the Seller Verification Service (Ruchita's module) and anchored on-chain by the Backend.
```sql
CREATE TABLE seller_verification_assessments (
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
CREATE INDEX ix_assessments_seller ON seller_verification_assessments(seller_id);
```

---

### 2.3 Product Catalogue & Physical Units

#### `product_master`
Canonical catalogue items classified into 6 regulated domains.
```sql
CREATE TABLE product_master (
  product_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  gtin TEXT,
  product_name TEXT NOT NULL,
  brand TEXT NOT NULL,
  domain TEXT NOT NULL CHECK (domain IN (
    'ELECTRONICS', 'APPAREL_FASHION', 'COSMETICS_PERSONAL_CARE',
    'AUTOMOTIVE_INDUSTRIAL', 'PHARMACEUTICALS', 'FMCG_FOOD_BEVERAGE'
  )),
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
CREATE UNIQUE INDEX ux_product_master_gtin ON product_master(gtin) WHERE gtin IS NOT NULL;
CREATE INDEX ix_product_master_domain ON product_master(domain);
```

#### `product_unit`
Individually manufactured physical units with unique serial numbers and cryptographic state digests.
```sql
CREATE TABLE product_unit (
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
CREATE INDEX ix_product_unit_product ON product_unit(product_id);
CREATE INDEX ix_product_unit_data_hash ON product_unit(data_hash);
```

---

### 2.4 Supply Chain Events, Blockchain Transactions & Scans

#### `supply_chain_events`
Custodial and tracking lifecycle transitions.
```sql
CREATE TABLE supply_chain_events (
  event_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES product_unit(unit_id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'REGISTERED', 'TRANSFERRED', 'RECEIVED', 'LOCATION_UPDATE', 'SOLD'
  )),
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
CREATE INDEX ix_events_unit ON supply_chain_events(unit_id);
```

#### `chain_transactions`
Auditable record of on-chain submissions to the permissioned Besu QBFT network.
```sql
CREATE TABLE chain_transactions (
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
    CHECK (tx_status IN ('PENDING', 'CONFIRMED', 'FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_chain_tx_hash ON chain_transactions(tx_hash);
CREATE INDEX ix_chain_tx_unit ON chain_transactions(unit_id);
```

#### `scan_logs`
Verification scan queries recorded from QR codes or direct unit lookups.
```sql
CREATE TABLE scan_logs (
  scan_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  unit_id UUID REFERENCES product_unit(unit_id) ON DELETE CASCADE,
  scanned_by_user_id BIGINT REFERENCES users(user_id),
  result TEXT NOT NULL
    CHECK (result IN ('AUTHENTIC', 'SUSPICIOUS', 'UNVERIFIED')),
  reason TEXT,
  scan_location TEXT,
  ip_address TEXT,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ix_scan_logs_unit ON scan_logs(unit_id);
```

---

## 3. Backward Compatibility & Integration Notes

1. **Role Lookups:** Backend caches `role_id` ↔ `role_name` upon startup to prevent unnecessary joins.
2. **Product Units:** The plural `product_units` in legacy scripts is superseded by `product_unit`. A SQL compatibility view is provided for backward-compatibility during zero-downtime migration:
   ```sql
   CREATE OR REPLACE VIEW product_units AS SELECT * FROM product_unit;
   ```
3. **Data Hash Field:** Canonical field name is `data_hash` (matching Avika's migration 002). Backend maps `detail_hash` to `data_hash` transparently.

