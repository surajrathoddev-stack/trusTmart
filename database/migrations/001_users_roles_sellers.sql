CREATE TABLE roles (
  role_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  role_name TEXT NOT NULL UNIQUE
);

INSERT INTO roles (role_name) VALUES
  ('ADMIN'), ('MANUFACTURER'), ('SUPPLIER'),
  ('RETAILER'), ('CONSUMER')
ON CONFLICT (role_name) DO NOTHING;

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

CREATE TABLE sellers (
  seller_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  legal_name TEXT NOT NULL,
  website TEXT,
  registration_ref TEXT,
  region TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE seller_evidence (
  evidence_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  seller_id BIGINT NOT NULL REFERENCES sellers(seller_id),
  evidence_status TEXT NOT NULL DEFAULT 'UNKNOWN'
    CHECK (evidence_status IN ('VERIFIED','UNKNOWN','HIGH_RISK')),
  source_url TEXT,
  notes TEXT,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);