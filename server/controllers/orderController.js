const asyncHandler = require("../utils/asyncHandler");
const Order = require("../models/Order");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const Combo = require("../models/Combo");
const { ApiError } = require("../middleware/errorHandler");
const { logAction } = require("../services/auditService");
const {
  computeOrderTotals,
  assertValidTransition,
} = require("../services/orderService");
const generateOrderNumber = require("../utils/generateOrderNumber");
const { generateCustomerToken } = require("../utils/generateToken");
const { ROLES, ALL_STAGES } = require("../utils/constants");

const CUSTOMER_SAFE_PROJECTION =
  "orderNumber items amount discountPercentage finalAmount paymentStatus workflowStage " +
  "photoVerification.status design customerApproval production.status qc.status packing.status " +
  "deliveryStatus tracking createdAt";

// ---------- internal (authenticated) ----------

// GET /api/orders
const listOrders = asyncHandler(async (req, res) => {
  const {
    search = "",
    workflowStage,
    paymentStatus,
    deliveryStatus,
    assignedAdmin,
    from,
    to,
    page = 1,
    limit = 20,
  } = req.query;

  const query = {};
  if (workflowStage) query.workflowStage = workflowStage;
  if (paymentStatus) query.paymentStatus = paymentStatus;
  if (deliveryStatus) query.deliveryStatus = deliveryStatus;
  if (assignedAdmin) query.assignedAdmin = assignedAdmin;
  if (from || to) {
    query.createdAt = {};
    if (from) query.createdAt.$gte = new Date(from);
    if (to) query.createdAt.$lte = new Date(to);
  }
  if (search) {
    query.$or = [
      { orderNumber: new RegExp(search, "i") },
      { ambassadorId: new RegExp(search, "i") },
      { teamId: new RegExp(search, "i") },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const orderQuery = Order.find(query)
    .populate("assignedAdmin", "name email")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));
  if (req.user.role === ROLES.SUPERADMIN)
    orderQuery.populate("customer", "name phone email");
  else orderQuery.select("-customer");

  const [orders, total] = await Promise.all([
    orderQuery,
    Order.countDocuments(query),
  ]);

  res.json({
    orders,
    total,
    page: Number(page),
    pages: Math.ceil(total / Number(limit)),
  });
});

// GET /api/orders/:id
const getOrder = asyncHandler(async (req, res) => {
  const orderQuery = Order.findById(req.params.id)
    .populate("assignedAdmin", "name email")
    .populate("photoVerification.verifiedBy", "name")
    .populate("qc.checkedBy", "name")
    .populate("packing.packedBy", "name");
  if (req.user.role === ROLES.SUPERADMIN) orderQuery.populate("customer");
  else orderQuery.select("-customer");
  const order = await orderQuery;
  if (!order) throw new ApiError(404, "Order not found");
  res.json(order);
});

// POST /api/orders
const createOrder = asyncHandler(async (req, res) => {
  const {
    customer,
    newCustomer,
    items,
    ambassadorId,
    teamId,
    assignedAdmin,
    internalNotes,
  } = req.body;

  if (!items || !items.length)
    throw new ApiError(400, "At least one product or combo is required");
  const effectiveAmbassadorId =
    req.user.role === ROLES.ADMIN ? req.user.ambassadorId : ambassadorId;
  const effectiveTeamId =
    req.user.role === ROLES.ADMIN ? req.user.teamId : teamId;
  if (!effectiveAmbassadorId || !effectiveTeamId)
    throw new ApiError(400, "Ambassador ID and Team ID are required");

  let customerDoc;
  if (customer) {
    customerDoc = await Customer.findById(customer);
    if (!customerDoc) throw new ApiError(404, "Customer not found");
  } else if (newCustomer) {
    const { name, phone, email, address } = newCustomer;
    if (!name || !phone || !address)
      throw new ApiError(400, "New customer requires name, phone and address");
    customerDoc = await Customer.create({ name, phone, email, address });
  } else {
    throw new ApiError(400, "A customer must be selected or created");
  }

  // Resolve each line item against the live, active catalog and freeze its pricing.
  const resolvedItems = [];
  for (const line of items) {
    const { itemType, refId, quantity = 1 } = line;
    if (!["PRODUCT", "COMBO"].includes(itemType))
      throw new ApiError(400, "Invalid item type");

    const Model = itemType === "PRODUCT" ? Product : Combo;
    const doc = await Model.findById(refId);
    if (!doc || !doc.isActive)
      throw new ApiError(
        400,
        `Selected ${itemType.toLowerCase()} is not available`,
      );

    resolvedItems.push({
      itemType,
      itemModel: itemType === "PRODUCT" ? "Product" : "Combo",
      refId: doc._id,
      name: doc.name,
      quantity: Math.max(1, Number(quantity)),
      unitPrice: doc.price,
      discountPercentage: doc.discountPercentage,
    });
  }

  const totals = computeOrderTotals(resolvedItems);
  const orderNumber = await generateOrderNumber();
  const customerToken = generateCustomerToken();

  const order = await Order.create({
    orderNumber,
    ambassadorId: effectiveAmbassadorId,
    teamId: effectiveTeamId,
    customer: customerDoc._id,
    items: totals.items,
    amount: totals.amount,
    discountPercentage: totals.discountPercentage,
    finalAmount: totals.finalAmount,
    assignedAdmin: assignedAdmin || req.user._id,
    workflowStage: "PHOTO_VERIFICATION",
    internalNotes: internalNotes || "",
    customerToken,
  });

  await logAction({
    user: req.user,
    action: "ORDER_CREATED",
    entityType: "Order",
    entityId: order._id,
    entityLabel: order.orderNumber,
    newValue: {
      amount: order.amount,
      finalAmount: order.finalAmount,
      items: order.items,
    },
  });

  const populated = await order.populate([
    ...(req.user.role === ROLES.SUPERADMIN ? [{ path: "customer" }] : []),
    { path: "assignedAdmin", select: "name email" },
  ]);
  res.status(201).json(populated);
});

