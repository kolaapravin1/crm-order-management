const Counter = require('../models/Counter');

// Atomically increments a per-year counter so order numbers stay sequential and
// gap-free even under concurrent order creation.
async function generateOrderNumber() {
  const year = new Date().getFullYear();
  const key = `order-${year}`;
  const counter = await Counter.findByIdAndUpdate(
    key,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  const padded = String(counter.seq).padStart(6, '0');
  return `ORD-${year}-${padded}`;
}

module.exports = generateOrderNumber;
