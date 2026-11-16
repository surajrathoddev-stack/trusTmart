// src/config/blockchain.js
// EVM provider and smart contract instance for trusTmart.
// Supports Hyperledger Besu QBFT permissioned network as default with Sepolia testnet fallback.

const { ethers } = require('ethers');
const env = require('./env');

let provider = null;
let wallet = null;
let contract = null;
let contractABI = [];

try {
  const artifact = require('../../artifacts/contracts/TrusTmart.sol/TrusTmart.json');
  contractABI = artifact.abi;
} catch {
  // ABI will be loaded once compiled
}

function getRpcUrl() {
  if (env.BLOCKCHAIN_NETWORK === 'sepolia' && env.SEPOLIA_RPC_URL) {
    return env.SEPOLIA_RPC_URL;
  }
  return env.BESU_RPC_URL || 'http://127.0.0.1:8545';
}

function getProvider() {
  if (!provider) {
    const rpcUrl = getRpcUrl();
    if (rpcUrl) {
      provider = new ethers.JsonRpcProvider(rpcUrl);
    }
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
    const p = getProvider();
    const signerOrProvider = w || p;
    if (signerOrProvider) {
      contract = new ethers.Contract(env.CONTRACT_ADDRESS, contractABI, signerOrProvider);
    }
  }
  return contract;
}

function reloadABI() {
  try {
    delete require.cache[require.resolve('../../artifacts/contracts/TrusTmart.sol/TrusTmart.json')];
    const artifact = require('../../artifacts/contracts/TrusTmart.sol/TrusTmart.json');
    contractABI = artifact.abi;
    contract = null;
  } catch {
    // Artifact not yet available
  }
}

module.exports = {
  getProvider,
  getWallet,
  getContract,
  getRpcUrl,
  reloadABI,
  contractABI,
};