// PUT /api/orders/:id  — limited editable fields (superadmin, or admin for notes/customer info)
const updateOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Order not found");

  const previousValue = {
    internalNotes: order.internalNotes,
    assignedAdmin: order.assignedAdmin,
  };
  const editable =
    req.user.role === ROLES.SUPERADMIN
      ? ["internalNotes", "assignedAdmin", "ambassadorId", "teamId"]
      : ["internalNotes"];

  editable.forEach((field) => {
    if (req.body[field] !== undefined) order[field] = req.body[field];
  });

  await order.save();

  await logAction({
    user: req.user,
    action: "ORDER_EDITED",
    entityType: "Order",
    entityId: order._id,
    entityLabel: order.orderNumber,
    previousValue,
    newValue: {
      internalNotes: order.internalNotes,
      assignedAdmin: order.assignedAdmin,
    },
  });

  res.json(order);
});

// PATCH /api/orders/:id/stage (superadmin only)
const updateStage = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Order not found");

  const { workflowStage } = req.body;
  if (
    !ALL_STAGES.includes(workflowStage) ||
    workflowStage === "CUSTOMER_APPROVAL"
  ) {
    throw new ApiError(400, "Invalid workflow stage");
  }

  const previousStage = order.workflowStage;
  order.workflowStage = workflowStage;
  await order.save();

  await logAction({
    user: req.user,
    action: "STATUS_CHANGED",
    entityType: "Order",
    entityId: order._id,
    entityLabel: order.orderNumber,
    previousValue: { workflowStage: previousStage },
    newValue: { workflowStage },
  });

  res.json(order);
});

// DELETE /api/orders/:id (superadmin only)
const deleteOrder = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Order not found");
  const reason = String(req.body.reason || "").trim();
  if (!reason) throw new ApiError(400, "A deletion reason is required");

  await logAction({
    user: req.user,
    action: "ORDER_DELETED",
    entityType: "Order",
    entityId: order._id,
    entityLabel: order.orderNumber,
    previousValue: { workflowStage: order.workflowStage },
    newValue: { reason },
  });
  await order.deleteOne();
  res.json({ message: "Order deleted" });
});

// PATCH /api/orders/:id/payment
const updatePaymentStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Order not found");

  const { paymentStatus } = req.body;
  const previousValue = order.paymentStatus;
  order.paymentStatus = paymentStatus;
  await order.save();

  await logAction({
    user: req.user,
    action: "PAYMENT_UPDATED",
    entityType: "Order",
    entityId: order._id,
    entityLabel: order.orderNumber,
    previousValue: { paymentStatus: previousValue },
    newValue: { paymentStatus },
  });

  res.json(order);
});

// PATCH /api/orders/:id/photo-verification/upload
const uploadPhotoFiles = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Order not found");

  const files = (req.files || []).map((f) => ({
    url: `/uploads/photos/${f.filename}`,
    originalName: f.originalname,
    uploadedBy: req.user._id,
  }));
  order.photoVerification.files.push(...files);
  order.photoVerification.status = "PENDING";
  await order.save();

  await logAction({
    user: req.user,
    action: "PHOTOS_UPLOADED",
    entityType: "Order",
    entityId: order._id,
    entityLabel: order.orderNumber,
    newValue: { count: files.length },
  });

  res.json(order);
});

