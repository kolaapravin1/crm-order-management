const asyncHandler = require('../utils/asyncHandler');
const Combo = require('../models/Combo');
const { ApiError } = require('../middleware/errorHandler');
const { logAction } = require('../services/auditService');
const { ROLES } = require('../utils/constants');

const listCombos = asyncHandler(async (req, res) => {
  const showAll = req.query.all === 'true' && req.user.role === ROLES.SUPERADMIN;
  const query = showAll ? {} : { isActive: true };
  const combos = await Combo.find(query).populate('products', 'name sku price isActive').sort({ createdAt: -1 });
  res.json(combos);
});

const getCombo = asyncHandler(async (req, res) => {
  const combo = await Combo.findById(req.params.id).populate('products', 'name sku price isActive');
  if (!combo) throw new ApiError(404, 'Combo not found');
  res.json(combo);
});

// POST /api/combos  (superadmin only)
const createCombo = asyncHandler(async (req, res) => {
  const { name, description, products, price, discountPercentage, image } = req.body;
  if (!name || !products || !products.length || price === undefined) {
    throw new ApiError(400, 'Name, at least one product and price are required');
  }

  const combo = await Combo.create({ name, description, products, price, discountPercentage, image });

  await logAction({
    user: req.user,
    action: 'COMBO_CREATED',
    entityType: 'Combo',
    entityId: combo._id,
    entityLabel: combo.name,
    newValue: combo.toObject(),
  });

  res.status(201).json(combo);
});

// PUT /api/combos/:id  (superadmin only)
const updateCombo = asyncHandler(async (req, res) => {
  const combo = await Combo.findById(req.params.id);
  if (!combo) throw new ApiError(404, 'Combo not found');

  const previousValue = combo.toObject();
  const priceChanged = req.body.price !== undefined && req.body.price !== combo.price;
  const discountChanged =
    req.body.discountPercentage !== undefined && req.body.discountPercentage !== combo.discountPercentage;

  ['name', 'description', 'products', 'price', 'discountPercentage', 'image', 'isActive'].forEach((field) => {
    if (req.body[field] !== undefined) combo[field] = req.body[field];
  });

  await combo.save();

  if (priceChanged || discountChanged) {
    await logAction({
      user: req.user,
      action: priceChanged ? 'PRICE_CHANGED' : 'DISCOUNT_CHANGED',
      entityType: 'Combo',
      entityId: combo._id,
      entityLabel: combo.name,
      previousValue: { price: previousValue.price, discountPercentage: previousValue.discountPercentage },
      newValue: { price: combo.price, discountPercentage: combo.discountPercentage },
    });
  }

  res.json(combo);
});

const deactivateCombo = asyncHandler(async (req, res) => {
  const combo = await Combo.findById(req.params.id);
  if (!combo) throw new ApiError(404, 'Combo not found');

  combo.isActive = false;
  await combo.save();

  await logAction({
    user: req.user,
    action: 'COMBO_DEACTIVATED',
    entityType: 'Combo',
    entityId: combo._id,
    entityLabel: combo.name,
  });

  res.json(combo);
});

module.exports = { listCombos, getCombo, createCombo, updateCombo, deactivateCombo };
