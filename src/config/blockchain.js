// src/config/blockchain.js
// Ethereum provider and contract instance for the backend.

const { ethers } = require('ethers');
const env = require('./env');

let provider = null;
let wallet = null;
let contract = null;

// ABI will be loaded from the compiled artifact after deployment.
// This is a placeholder that gets replaced by the real ABI once the contract is compiled.
let contractABI = [];

try {
  // Attempt to load compiled ABI from Hardhat artifacts
  const artifact = require('../../artifacts/contracts/TrusTmart.sol/TrusTmart.json');
  contractABI = artifact.abi;
} catch {
  // ABI not yet available — contract hasn't been compiled yet.
  // Will be set after first compile.
}

function getProvider() {
  if (!provider && env.SEPOLIA_RPC_URL) {
    provider = new ethers.JsonRpcProvider(env.SEPOLIA_RPC_URL);
  }
  return provider;
}

function getWallet() {
  if (!wallet && env.DEPLOYER_PRIVATE_KEY) {
    const p = getProvider();
    if (p) {
      wallet = new ethers.Wallet(env.DEPLOYER_PRIVATE_KEY, p);
    }
  }
  return wallet;
}

function getContract() {
  if (!contract && env.CONTRACT_ADDRESS && contractABI.length > 0) {
    const w = getWallet();
    if (w) {
      contract = new ethers.Contract(env.CONTRACT_ADDRESS, contractABI, w);
    }
  }
  return contract;
}

/**
 * Reload ABI from disk (e.g. after a fresh compile).
 */
function reloadABI() {
  try {
    delete require.cache[require.resolve('../../artifacts/contracts/TrusTmart.sol/TrusTmart.json')];
    const artifact = require('../../artifacts/contracts/TrusTmart.sol/TrusTmart.json');
    contractABI = artifact.abi;
    contract = null; // force re-creation on next call
  } catch {
    // ignore if not yet compiled
  }
}

module.exports = { getProvider, getWallet, getContract, reloadABI, contractABI };

