// src/services/userService.js
// Business logic for user management.

const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

const SALT_ROUNDS = 12;

/**
 * Create a new user (admin-only action for privileged roles).
 */
async function createUser({ email, password, role, fullName, walletAddress }) {
  // Check for duplicate email
  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw new AppError('A user with this email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  // Consumer accounts are auto-approved; others require admin approval
  const status = role === 'consumer' ? 'approved' : 'pending';

  const result = await db.query(
    `INSERT INTO users (email, password_hash, role, status, full_name, wallet_address)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, email, role, status, full_name, wallet_address, created_at`,
    [email, passwordHash, role, status, fullName || null, walletAddress || null]
  );

  return result.rows[0];
}

/**
 * Authenticate a user by email + password.
 */
async function authenticateUser(email, password) {
  const result = await db.query(
    'SELECT id, email, password_hash, role, status, full_name, wallet_address FROM users WHERE email = $1',
    [email]
  );
  if (result.rows.length === 0) {
    throw new AppError('Invalid email or password', 401);
  }

  const user = result.rows[0];
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new AppError('Invalid email or password', 401);
  }

  if (user.status !== 'approved') {
    throw new AppError(`Account is ${user.status} — contact an administrator`, 403);
  }

  // Strip password_hash before returning
  const { password_hash, ...safeUser } = user;
  return safeUser;
}

/**
 * Get all users (admin view).
 */
async function getAllUsers({ role, status } = {}) {
  let sql = 'SELECT id, email, role, status, full_name, wallet_address, created_at, updated_at FROM users WHERE 1=1';
  const params = [];

  if (role) {
    params.push(role);
    sql += ` AND role = $${params.length}`;
  }
  if (status) {
    params.push(status);
    sql += ` AND status = $${params.length}`;
  }

  sql += ' ORDER BY created_at DESC';
  const result = await db.query(sql, params);
  return result.rows;
}

/**
 * Get a single user by ID.
 */
async function getUserById(id) {
  const result = await db.query(
    'SELECT id, email, role, status, full_name, wallet_address, created_at, updated_at FROM users WHERE id = $1',
    [id]
  );
  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }
  return result.rows[0];
}

/**
 * Update user fields (admin-only: approve, set role, set status, etc.)
 */
async function updateUser(id, updates) {
  const allowedFields = ['role', 'status', 'full_name', 'wallet_address'];
  const setClauses = [];
  const params = [];

  for (const [key, value] of Object.entries(updates)) {
    if (allowedFields.includes(key)) {
      params.push(value);
      setClauses.push(`${key} = $${params.length}`);
    }
  }

  if (setClauses.length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  params.push(id);
  setClauses.push(`updated_at = NOW()`);

  const sql = `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${params.length}
               RETURNING id, email, role, status, full_name, wallet_address, created_at, updated_at`;

  const result = await db.query(sql, params);
  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }
  return result.rows[0];
}

module.exports = { createUser, authenticateUser, getAllUsers, getUserById, updateUser };

