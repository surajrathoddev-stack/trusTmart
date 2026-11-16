# trusTmart — REST API Reference Specification

**Base URL:** `http://localhost:3000`  
**Authentication:** Bearer Token (JWT) in `Authorization: Bearer <token>` header for protected endpoints.

---

## 1. System Health & Readiness

### `GET /api/health`
Liveness check for container orchestration and uptime monitors.
- **Auth:** None
- **Response 200 OK:**
  ```json
  {
    "status": "healthy",
    "timestamp": "2026-11-16T12:00:00.000Z",
    "version": "1.1.0",
    "network": "besu-qbft"
  }
  ```

### `GET /api/readiness`
Deep dependency verification (PostgreSQL, Besu RPC, Smart Contract, Seller Verification Service).
- **Auth:** None
- **Response 200 OK / 503 Service Unavailable:**
  ```json
  {
    "status": "ready",
    "timestamp": "2026-11-16T12:00:00.000Z",
    "services": {
      "backend": "healthy",
      "database": "connected",
      "blockchain": "connected",
      "smart_contract": "configured",
      "seller_verification": "available"
    }
  }
  ```

---

## 2. Authentication (`/api/auth`)

### `POST /api/auth/register`
Consumer account self-registration.
- **Auth:** None
- **Body:** `{ "email": "user@domain.com", "password": "securePassword123", "fullName": "Jane Doe" }`
- **Response 201 Created:** `{ "success": true, "data": { "token": "...", "user": { ... } } }`

### `POST /api/auth/login`
Authenticate existing stakeholder account.
- **Auth:** None
- **Body:** `{ "email": "admin@trustmart.io", "password": "adminPassword" }`
- **Response 200 OK:** `{ "success": true, "data": { "token": "...", "user": { ... } } }`

---

## 3. Stakeholder Administration (`/api/users`)
*Requires Admin role (`role: 'admin'`)*

- `GET /api/users`: List users (filters: `?role=manufacturer&status=approved`).
- `GET /api/users/:id`: Get user details.
- `POST /api/users`: Create manufacturer, supplier, or retailer account.
- `PATCH /api/users/:id`: Update role, status (`approved` / `suspended`), wallet address.

---

## 4. Product Catalogue (`/api/products`)

### `GET /api/products`
List all catalogue items.
- **Auth:** Any authenticated role.

### `POST /api/products`
Add item to master catalogue.
- **Auth:** `admin`, `manufacturer`
- **Body:**
  ```json
  {
    "productName": "UltraPro Smartphone X1",
    "brand": "Apex Mobile",
    "domain": "ELECTRONICS",
    "gtin": "08901234567890",
    "description": "Flagship 5G smartphone"
  }
  ```

---

## 5. Physical Units & Supply Chain (`/api/units`)

### `POST /api/products/:productId/units`
Manufacture & register physical unit. Anchors SHA-256 fingerprint on Besu QBFT blockchain.
- **Auth:** `manufacturer`
- **Body:**
  ```json
  {
    "serialNumber": "SN-X1-99201",
    "batchNumber": "BATCH-2026-Q4",
    "location": "Foxconn Bangalore Plant"
  }
  ```
- **Response 201 Created:**
  ```json
  {
    "success": true,
    "data": {
      "unitId": "550e8400-e29b-41d4-a716-446655440000",
      "dataHash": "7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069",
      "qrPayload": "data:image/png;base64,...",
      "onChainTx": "0x3a4b..."
    }
  }
  ```

### `POST /api/units/:unitId/events`
Record custody transfer, location update, or receipt.
- **Auth:** `supplier`, `retailer`
- **Body:**
  ```json
  {
    "eventType": "TRANSFERRED",
    "fromLocation": "Foxconn Bangalore Plant",
    "toLocation": "FedEx Central Hub Mumbai",
    "statusAfter": "IN_TRANSIT",
    "notes": "Consignment dispatched via air courier"
  }
  ```

### `PATCH /api/units/:unitId/sold`
Mark physical unit as sold at point of sale.
- **Auth:** `retailer`
- **Response 200 OK:** Custody event recorded and unit marked `is_sold: true`.

---

## 6. Consumer Verification (`/api/verify`)

### `GET /api/verify/:unitId` or `POST /api/verify`
The central verification orchestrator. Publicly callable without authentication.
- **Auth:** None
- **Response 200 OK:**
  ```json
  {
    "success": true,
    "data": {
      "status": "AUTHENTIC",
      "reasons": [
        "Cryptographic hash integrity check passed — state digest matches event chain.",
        "Blockchain record verified on permissioned Besu QBFT network.",
        "Custodial provenance chain verified — no unexpected breaks in custody.",
        "Location consistency check passed.",
        "Seller credentials verified with positive compliance signals."
      ],
      "product": {
        "unitId": "550e8400-e29b-41d4-a716-446655440000",
        "productName": "UltraPro Smartphone X1",
        "brand": "Apex Mobile",
        "domain": "ELECTRONICS",
        "serialNumber": "SN-X1-99201",
        "currentStatus": "SOLD",
        "currentLocation": "Reliance Digital Mumbai",
        "isSold": true
      },
      "sellerEvidence": {
        "sellerId": 12,
        "verificationStatus": "AUTHENTIC",
        "evidenceStatus": "VERIFIED",
        "score": 94.5,
        "explanation": "MCA active corporate registration confirmed; no regulatory sanctions.",
        "onChainStatus": "AUTHENTIC"
      },
      "transactions": [
        {
          "txHash": "0x9812...",
          "network": "besu-qbft",
          "status": "CONFIRMED"
        }
      ],
      "timeline": [
        {
          "eventType": "REGISTERED",
          "fromLocation": "Foxconn Bangalore Plant",
          "timestamp": "2026-11-01T08:00:00Z"
        },
        {
          "eventType": "TRANSFERRED",
          "toLocation": "Reliance Digital Mumbai",
          "timestamp": "2026-11-04T14:30:00Z"
        },
        {
          "eventType": "SOLD",
          "toLocation": "Reliance Digital Mumbai",
          "timestamp": "2026-11-07T11:20:00Z"
        }
      ]
    }
  }
  ```

---

## 7. Seller Verification Module (`/api/sellers`)

- `POST /api/sellers`: Register seller profile.
- `GET /api/sellers/:sellerId`: Fetch seller profile.
- `GET /api/sellers/:sellerId/trust`: Fetch latest trust score and verification status.
- `GET /api/sellers/:sellerId/assessments`: Fetch complete assessment history.
- `POST /api/sellers/:sellerId/assess`: Trigger live assessment, compute evidence hash, anchor on-chain.

