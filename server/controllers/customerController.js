const asyncHandler = require('../utils/asyncHandler');
const Customer = require('../models/Customer');
const { ApiError } = require('../middleware/errorHandler');

// GET /api/customers?search=&page=&limit=
const listCustomers = asyncHandler(async (req, res) => {
  const { search = '', page = 1, limit = 20 } = req.query;
  const query = search
    ? {
        $or: [
          { name: new RegExp(search, 'i') },
          { phone: new RegExp(search, 'i') },
          { email: new RegExp(search, 'i') },
        ],
      }
    : {};

  const skip = (Number(page) - 1) * Number(limit);
  const [customers, total] = await Promise.all([
    Customer.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Customer.countDocuments(query),
  ]);

  res.json({ customers, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
});

// GET /api/customers/:id
const getCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw new ApiError(404, 'Customer not found');
  res.json(customer);
});

// POST /api/customers
const createCustomer = asyncHandler(async (req, res) => {
  const { name, phone, email, address } = req.body;
  if (!name || !phone || !address) {
    throw new ApiError(400, 'Name, phone and address are required');
  }
  const customer = await Customer.create({ name, phone, email, address });
  res.status(201).json(customer);
});

// PUT /api/customers/:id
const updateCustomer = asyncHandler(async (req, res) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) throw new ApiError(404, 'Customer not found');

  ['name', 'phone', 'email', 'address'].forEach((field) => {
    if (req.body[field] !== undefined) customer[field] = req.body[field];
  });

  await customer.save();
  res.json(customer);
});

module.exports = { listCustomers, getCustomer, createCustomer, updateCustomer };
