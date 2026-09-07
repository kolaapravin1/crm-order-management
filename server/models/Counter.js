const mongoose = require('mongoose');

// Backs atomic, gap-free sequence numbers for human-facing order numbers (ORD-2026-000123).
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true }, // e.g. "order-2026"
  seq: { type: Number, default: 0 },
});

module.exports = mongoose.model('Counter', counterSchema);
