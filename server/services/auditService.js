const AuditLog = require('../models/AuditLog');

// Fire-and-record audit trail entry. Never throws into the caller's flow —
// a logging failure must not block the underlying business action.
async function logAction({ user, action, entityType, entityId, entityLabel = '', previousValue = null, newValue = null }) {
  try {
    await AuditLog.create({
      user: user._id,
      userName: user.name,
      action,
      entityType,
      entityId,
      entityLabel,
      previousValue,
      newValue,
    });
  } catch (err) {
    console.error('Failed to write audit log:', err.message);
  }
}

module.exports = { logAction };
