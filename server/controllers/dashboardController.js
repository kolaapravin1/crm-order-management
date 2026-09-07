const asyncHandler = require('../utils/asyncHandler');
const Order = require('../models/Order');
const Customer = require('../models/Customer');
const User = require('../models/User');
const { ROLES } = require('../utils/constants');

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// GET /api/dashboard/superadmin
const superadminSummary = asyncHandler(async (req, res) => {
  const [
    totalOrders,
    ordersToday,
    awaitingApproval,
    inProduction,
    inQC,
    readyForDelivery,
    delivered,
    pendingPayments,
    totalCustomers,
    totalAdmins,
    recentOrders,
  ] = await Promise.all([
    Order.countDocuments({}),
    Order.countDocuments({ createdAt: { $gte: startOfToday() } }),
    Order.countDocuments({ workflowStage: 'CUSTOMER_APPROVAL' }),
    Order.countDocuments({ workflowStage: { $in: ['PRODUCTION', 'PRODUCTION_REWORK'] } }),
    Order.countDocuments({ workflowStage: 'QC' }),
    Order.countDocuments({ workflowStage: 'PACKING' }),
    Order.countDocuments({ workflowStage: 'COMPLETED' }),
    Order.countDocuments({ paymentStatus: { $in: ['PENDING', 'PARTIAL'] } }),
    Customer.countDocuments({}),
    User.countDocuments({ role: ROLES.ADMIN }),
    Order.find({}).sort({ createdAt: -1 }).limit(8).populate('customer', 'name').populate('assignedAdmin', 'name'),
  ]);

  res.json({
    totalOrders,
    ordersToday,
    pendingOrders: totalOrders - delivered,
    awaitingApproval,
    inProduction,
    inQC,
    readyForDelivery,
    delivered,
    pendingPayments,
    totalCustomers,
    totalAdmins,
    recentOrders,
  });
});

// GET /api/dashboard/admin
const adminSummary = asyncHandler(async (req, res) => {
  const mine = { assignedAdmin: req.user._id };

  const [
    myActiveOrders,
    newOrders,
    awaitingPhoto,
    awaitingDesign,
    awaitingApproval,
    production,
    qc,
    packing,
    delivery,
    recentOrders,
  ] = await Promise.all([
    Order.countDocuments({ ...mine, workflowStage: { $ne: 'COMPLETED' } }),
    Order.countDocuments({ ...mine, workflowStage: 'ORDER_CREATED' }),
    Order.countDocuments({ ...mine, workflowStage: { $in: ['PHOTO_VERIFICATION', 'PHOTO_REJECTED'] } }),
    Order.countDocuments({ ...mine, workflowStage: { $in: ['DESIGN', 'DESIGN_REVISION'] } }),
    Order.countDocuments({ ...mine, workflowStage: 'CUSTOMER_APPROVAL' }),
    Order.countDocuments({ ...mine, workflowStage: { $in: ['PRODUCTION', 'PRODUCTION_REWORK'] } }),
    Order.countDocuments({ ...mine, workflowStage: 'QC' }),
    Order.countDocuments({ ...mine, workflowStage: 'PACKING' }),
    Order.countDocuments({ ...mine, workflowStage: 'DELIVERY' }),
    Order.find(mine).sort({ createdAt: -1 }).limit(8).populate('customer', 'name'),
  ]);

  res.json({
    myActiveOrders,
    newOrders,
    awaitingPhoto,
    awaitingDesign,
    awaitingApproval,
    production,
    qc,
    packing,
    delivery,
    recentOrders,
  });
});

module.exports = { superadminSummary, adminSummary };
