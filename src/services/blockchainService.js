// src/services/blockchainService.js
// Handles all interactions with the TrusTmart smart contract on the permissioned network.

const { getContract, getProvider } = require('../config/blockchain');

function formatBytes32(hash) {
  if (!hash) return '0x' + '0'.repeat(64);
  const clean = hash.startsWith('0x') ? hash.slice(2) : hash;
  return '0x' + clean.padEnd(64, '0').slice(0, 64);
}

/**
 * Register a product unit's hash on-chain.
 * @param {string} detailHash  SHA-256 hex hash of the unit details.
 * @returns {Promise<{ txHash: string, blockNumber: number, gasUsed: string } | null>}
 */
async function registerUnitOnChain(detailHash) {
  const contract = getContract();
  if (!contract) {
    console.warn('Smart contract not configured — skipping on-chain registration.');
    return null;
  }

  const hashBytes = formatBytes32(detailHash);
  const tx = await contract.registerUnit(hashBytes);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed ? receipt.gasUsed.toString() : '0',
  };
}

/**
 * Record a supply-chain event on-chain.
 * @param {string} unitHash  The unit's original detail hash.
 * @param {string} eventType  Type of event (REGISTERED, TRANSFERRED, LOCATION_UPDATE, etc.).
 * @param {string} newHash   Recalculated hash after the event.
 */
async function recordEventOnChain(unitHash, eventType, newHash) {
  const contract = getContract();
  if (!contract) {
    console.warn('Smart contract not configured — skipping on-chain event recording.');
    return null;
  }

  const tx = await contract.recordEvent(
    formatBytes32(unitHash),
    eventType,
    formatBytes32(newHash)
  );
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed ? receipt.gasUsed.toString() : '0',
  };
}

/**
 * Mark a unit as sold on-chain.
 * @param {string} unitHash  The unit's current detail hash.
 */
async function markSoldOnChain(unitHash) {
  const contract = getContract();
  if (!contract) {
    console.warn('Smart contract not configured — skipping on-chain sold marking.');
    return null;
  }

  const tx = await contract.markSold(formatBytes32(unitHash));
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed ? receipt.gasUsed.toString() : '0',
  };
}

/**
 * Record seller verification assessment on-chain.
 * @param {number|string} sellerId       Relational seller ID.
 * @param {string} evidenceHash          SHA-256 hash of evidence payload.
 * @param {string} verificationStatus   AUTHENTIC | SUSPICIOUS | UNVERIFIED.
 */
async function recordSellerVerificationOnChain(sellerId, evidenceHash, verificationStatus) {
  const contract = getContract();
  if (!contract) {
    console.warn('Smart contract not configured — skipping on-chain seller verification.');
    return null;
  }

  const numericId = parseInt(sellerId, 10);
  const hashBytes = formatBytes32(evidenceHash);

  const tx = await contract.recordSellerVerification(numericId, hashBytes, verificationStatus);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed ? receipt.gasUsed.toString() : '0',
  };
}

/**
 * Read unit data from on-chain for verification.
 * @param {string} detailHash  The original SHA-256 hash.
 */
async function getUnitFromChain(detailHash) {
  const contract = getContract();
  if (!contract) return null;

  try {
    const data = await contract.getUnit(formatBytes32(detailHash));
    return {
      hash: data.detailHash,
      timestamp: Number(data.timestamp),
      isRegistered: data.isRegistered,
      isSold: data.isSold,
      eventCount: Number(data.eventCount),
      registeredBy: data.registeredBy,
    };
  } catch {
    return null;
  }
}

/**
 * Read seller verification status from on-chain.
 * @param {number|string} sellerId  Off-chain seller ID.
 */
async function getSellerVerificationFromChain(sellerId) {
  const contract = getContract();
  if (!contract) return null;

  try {
    const numericId = parseInt(sellerId, 10);
    const data = await contract.getSellerVerification(numericId);
    return {
      evidenceHash: data.evidenceHash,
      verificationStatus: data.verificationStatus,
      timestamp: Number(data.timestamp),
      reviewer: data.reviewer,
      exists: data.exists,
    };
  } catch {
    return null;
  }
}

/**
 * Verify a transaction receipt by hash.
 */
async function verifyTransactionReceipt(txHash) {
  const provider = getProvider();
  if (!provider || !txHash) return null;

  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) return null;

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      status: receipt.status === 1 ? 'confirmed' : 'failed',
      gasUsed: receipt.gasUsed ? receipt.gasUsed.toString() : '0',
      logs: receipt.logs ? receipt.logs.length : 0,
    };
  } catch {
    return null;
  }
}

module.exports = {
  registerUnitOnChain,
  recordEventOnChain,
  markSoldOnChain,
  recordSellerVerificationOnChain,
  getUnitFromChain,
  getSellerVerificationFromChain,
  verifyTransactionReceipt,
  formatBytes32,
};
