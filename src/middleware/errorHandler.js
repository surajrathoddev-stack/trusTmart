// src/middleware/errorHandler.js
// Centralized error-handling middleware.
// Returns a consistent JSON error shape; never leaks stack traces to clients.

const env = require('../config/env');

class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

function errorHandler(err, _req, res, _next) {
  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  const statusCode = err.statusCode || 500;
  const message = err.isOperational ? err.message : 'Internal server error';

  const response = {
    success: false,
    error: message,
  };

  if (err.details) {
    response.details = err.details;
  }

  // Only attach stack in development
  if (env.NODE_ENV === 'development' && statusCode === 500) {
    response.stack = err.stack;
  }

  if (statusCode === 500) {
    console.error('Unhandled error:', err);
  }

  return res.status(statusCode).json(response);
}

module.exports = { AppError, errorHandler };

