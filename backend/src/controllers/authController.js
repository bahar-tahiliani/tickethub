const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { signToken } = require('../utils/jwt');
const userModel = require('../models/userModel');

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const allowedRoles = ['customer', 'organiser']; // admins are seeded directly in the DB, not self-registered
  const finalRole = allowedRoles.includes(role) ? role : 'customer';

  const existing = await userModel.findByEmail(email);
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = await userModel.createUser({ name, email, passwordHash, role: finalRole });
  const user = await userModel.findById(userId);

  const token = signToken({ id: user.id, name: user.name, email: user.email, role: user.role });
  res.status(201).json({ success: true, data: { user, token } });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await userModel.findByEmail(email);
  if (!user) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new ApiError(401, 'Invalid email or password.');
  }

  const token = signToken({ id: user.id, name: user.name, email: user.email, role: user.role });
  const { password_hash, ...safeUser } = user;
  res.json({ success: true, data: { user: safeUser, token } });
});

// Stateless JWT - "logout" is a client-side token discard. Endpoint exists
// for API completeness and to give the frontend a clean call to hook into.
const logout = asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'Logged out successfully.' });
});

const me = asyncHandler(async (req, res) => {
  const user = await userModel.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found.');
  res.json({ success: true, data: { user } });
});

module.exports = { register, login, logout, me };
