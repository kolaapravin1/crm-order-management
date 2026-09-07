const asyncHandler = require('../utils/asyncHandler');
const AuditLog = require('../models/AuditLog');

// GET /api/audit-logs?entityType=&action=&page=&limit=
const listAuditLogs = asyncHandler(async (req, res) => {
  const { entityType, action, entityId, page = 1, limit = 30 } = req.query;

  const query = {};
  if (entityType) query.entityType = entityType;
  if (action) query.action = action;
  if (entityId) query.entityId = entityId;

  const skip = (Number(page) - 1) * Number(limit);
  const [logs, total] = await Promise.all([
    AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    AuditLog.countDocuments(query),
  ]);

  res.json({ logs, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

module.exports = { listAuditLogs };
