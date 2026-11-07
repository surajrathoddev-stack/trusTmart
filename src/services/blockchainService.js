// src/services/blockchainService.js
// Handles all interactions with the TrusTmart smart contract.

const { getContract, getProvider } = require('../config/blockchain');

/**
 * Register a product unit's hash on-chain.
 * @param {string} detailHash  SHA-256 hex hash of the unit details.
 * @returns {{ txHash: string }} or null if blockchain is not configured.
 */
async function registerUnitOnChain(detailHash) {
  const contract = getContract();
  if (!contract) {
    console.warn('Smart contract not configured — skipping on-chain registration.');
    return null;
  }

  const hashBytes = '0x' + detailHash;
  const tx = await contract.registerUnit(hashBytes);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
  };
}

/**
 * Record a supply-chain event on-chain.
 * @param {string} unitHash  The unit's original detail hash.
 * @param {string} eventType  Type of event.
 * @param {string} newHash   Recalculated hash after the event.
 */
async function recordEventOnChain(unitHash, eventType, newHash) {
  const contract = getContract();
  if (!contract) {
    console.warn('Smart contract not configured — skipping on-chain event recording.');
    return null;
  }

  const tx = await contract.recordEvent(
    '0x' + unitHash,
    eventType,
    '0x' + newHash
  );
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
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

  const tx = await contract.markSold('0x' + unitHash);
  const receipt = await tx.wait();

  return {
    txHash: receipt.hash,
    blockNumber: receipt.blockNumber,
    gasUsed: receipt.gasUsed.toString(),
  };
}

/**
 * Read unit data from on-chain for verification.
 * @param {string} detailHash  The original SHA-256 hash.
 */
async function getUnitFromChain(detailHash) {
  const contract = getContract();
  if (!contract) {
    return null;
  }

  try {
    const data = await contract.getUnit('0x' + detailHash);
    return {
      hash: data.detailHash,
      timestamp: Number(data.timestamp),
      isRegistered: data.isRegistered,
      isSold: data.isSold,
      eventCount: Number(data.eventCount),
    };
  } catch {
    return null;
  }
}

/**
 * Verify a transaction receipt by hash — confirms on-chain events rather than
 * merely trusting that a tx was submitted.
 */
async function verifyTransactionReceipt(txHash) {
  const provider = getProvider();
  if (!provider) return null;

  try {
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) return null;

    return {
      txHash: receipt.hash,
      blockNumber: receipt.blockNumber,
      status: receipt.status === 1 ? 'confirmed' : 'failed',
      gasUsed: receipt.gasUsed.toString(),
      logs: receipt.logs.length,
    };
  } catch {
    return null;
  }
}

module.exports = {
  registerUnitOnChain,
  recordEventOnChain,
  markSoldOnChain,
  getUnitFromChain,
  verifyTransactionReceipt,
};

