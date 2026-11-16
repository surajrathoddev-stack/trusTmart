# trusTmart — Hybrid Architecture Specification

## 1. Executive Summary

trusTmart implements a **hybrid permissioned architecture** combining off-chain relational storage (PostgreSQL) with a private consortium blockchain (Hyperledger Besu running QBFT consensus). This model addresses the dual requirements of high-throughput operational data management and tamper-evident, decentralized verification without exposing confidential business records or personally identifiable information (PII) to a shared ledger.

```
+-------------------------------------------------------------------------+
|                           CLIENT TIER                                   |
|   Consumer QR Scanner   |   Manufacturer App   |   Metamask Web3 Wallet |
+------------------------------------+------------------------------------+
                                     |
                                     v
+------------------------------------+------------------------------------+
|                      CORE BACKEND ORCHESTRATOR                          |
|   Node.js / Express API | JWT & Role Middleware | Hashing & Verification |
+------------------+-------------------+--------------------+-------------+
                   |                   |                    |
                   v                   v                    v
+------------------+----+    +---------+--------+   +-------+-------------+
| OFF-CHAIN POSTGRESQL  |    | SELLER SERVICE   |   | PERMISSIONED LEDGER |
| PostgreSQL 14+        |    | FastAPI Module   |   | Hyperledger Besu    |
| User Accounts & Roles |    | MCA Registry     |   | QBFT Consensus      |
| Product Master / Unit |    | FSSAI Checks     |   | Solidity Contract   |
| Custody Event Details |    | Trust Scoring    |   | Evidence Hashes     |
| Assessment Records    |    | Local Evidence   |   | Unit Hashes & Audit |
+-----------------------+    +------------------+   +---------------------+
```

---

## 2. Layer Separation & Responsibilities

### A. Off-Chain Storage (PostgreSQL)
Owned and designed in collaboration with Avika (Database Lead). Stores complete, queryable business entities:
- **`users` & `roles`**: Identity, hashed credentials, role assignments (ADMIN, MANUFACTURER, SUPPLIER, RETAILER, CONSUMER).
- **`sellers`**: Legal entities, registration references, jurisdictions.
- **`seller_evidence`**: Multiple granular evidence records per seller (registry checks, certificates, notes).
- **`seller_verification_assessments`**: Historical log of trust score assessments and explanations.
- **`product_master`**: Consolidated catalogue covering 6 regulated domains (Electronics, Pharma, FMCG, etc.).
- **`product_unit`**: Physical unit instances identified by unique UUIDs, serial numbers, and cryptographic digests.
- **`supply_chain_events`**: Granular custody transfers, geolocation updates, and status transitions.
- **`chain_transactions`**: Mappings of on-chain transaction hashes, block numbers, and confirmation states.
- **`scan_logs`**: Audit trail of consumer verification queries.

### B. On-Chain Permissioned Records (Hyperledger Besu QBFT)
Maintains minimal, immutable cryptographic state digests:
- **Unit Registration Anchors**: SHA-256 fingerprint of physical unit properties recorded at manufacture.
- **Custody Event Signatures**: Recalculated state digests emitted at each verified custody transfer.
- **Seller Verification Seals**: SHA-256 hash of the seller assessment bundle and verification status (`AUTHENTIC`, `SUSPICIOUS`, `UNVERIFIED`).
- **Role Permissions**: Smart contract-level gating of write transactions.

---

## 3. Cryptographic Verification & Tamper Detection

1. **Deterministic Fingerprinting**:
   Payloads are canonicalized by sorting keys alphabetically before computing standard SHA-256 digests. This guarantees that equivalent payloads yield identical hashes regardless of runtime serialization.
2. **Double Verification Barrier**:
   When a consumer scans a QR code:
   - **Step 1 (Off-Chain Check)**: The current database hash is checked against the event timeline.
   - **Step 2 (On-Chain Proof)**: The contract's immutable `units` mapping and `events` log are verified directly on the Besu QBFT network.
   - **Step 3 (Custody Continuity)**: The custody chain is validated for gaps, sequence violations, or unexpected transit jumps.
   - **Step 4 (Seller Compliance)**: The seller's assessment is retrieved from `seller_verification_assessments` and verified against the on-chain evidence hash.
3. **Safety Guarantee**:
   Missing, incomplete, or unreproducible evidence **never defaults to AUTHENTIC**. If any mandatory check fails, the result is downgraded to `SUSPICIOUS` or `UNVERIFIED` with actionable explanations.

