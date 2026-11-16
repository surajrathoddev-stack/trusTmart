// test/unit/auth.test.js
const { authenticate, authorize, generateToken } = require('../../src/middleware/auth');
const jwt = require('jsonwebtoken');
const env = require('../../src/config/env');

describe('Authentication & Role-Based Authorization Middleware', () => {
  it('should generate a valid JWT token with user id, email, and role', () => {
    const user = { id: 1, email: 'admin@trustmart.io', role: 'admin' };
    const token = generateToken(user);

    expect(token).toBeDefined();
    const decoded = jwt.verify(token, env.JWT_SECRET);
    expect(decoded.id).toBe(1);
    expect(decoded.email).toBe('admin@trustmart.io');
    expect(decoded.role).toBe('admin');
  });

  it('authenticate() should reject requests missing Bearer token with 401', () => {
    const req = { headers: {} };
    const res = {};
    const next = jest.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(401);
  });

  it('authenticate() should accept valid Bearer tokens and attach req.user', () => {
    const user = { id: 2, email: 'maker@trustmart.io', role: 'manufacturer' };
    const token = generateToken(user);

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = {};
    const next = jest.fn();

    authenticate(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.user).toBeDefined();
    expect(req.user.email).toBe('maker@trustmart.io');
    expect(req.user.role).toBe('manufacturer');
  });

  it('authorize() should reject unauthorized roles with 403', () => {
    const req = { user: { id: 3, role: 'consumer' } };
    const res = {};
    const next = jest.fn();

    const middleware = authorize('admin', 'manufacturer');
    middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    const error = next.mock.calls[0][0];
    expect(error.statusCode).toBe(403);
  });

  it('authorize() should permit authorized roles', () => {
    const req = { user: { id: 1, role: 'ADMIN' } };
    const res = {};
    const next = jest.fn();

    const middleware = authorize('admin');
    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});

