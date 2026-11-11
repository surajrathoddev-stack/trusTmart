// src/middleware/validate.js
// Zod-based request validation middleware factory.

/**
 * Returns middleware that validates req.body against the given Zod schema.
 * On failure, throws a ZodError which is caught by the error handler.
 *
 * @param {import('zod').ZodSchema} schema
 */
function validate(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const err = result.error;
      err.name = 'ZodError';
      return next(err);
    }
    req.body = result.data; // use parsed/cleaned values
    return next();
  };
}

/**
 * Validates req.params against the given Zod schema.
 */
function validateParams(schema) {
  return (req, _res, next) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      const err = result.error;
      err.name = 'ZodError';
      return next(err);
    }
    req.params = result.data;
    return next();
  };
}

module.exports = { validate, validateParams };

