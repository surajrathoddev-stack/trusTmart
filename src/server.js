// src/server.js
// Application entry point — starts the Express server.

const app = require('./app');
const env = require('./config/env');
const { initDatabase } = require('./models/init');

async function start() {
  try {
    // Initialize database tables
    await initDatabase();

    app.listen(env.PORT, () => {
      console.log(`trusTmart backend running on port ${env.PORT} [${env.NODE_ENV}]`);
      console.log(`Health check: http://localhost:${env.PORT}/api/health`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();

