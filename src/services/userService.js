// src/services/userService.js
// Business logic for user management aligned with Avika's schema:
// users(user_id, email, password_hash, full_name, role_id, wallet_address, is_active, created_at)
// roles(role_id, role_name)

const bcrypt = require('bcryptjs');
const db = require('../config/database');
const { AppError } = require('../middleware/errorHandler');

const SALT_ROUNDS = 12;

/**
 * Resolve role_id from role name (e.g. 'ADMIN', 'admin' -> role_id)
 */
async function getRoleId(roleName) {
  const normalized = (roleName || 'CONSUMER').toUpperCase();
  const res = await db.query('SELECT role_id FROM roles WHERE UPPER(role_name) = $1', [normalized]);
  if (res.rows.length === 0) {
    // Default fallback if roles table not yet seeded
    const fallback = await db.query('SELECT role_id FROM roles LIMIT 1');
    return fallback.rows.length > 0 ? fallback.rows[0].role_id : 1;
  }
  return res.rows[0].role_id;
}

/**
 * Create a new user account.
 */
async function createUser({ email, password, role = 'consumer', fullName = 'User', walletAddress = null }) {
  const existing = await db.query('SELECT user_id FROM users WHERE email = $1', [email]);
  if (existing.rows.length > 0) {
    throw new AppError('A user with this email already exists', 409);
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const roleId = await getRoleId(role);
  const isActive = true;

  const result = await db.query(
    `INSERT INTO users (email, password_hash, full_name, role_id, wallet_address, is_active)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING user_id, email, full_name, role_id, wallet_address, is_active, created_at`,
    [email, passwordHash, fullName, roleId, walletAddress, isActive]
  );

  const row = result.rows[0];
  return {
    id: row.user_id,
    user_id: row.user_id,
    email: row.email,
    role: role.toLowerCase(),
    role_id: row.role_id,
    full_name: row.full_name,
    fullName: row.full_name,
    status: row.is_active ? 'approved' : 'suspended',
    wallet_address: row.wallet_address,
    walletAddress: row.wallet_address,
    created_at: row.created_at,
  };
}

/**
 * Authenticate a user by email + password.
 */
async function authenticateUser(email, password) {
  const result = await db.query(
    `SELECT u.user_id, u.email, u.password_hash, u.full_name, u.role_id, u.wallet_address, u.is_active, r.role_name
     FROM users u
     LEFT JOIN roles r ON u.role_id = r.role_id
     WHERE u.email = $1`,
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

  if (!user.is_active) {
    throw new AppError('Account is inactive or suspended — contact an administrator', 403);
  }

  const roleName = (user.role_name || 'consumer').toLowerCase();

  return {
    id: user.user_id,
    user_id: user.user_id,
    email: user.email,
    role: roleName,
    full_name: user.full_name,
    fullName: user.full_name,
    status: 'approved',
    wallet_address: user.wallet_address,
  };
}

/**
 * Get all users with role filtering.
 */
async function getAllUsers({ role, status } = {}) {
  let sql = `
    SELECT u.user_id, u.email, u.full_name, u.role_id, u.wallet_address, u.is_active, u.created_at, r.role_name
    FROM users u
    LEFT JOIN roles r ON u.role_id = r.role_id
    WHERE 1=1
  `;
  const params = [];

  if (role) {
    params.push(role.toUpperCase());
    sql += ` AND UPPER(r.role_name) = $${params.length}`;
  }
  if (status) {
    const active = status.toLowerCase() === 'approved';
    params.push(active);
    sql += ` AND u.is_active = $${params.length}`;
  }

  sql += ' ORDER BY u.created_at DESC';
  const result = await db.query(sql, params);

  return result.rows.map((row) => ({
    id: row.user_id,
    user_id: row.user_id,
    email: row.email,
    role: (row.role_name || 'consumer').toLowerCase(),
    full_name: row.full_name,
    fullName: row.full_name,
    status: row.is_active ? 'approved' : 'suspended',
    wallet_address: row.wallet_address,
    created_at: row.created_at,
  }));
}

/**
 * Get user by ID.
 */
async function getUserById(id) {
  const result = await db.query(
    `SELECT u.user_id, u.email, u.full_name, u.role_id, u.wallet_address, u.is_active, u.created_at, r.role_name
     FROM users u
     LEFT JOIN roles r ON u.role_id = r.role_id
     WHERE u.user_id = $1`,
    [id]
  );
  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }
  const row = result.rows[0];
  return {
    id: row.user_id,
    user_id: row.user_id,
    email: row.email,
    role: (row.role_name || 'consumer').toLowerCase(),
    full_name: row.full_name,
    status: row.is_active ? 'approved' : 'suspended',
    wallet_address: row.wallet_address,
    created_at: row.created_at,
  };
}

/**
 * Update user fields (admin-only).
 */
async function updateUser(id, updates) {
  const setClauses = [];
  const params = [];

  if (updates.full_name || updates.fullName) {
    params.push(updates.full_name || updates.fullName);
    setClauses.push(`full_name = $${params.length}`);
  }
  if (updates.wallet_address || updates.walletAddress) {
    params.push(updates.wallet_address || updates.walletAddress);
    setClauses.push(`wallet_address = $${params.length}`);
  }
  if (updates.status) {
    const isActive = updates.status.toLowerCase() === 'approved';
    params.push(isActive);
    setClauses.push(`is_active = $${params.length}`);
  }
  if (updates.role) {
    const roleId = await getRoleId(updates.role);
    params.push(roleId);
    setClauses.push(`role_id = $${params.length}`);
  }

  if (setClauses.length === 0) {
    throw new AppError('No valid fields to update', 400);
  }

  params.push(id);
  const sql = `UPDATE users SET ${setClauses.join(', ')} WHERE user_id = $${params.length} RETURNING *`;
  const result = await db.query(sql, params);

  if (result.rows.length === 0) {
    throw new AppError('User not found', 404);
  }

  return getUserById(id);
}

module.exports = {
  createUser,
  authenticateUser,
  getAllUsers,
  getUserById,
  updateUser,
  getRoleId,
};
