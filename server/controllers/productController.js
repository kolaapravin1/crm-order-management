const asyncHandler = require('../utils/asyncHandler');
const Product = require('../models/Product');
const { ApiError } = require('../middleware/errorHandler');
const { logAction } = require('../services/auditService');
const { ROLES } = require('../utils/constants');

// GET /api/products  (Admins only see active ones; superadmin sees all via ?all=true)
const listProducts = asyncHandler(async (req, res) => {
  const showAll = req.query.all === 'true' && req.user.role === ROLES.SUPERADMIN;
  const query = showAll ? {} : { isActive: true };
  const products = await Product.find(query).sort({ createdAt: -1 });
  res.json(products);
});

const getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');
  res.json(product);
});

// POST /api/products  (superadmin only)
const createProduct = asyncHandler(async (req, res) => {
  const { name, sku, description, price, discountPercentage, image } = req.body;
  if (!name || !sku || price === undefined) {
    throw new ApiError(400, 'Name, SKU and price are required');
  }

  const product = await Product.create({ name, sku, description, price, discountPercentage, image });

  await logAction({
    user: req.user,
    action: 'PRODUCT_CREATED',
    entityType: 'Product',
    entityId: product._id,
    entityLabel: product.name,
    newValue: product.toObject(),
  });

  res.status(201).json(product);
});

// PUT /api/products/:id  (superadmin only)
const updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');

  const previousValue = product.toObject();
  const priceChanged = req.body.price !== undefined && req.body.price !== product.price;
  const discountChanged =
    req.body.discountPercentage !== undefined && req.body.discountPercentage !== product.discountPercentage;

  ['name', 'sku', 'description', 'price', 'discountPercentage', 'image', 'isActive'].forEach((field) => {
    if (req.body[field] !== undefined) product[field] = req.body[field];
  });

  await product.save();

  if (priceChanged) {
    await logAction({
      user: req.user,
      action: 'PRICE_CHANGED',
      entityType: 'Product',
      entityId: product._id,
      entityLabel: product.name,
      previousValue: { price: previousValue.price },
      newValue: { price: product.price },
    });
  }
  if (discountChanged) {
    await logAction({
      user: req.user,
      action: 'DISCOUNT_CHANGED',
      entityType: 'Product',
      entityId: product._id,
      entityLabel: product.name,
      previousValue: { discountPercentage: previousValue.discountPercentage },
      newValue: { discountPercentage: product.discountPercentage },
    });
  }
  await logAction({
    user: req.user,
    action: 'PRODUCT_UPDATED',
    entityType: 'Product',
    entityId: product._id,
    entityLabel: product.name,
    previousValue,
    newValue: product.toObject(),
  });

  res.json(product);
});

// DELETE /api/products/:id -> deactivate, never hard-delete (historical orders reference it)
const deactivateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new ApiError(404, 'Product not found');

  product.isActive = false;
  await product.save();

  await logAction({
    user: req.user,
    action: 'PRODUCT_DEACTIVATED',
    entityType: 'Product',
    entityId: product._id,
    entityLabel: product.name,
  });

  res.json(product);
});

module.exports = { listProducts, getProduct, createProduct, updateProduct, deactivateProduct };