// PATCH /api/orders/:id/photo-verification/status
const setPhotoVerificationStatus = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Order not found");

  const { status, notes } = req.body;
  if (!["VERIFIED", "REJECTED"].includes(status))
    throw new ApiError(400, "Invalid verification status");
  if (status === "REJECTED" && !notes)
    throw new ApiError(400, "A reason is required when photos are rejected");

  if (order.workflowStage === "PHOTO_REJECTED" && status === "VERIFIED") {
    assertValidTransition("PHOTO_REJECTED", "PHOTO_VERIFICATION");
    order.workflowStage = "PHOTO_VERIFICATION";
  }

  order.photoVerification.status = status;
  order.photoVerification.notes = notes || "";
  order.photoVerification.verifiedBy = req.user._id;
  order.photoVerification.verifiedAt = new Date();

  const nextStage = status === "VERIFIED" ? "DESIGN" : "PHOTO_REJECTED";
  assertValidTransition(order.workflowStage, nextStage);
  order.workflowStage = nextStage;

  await order.save();

  await logAction({
    user: req.user,
    action: status === "VERIFIED" ? "PHOTO_VERIFIED" : "PHOTO_REJECTED",
    entityType: "Order",
    entityId: order._id,
    entityLabel: order.orderNumber,
    newValue: { status, notes },
  });

  res.json(order);
});

// PATCH /api/orders/:id/design/upload
const uploadDesignVersion = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Order not found");

  if (!["DESIGN", "DESIGN_REVISION"].includes(order.workflowStage)) {
    throw new ApiError(
      400,
      "Order is not in a stage that accepts design uploads",
    );
  }
  if (!req.file) throw new ApiError(400, "A design file is required");

  const nextVersion = order.design.versions.length + 1;
  order.design.versions.push({
    version: nextVersion,
    url: `/uploads/design/${req.file.filename}`,
    uploadedBy: req.user._id,
  });

  assertValidTransition(order.workflowStage, "PRODUCTION");
  order.workflowStage = "PRODUCTION";

  await order.save();

  await logAction({
    user: req.user,
    action: "DESIGN_UPLOADED",
    entityType: "Order",
    entityId: order._id,
    entityLabel: order.orderNumber,
    newValue: { version: nextVersion },
  });

  res.json(order);
});

// PATCH /api/orders/:id/production
const updateProduction = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Order not found");
  if (!["PRODUCTION", "PRODUCTION_REWORK"].includes(order.workflowStage)) {
    throw new ApiError(400, "Order is not in production");
  }

  const { status, notes } = req.body;
  const previousValue = { status: order.production.status };
  order.production.status = status;
  if (notes !== undefined) order.production.notes = notes;
  if (status === "STARTED" && !order.production.startedAt)
    order.production.startedAt = new Date();

  if (status === "COMPLETED") {
    order.production.completedAt = new Date();
    assertValidTransition(order.workflowStage, "QC");
    order.workflowStage = "QC";
    order.qc.status = "PENDING";
  }

  await order.save();

  await logAction({
    user: req.user,
    action: "STATUS_CHANGED",
    entityType: "Order",
    entityId: order._id,
    entityLabel: order.orderNumber,
    previousValue,
    newValue: { status },
  });

  res.json(order);
});

// PATCH /api/orders/:id/qc
const updateQC = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Order not found");
  if (order.workflowStage !== "QC")
    throw new ApiError(400, "Order is not in QC");

  const { status, reason } = req.body;
  if (!["PASSED", "FAILED"].includes(status))
    throw new ApiError(400, "Invalid QC status");
  if (status === "FAILED" && !reason)
    throw new ApiError(400, "A reason is required when QC fails");

  order.qc.status = status;
  order.qc.reason = status === "FAILED" ? reason : "";
  order.qc.checkedBy = req.user._id;
  order.qc.checkedAt = new Date();

  const nextStage = status === "PASSED" ? "PACKING" : "PRODUCTION_REWORK";
  assertValidTransition("QC", nextStage);
  order.workflowStage = nextStage;
  if (nextStage === "PRODUCTION_REWORK")
    order.production.status = "IN_PROGRESS";
  else order.packing.status = "PENDING";

  await order.save();

  await logAction({
    user: req.user,
    action: status === "PASSED" ? "QC_PASSED" : "QC_FAILED",
    entityType: "Order",
    entityId: order._id,
    entityLabel: order.orderNumber,
    newValue: { status, reason },
  });

  res.json(order);
});

