const asyncHandler = require("../utils/asyncHandler");
const User = require("../models/User");
const { ApiError } = require("../middleware/errorHandler");
const { logAction } = require("../services/auditService");
const { ROLES } = require("../utils/constants");

// GET /api/users  (admin accounts managed by superadmin)
const listAdmins = asyncHandler(async (req, res) => {
  const admins = await User.find({ role: ROLES.ADMIN }).sort({ createdAt: -1 });
  res.json(admins);
});

// POST /api/users
const createAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, ambassadorId, teamId } = req.body;
  if (!name || !email || !password) {
    throw new ApiError(400, "Name, email and password are required");
  }
  if (password.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters");
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new ApiError(409, "Email already in use");

  const passwordHash = await User.hashPassword(password);
  const admin = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: ROLES.ADMIN,
    ambassadorId,
    teamId,
  });

  await logAction({
    user: req.user,
    action: "ADMIN_CREATED",
    entityType: "User",
    entityId: admin._id,
    entityLabel: admin.email,
    newValue: { name: admin.name, email: admin.email },
  });

  res.status(201).json(admin);
});

// PUT /api/users/:id
const updateAdmin = asyncHandler(async (req, res) => {
  const admin = await User.findOne({ _id: req.params.id, role: ROLES.ADMIN });
  if (!admin) throw new ApiError(404, "Admin not found");

  const previousValue = {
    name: admin.name,
    email: admin.email,
    isActive: admin.isActive,
    ambassadorId: admin.ambassadorId,
    teamId: admin.teamId,
  };

  if (req.body.name) admin.name = req.body.name;
  if (req.body.email) admin.email = req.body.email.toLowerCase();
  if (req.body.ambassadorId !== undefined)
    admin.ambassadorId = req.body.ambassadorId;
  if (req.body.teamId !== undefined) admin.teamId = req.body.teamId;
  if (req.body.password) {
    if (req.body.password.length < 6)
      throw new ApiError(400, "Password must be at least 6 characters");
    admin.passwordHash = await User.hashPassword(req.body.password);
  }

  await admin.save();

  await logAction({
    user: req.user,
    action: "ADMIN_UPDATED",
    entityType: "User",
    entityId: admin._id,
    entityLabel: admin.email,
    previousValue,
    newValue: {
      name: admin.name,
      email: admin.email,
      isActive: admin.isActive,
      ambassadorId: admin.ambassadorId,
      teamId: admin.teamId,
    },
  });

  res.json(admin);
});

// PATCH /api/users/:id/status
const setAdminStatus = asyncHandler(async (req, res) => {
  const admin = await User.findOne({ _id: req.params.id, role: ROLES.ADMIN });
  if (!admin) throw new ApiError(404, "Admin not found");

  const previousValue = { isActive: admin.isActive };
  admin.isActive = Boolean(req.body.isActive);
  await admin.save();

  await logAction({
    user: req.user,
    action: admin.isActive ? "ADMIN_ENABLED" : "ADMIN_DISABLED",
    entityType: "User",
    entityId: admin._id,
    entityLabel: admin.email,
    previousValue,
    newValue: { isActive: admin.isActive },
  });

  res.json(admin);
});

module.exports = { listAdmins, createAdmin, updateAdmin, setAdminStatus };
