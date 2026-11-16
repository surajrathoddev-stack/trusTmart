# trusTmart — Smart Contract Deployment & Integration Specification

## 1. Contract Metadata

- **Contract Name:** `TrusTmart`
- **Solidity Version:** `^0.8.19`
- **Compiler Optimization:** Enabled (200 runs)
- **Target Consensus:** QBFT (Hyperledger Besu) / EVM
- **Chain ID:** `1337` (Besu Local Dev) / `11155111` (Sepolia Testnet)
- **Artifact Path:** `artifacts/contracts/TrusTmart.sol/TrusTmart.json`

---

## 2. Interface Definition (ABI Summary)

### Write Functions (Role-Protected)
```solidity
// Admin Only
function assignRole(address _account, Role _role) external;
function recordSellerVerification(uint256 _sellerId, bytes32 _evidenceHash, string calldata _verificationStatus) external;

// Manufacturer Only
function registerUnit(bytes32 _detailHash) external;

// Supplier & Retailer
function recordEvent(bytes32 _unitHash, string calldata _eventType, bytes32 _newHash) external;

// Retailer Only
function markSold(bytes32 _unitHash) external;
```

### Read Functions (Public)
```solidity
function getUnit(bytes32 _detailHash) external view returns (bytes32 detailHash, uint256 timestamp, bool isRegistered, bool isSold, uint256 eventCount, address registeredBy);
function getEventCount(bytes32 _unitHash) external view returns (uint256);
function getEvent(bytes32 _unitHash, uint256 _index) external view returns (bytes32 unitHash, string memory eventType, bytes32 newHash, address actor, uint256 timestamp);
function getSellerVerification(uint256 _sellerId) external view returns (bytes32 evidenceHash, string memory verificationStatus, uint256 timestamp, address reviewer, bool exists);
function getSellerVerificationCount(uint256 _sellerId) external view returns (uint256);
function getSellerVerificationByIndex(uint256 _sellerId, uint256 _index) external view returns (bytes32 evidenceHash, string memory verificationStatus, uint256 timestamp, address reviewer);
function hasRole(address _account, Role _role) external view returns (bool);
```

### Emitted Events
```solidity
event RoleAssigned(address indexed account, Role role);
event UnitRegistered(bytes32 indexed detailHash, address indexed manufacturer, uint256 timestamp);
event EventRecorded(bytes32 indexed unitHash, string eventType, bytes32 newHash, address indexed actor, uint256 timestamp);
event UnitSold(bytes32 indexed unitHash, address indexed retailer, uint256 timestamp);
event SellerVerificationRecorded(uint256 indexed sellerId, bytes32 indexed evidenceHash, string verificationStatus, address indexed reviewer, uint256 timestamp);
```

---

## 3. Deployment Instructions

### Deploy to Local Hyperledger Besu QBFT Network
1. Ensure the 4 validator nodes are active (`cd blockchain/besu && docker-compose up -d`).
2. Run deployment:
   ```bash
   node scripts/deploy.js
   ```
3. Copy the output contract address and update `.env`:
   ```bash
   CONTRACT_ADDRESS=0x...
   ```

### Deploy to Sepolia Testnet (Optional Fallback)
1. Set in `.env`:
   ```env
   BLOCKCHAIN_NETWORK=sepolia
   SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_KEY
   DEPLOYER_PRIVATE_KEY=0x...
   ```
2. Execute deployment:
   ```bash
   node scripts/deploy.js
   ```