// PATCH /api/orders/:id/packing
const updatePacking = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Order not found");
  if (order.workflowStage !== "PACKING")
    throw new ApiError(400, "Order is not in packing");

  order.packing.status = "PACKED";
  order.packing.packedBy = req.user._id;
  order.packing.packedAt = new Date();

  assertValidTransition("PACKING", "DELIVERY");
  order.workflowStage = "DELIVERY";
  order.deliveryStatus = "PENDING";

  await order.save();

  await logAction({
    user: req.user,
    action: "STATUS_CHANGED",
    entityType: "Order",
    entityId: order._id,
    entityLabel: order.orderNumber,
    newValue: { packing: "PACKED" },
  });

  res.json(order);
});

// PATCH /api/orders/:id/tracking  (superadmin only)
const updateTracking = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);
  if (!order) throw new ApiError(404, "Order not found");

  const { courier, trackingNumber, trackingUrl, deliveryStatus } = req.body;
  const previousValue = {
    tracking: order.tracking,
    deliveryStatus: order.deliveryStatus,
  };

  if (courier !== undefined) order.tracking.courier = courier;
  if (trackingNumber !== undefined)
    order.tracking.trackingNumber = trackingNumber;
  if (trackingUrl !== undefined) order.tracking.trackingUrl = trackingUrl;
  order.tracking.updatedAt = new Date();
  order.tracking.updatedBy = req.user._id;

  if (deliveryStatus) {
    order.deliveryStatus = deliveryStatus;
    if (deliveryStatus === "DELIVERED" && order.workflowStage === "DELIVERY") {
      assertValidTransition("DELIVERY", "COMPLETED");
      order.workflowStage = "COMPLETED";
    }
  }

  await order.save();

  await logAction({
    user: req.user,
    action: "TRACKING_UPDATED",
    entityType: "Order",
    entityId: order._id,
    entityLabel: order.orderNumber,
    previousValue,
    newValue: {
      tracking: order.tracking,
      deliveryStatus: order.deliveryStatus,
    },
  });

  res.json(order);
});

// ---------- public (customer, secure token) ----------

// GET /api/public/orders/:token
const getPublicOrder = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ customerToken: req.params.token })
    .populate("customer", "name")
    .select(CUSTOMER_SAFE_PROJECTION + " customer ambassadorId teamId");
  if (!order) throw new ApiError(404, "Order not found");
  res.json(order);
});

// POST /api/public/orders/:token/approval
const submitCustomerApproval = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ customerToken: req.params.token });
  if (!order) throw new ApiError(404, "Order not found");
  if (order.workflowStage !== "CUSTOMER_APPROVAL") {
    throw new ApiError(400, "This order is not awaiting approval");
  }

  const { decision, comment } = req.body;
  if (!["APPROVE", "REJECT"].includes(decision))
    throw new ApiError(400, "Invalid decision");

  const latestVersion = order.design.versions[order.design.versions.length - 1];

  if (decision === "APPROVE") {
    order.customerApproval.status = "APPROVED";
    order.customerApproval.timestamp = new Date();
    order.customerApproval.approvedVersion = latestVersion
      ? latestVersion.version
      : undefined;
    if (latestVersion) latestVersion.locked = true;

    assertValidTransition("CUSTOMER_APPROVAL", "PRODUCTION");
    order.workflowStage = "PRODUCTION";
    order.production.status = "NOT_STARTED";
  } else {
    order.customerApproval.status = "REJECTED";
    order.customerApproval.timestamp = new Date();
    order.customerApproval.comment = comment || "";

    assertValidTransition("CUSTOMER_APPROVAL", "DESIGN_REVISION");
    order.workflowStage = "DESIGN_REVISION";
  }

  await order.save();

  const systemUser = {
    _id: order.customer,
    name: "Customer (via secure link)",
  };
  await logAction({
    user: systemUser,
    action:
      decision === "APPROVE"
        ? "CUSTOMER_APPROVED_DESIGN"
        : "CUSTOMER_REJECTED_DESIGN",
    entityType: "Order",
    entityId: order._id,
    entityLabel: order.orderNumber,
    newValue: { decision, comment },
  });

  res.json({
    workflowStage: order.workflowStage,
    customerApproval: order.customerApproval,
  });
});

module.exports = {
  listOrders,
  getOrder,
  createOrder,
  updateOrder,
  updateStage,
  deleteOrder,
  updatePaymentStatus,
  uploadPhotoFiles,
  setPhotoVerificationStatus,
  uploadDesignVersion,
  updateProduction,
  updateQC,
  updatePacking,
  updateTracking,
  getPublicOrder,
  submitCustomerApproval,
};
