// src/app.js
// Express application setup — routes, middleware, health/readiness, and error handling.

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { errorHandler } = require('./middleware/errorHandler');
const db = require('./config/database');
const blockchain = require('./config/blockchain');
const sellerService = require('./services/sellerService');
const env = require('./config/env');

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const unitRoutes = require('./routes/unitRoutes');
const verifyRoutes = require('./routes/verifyRoutes');
const sellerRoutes = require('./routes/sellerRoutes');

const app = express();

// --- Global middleware ---
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// --- Health / Liveness Endpoint ---
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.1.0',
    network: env.BLOCKCHAIN_NETWORK,
  });
});

// --- Readiness Endpoint (Checks all dependencies without leaking credentials) ---
app.get('/api/readiness', async (_req, res) => {
  const readiness = {
    status: 'ready',
    timestamp: new Date().toISOString(),
    services: {
      backend: 'healthy',
      database: 'disconnected',
      blockchain: 'disconnected',
      smart_contract: 'unconfigured',
      seller_verification: 'unavailable',
    },
  };

  // 1. Check PostgreSQL
  try {
    await db.query('SELECT 1');
    readiness.services.database = 'connected';
  } catch (err) {
    readiness.services.database = 'disconnected';
    readiness.status = 'degraded';
  }

  // 2. Check Blockchain RPC Node
  try {
    const provider = blockchain.getProvider();
    if (provider) {
      const blockNum = await Promise.race([
        provider.getBlockNumber(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2000)),
      ]);
      readiness.services.blockchain = typeof blockNum === 'number' ? 'connected' : 'disconnected';
    }
  } catch {
    readiness.services.blockchain = 'disconnected';
    // Permissioned node may be starting up or simulated
    if (readiness.status === 'ready') readiness.status = 'degraded';
  }

  // 3. Check Smart Contract Configuration
  if (env.CONTRACT_ADDRESS && blockchain.contractABI && blockchain.contractABI.length > 0) {
    readiness.services.smart_contract = 'configured';
  } else if (blockchain.contractABI && blockchain.contractABI.length > 0) {
    readiness.services.smart_contract = 'compiled_pending_deployment';
  }

  // 4. Check Seller Verification Service
  try {
    const sellerHealth = await sellerService.checkSellerServiceHealth();
    readiness.services.seller_verification = sellerHealth;
  } catch {
    readiness.services.seller_verification = 'unavailable';
  }

  const statusCode = readiness.services.database === 'connected' ? 200 : 503;
  return res.status(statusCode).json(readiness);
});

// --- API routes ---
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/units', unitRoutes);
app.use('/api/verify', verifyRoutes);
app.use('/api/sellers', sellerRoutes);

// --- 404 handler ---
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// --- Centralized error handler ---
app.use(errorHandler);

module.exports = app;
