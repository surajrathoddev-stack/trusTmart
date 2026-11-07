// src/middleware/auth.js
// JWT authentication and role-based authorization middleware.

const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { AppError } = require('./errorHandler');

/**
 * Verify the Bearer token and attach req.user = { id, email, role }.
 */
function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(new AppError('Authentication required — missing or malformed Bearer token', 401));
  }

  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
    };
    return next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Token expired', 401));
    }
    return next(new AppError('Invalid token', 401));
  }
}

/**
 * Factory: returns middleware that allows only the listed roles.
 * Must be placed after authenticate().
 *
 * @param  {...string} allowedRoles  e.g. 'admin', 'manufacturer'
 */
function authorize(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError('Authentication required', 401));
    }
    const normalizedRole = req.user.role.toLowerCase();
    const allowed = allowedRoles.map((r) => r.toLowerCase());
    if (!allowed.includes(normalizedRole)) {
      return next(
        new AppError(
          `Forbidden — role '${req.user.role}' is not authorized for this action. Required: ${allowedRoles.join(', ')}`,
          403
        )
      );
    }
    return next();
  };
}

/**
 * Generate a JWT for a user.
 * @param {{ id: string, email: string, role: string }} user
 * @returns {string}
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    env.JWT_SECRET,
    { expiresIn: '24h' }
  );
}

module.exports = { authenticate, authorize, generateToken };

