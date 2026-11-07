// src/controllers/userController.js
// Admin-only user management.

const userService = require('../services/userService');

async function getUsers(req, res, next) {
  try {
    const { role, status } = req.query;
    const users = await userService.getAllUsers({ role, status });
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const user = await userService.createUser(req.body);
    res.status(201).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const user = await userService.updateUser(id, req.body);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

async function getUser(req, res, next) {
  try {
    const { id } = req.params;
    const user = await userService.getUserById(id);
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

module.exports = { getUsers, createUser, updateUser, getUser };

