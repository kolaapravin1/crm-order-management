const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const { signAuthToken } = require('../utils/generateToken');
const { ApiError } = require('../middleware/errorHandler');

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    throw new ApiError(400, 'Email and password are required');
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !user.isActive) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const valid = await user.comparePassword(password);
  if (!valid) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const token = signAuthToken(user);
  res.json({ token, user });
});

// GET /api/auth/me
const getMe = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

module.exports = { login, getMe };
