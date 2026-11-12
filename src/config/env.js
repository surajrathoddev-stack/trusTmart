// src/config/env.js
// Loads and validates environment variables.

require('dotenv').config();

const env = {
  PORT: parseInt(process.env.PORT, 10) || 3000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET || 'dev-secret-change-me',
  SEPOLIA_RPC_URL: process.env.SEPOLIA_RPC_URL || '',
  DEPLOYER_PRIVATE_KEY: process.env.DEPLOYER_PRIVATE_KEY || '',
  CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS || '',
  SELLER_SERVICE_BASE_URL: process.env.SELLER_SERVICE_BASE_URL || 'http://localhost:4000',
  NODE_ENV: process.env.NODE_ENV || 'development',
};

module.exports = env;

