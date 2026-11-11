// src/config/database.js
// Single PostgreSQL connection pool for the entire application.

const { Pool } = require('pg');
const env = require('./env');

const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err.message);
});

/**
 * Run a parameterized query.
 * @param {string} text  SQL query with $1, $2, … placeholders
 * @param {any[]}  params  Parameter values
 * @returns {Promise<import('pg').QueryResult>}
 */
const query = (text, params) => pool.query(text, params);

/**
 * Get a dedicated client for transactions.
 * Remember to call client.release() when done.
 */
const getClient = () => pool.connect();

module.exports = { pool, query, getClient };

