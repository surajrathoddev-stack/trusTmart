// src/config/env.js
// Loads and normalizes environment variables for trusTmart.

require('dotenv').config();

const env = {
  PORT: parseInt(process.env.PORT, 10) || 3000,
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/trustmart',
  JWT_SECRET: process.env.JWT_SECRET || 'trustmart-dev-secret-do-not-use-in-production',
  
  // Permissioned Network (Default: Hyperledger Besu QBFT)
  BLOCKCHAIN_NETWORK: process.env.BLOCKCHAIN_NETWORK || 'besu-qbft',
  BESU_RPC_URL: process.env.BESU_RPC_URL || 'http://127.0.0.1:8545',
  BESU_CHAIN_ID: parseInt(process.env.BESU_CHAIN_ID || '1337', 10),
  
  // Optional Testnet (Sepolia fallback)
  SEPOLIA_RPC_URL: process.env.SEPOLIA_RPC_URL || '',
  
  DEPLOYER_PRIVATE_KEY: process.env.DEPLOYER_PRIVATE_KEY || '',
  CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS || '',
  SELLER_SERVICE_BASE_URL: process.env.SELLER_SERVICE_BASE_URL || 'http://127.0.0.1:8000',
  NODE_ENV: process.env.NODE_ENV || 'development',
};

module.exports = env;
