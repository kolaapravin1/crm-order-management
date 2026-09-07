const mongoose = require('mongoose');
const {
  WORKFLOW_STAGES,
  REVISION_STAGES,
  PAYMENT_STATUSES,
  DELIVERY_STATUSES,
  PHOTO_VERIFICATION_STATUSES,
  PRODUCTION_STATUSES,
  QC_STATUSES,
  PACKING_STATUSES,
  APPROVAL_STATUSES,
} = require('../utils/constants');

const ALL_STAGE_VALUES = [...WORKFLOW_STAGES, ...Object.keys(REVISION_STAGES)];

// Snapshot of a product/combo at the time it was added to an order — pricing here
// must never be recalculated from the live catalog, so historical orders stay stable.
const orderItemSchema = new mongoose.Schema(
  {
    itemType: { type: String, enum: ['PRODUCT', 'COMBO'], required: true },
    itemModel: { type: String, enum: ['Product', 'Combo'], required: true },
    refId: { type: mongoose.Schema.Types.ObjectId, required: true, refPath: 'items.itemModel' },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    discountPercentage: { type: Number, required: true, default: 0 },
    unitFinalPrice: { type: Number, required: true, min: 0 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const fileSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    originalName: { type: String, default: '' },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const designVersionSchema = new mongoose.Schema(
  {
    version: { type: Number, required: true },
    url: { type: String, required: true },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    uploadedAt: { type: Date, default: Date.now },
    locked: { type: Boolean, default: false },
  },
  { _id: true }
);

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, required: true, unique: true }, // e.g. ORD-2026-000123
    ambassadorId: { type: String, required: true, trim: true, uppercase: true },
    teamId: { type: String, required: true, trim: true, uppercase: true },

    customer: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },

    items: { type: [orderItemSchema], validate: (v) => v.length > 0 },

    amount: { type: Number, required: true, min: 0 }, // sum of original (pre-discount) line totals
    discountPercentage: { type: Number, required: true, default: 0 }, // effective blended discount
    finalAmount: { type: Number, required: true, min: 0 },

    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: 'PENDING' },

    workflowStage: { type: String, enum: ALL_STAGE_VALUES, default: 'ORDER_CREATED' },

    assignedAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    photoVerification: {
      files: { type: [fileSchema], default: [] },
      status: { type: String, enum: PHOTO_VERIFICATION_STATUSES, default: 'PENDING' },
      notes: { type: String, default: '' },
      verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      verifiedAt: { type: Date },
    },

    design: {
      versions: { type: [designVersionSchema], default: [] },
    },

    customerApproval: {
      status: { type: String, enum: APPROVAL_STATUSES, default: 'PENDING' },
      timestamp: { type: Date },
      comment: { type: String, default: '' },
      approvedVersion: { type: Number },
    },

    production: {
      status: { type: String, enum: PRODUCTION_STATUSES, default: 'NOT_STARTED' },
      startedAt: { type: Date },
      completedAt: { type: Date },
      notes: { type: String, default: '' },
    },

    qc: {
      status: { type: String, enum: QC_STATUSES, default: 'PENDING' },
      reason: { type: String, default: '' },
      checkedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      checkedAt: { type: Date },
    },

    packing: {
      status: { type: String, enum: PACKING_STATUSES, default: 'PENDING' },
      packedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      packedAt: { type: Date },
    },

    deliveryStatus: { type: String, enum: DELIVERY_STATUSES, default: 'PENDING' },
    tracking: {
      courier: { type: String, default: '' },
      trackingNumber: { type: String, default: '' },
      trackingUrl: { type: String, default: '' },
      updatedAt: { type: Date },
      updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    },

    internalNotes: { type: String, default: '' },

    customerToken: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

orderSchema.index({ ambassadorId: 1, teamId: 1 });
orderSchema.index({ workflowStage: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
