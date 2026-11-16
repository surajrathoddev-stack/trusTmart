# Hyperledger Besu QBFT Permissioned Network Guide

## 1. Consensus Overview

trusTmart employs **Hyperledger Besu** with **QBFT (Quorum Byzantine Fault Tolerance)** consensus for its production consortium network.

### Why QBFT?
- **Deterministic Finality**: Immediate finality with zero chain reorganizations or forking risks, essential for legally binding supply chain custody records.
- **High Throughput & Predictability**: Configured with a 2-second block period (`blockperiodseconds: 2`), yielding high transaction capacity without proof-of-work energy waste or public gas market volatility.
- **Fault Tolerance**: With $N = 4$ validators, the network tolerates $F = \lfloor (4 - 1) / 3 \rfloor = 1$ faulty or malicious validator node.
- **EVM Compatibility**: Executes standard Solidity smart contracts without modification.

---

## 2. Validator Node Architecture

The local prototype provisions **four validator nodes** configured under `blockchain/besu/`:

| Node | Address | P2P Port | RPC Port | Consortium Role |
|---|---|---|---|---|
| **Node 1** | `0x9e246e7f2255e24b4f593b4695b2875b28d71221` | 30303 | 8545 | Consortium Admin (Backend RPC Gateway) |
| **Node 2** | `0x4b7f7e27ddb3a568b209d20c572a9e3381e4b85c` | 30304 | 8546 | Manufacturer Consortium Representative |
| **Node 3** | `0xd3a129d2b27131713d31b315d18e8d2e8b233a75` | 30305 | 8547 | Logistics & Custody Auditing Partner |
| **Node 4** | `0xb81816e8140be0458df20a1eb9e84d4b1a8f94d9` | 30306 | 8548 | Independent Regulatory / Consumer Node |

### Decentralization Reality Check
> **Engineering Note:** Running 4 Docker containers on a single developer machine demonstrates the technical mechanics of QBFT consensus, voting, and network permissioning. However, true decentralization is an organizational and governance property, not merely a process count. A production consortium must distribute validator infrastructure across independent legal entities, cloud providers, and administrative domains to prevent single-entity collusion.

---

## 3. Network Startup & Execution

### Prerequisites
- Docker Engine & Docker Compose

### Startup Instructions
```bash
# Navigate to the Besu network configuration directory
cd blockchain/besu

# Launch the 4-node QBFT network
docker-compose up -d

# Verify node synchronization and block production
docker logs -f trustmart-validator1
```

Once running, Node 1 exposes JSON-RPC on `http://127.0.0.1:8545` with chain ID `1337`.

---

## 4. Permissioning Model

1. **Node Permissioning (`permissions_config.toml`)**:
   Only enodes explicitly included in `nodes-allowlist` are permitted to establish P2P communication or join the gossip mesh.
2. **Account Permissioning**:
   Only pre-approved validator and deployer addresses in `accounts-allowlist` can submit state-modifying transactions.
3. **Dynamic Validator Governance (QBFT Voting)**:
   Adding a 5th validator requires active validators to submit on-chain proposals:
   ```javascript
   // Node 1 proposes adding a new validator address
   await provider.send("qbft_proposeValidatorVote", [
     "0xNewValidatorAddress...",
     true // true = add, false = remove
   ]);
   ```
   A supermajority (> 66%) of validator proposals transitions the candidate into the active validator set at the next epoch block.

