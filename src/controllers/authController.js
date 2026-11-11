// src/controllers/authController.js
// Handles login and logout.

const userService = require('../services/userService');
const { generateToken } = require('../middleware/auth');
const { AppError } = require('../middleware/errorHandler');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const user = await userService.authenticateUser(email, password);
    const token = generateToken(user);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          fullName: user.full_name,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function logout(_req, res) {
  // JWT is stateless — logout is handled client-side by discarding the token.
  // This endpoint exists for API completeness and can be extended with
  // token blacklisting if needed.
  res.json({ success: true, message: 'Logged out successfully.' });
}

/**
 * Self-registration for consumer accounts only.
 */
async function registerConsumer(req, res, next) {
  try {
    const { email, password, fullName } = req.body;
    const user = await userService.createUser({
      email,
      password,
      role: 'consumer',
      fullName,
    });

    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      data: { token, user },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, logout, registerConsumer };

