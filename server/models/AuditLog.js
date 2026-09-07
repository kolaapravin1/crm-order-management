const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true }, // snapshot in case the user is later disabled/renamed
    action: { type: String, required: true }, // e.g. ORDER_CREATED, PRICE_CHANGED, DESIGN_UPLOADED
    entityType: { type: String, required: true }, // Order, Product, Combo, User, ...
    entityId: { type: mongoose.Schema.Types.ObjectId, required: true },
    entityLabel: { type: String, default: '' }, // human-readable, e.g. order number
    previousValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ entityType: 1, entityId: 1 });
auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
