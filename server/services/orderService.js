const { STAGE_TRANSITIONS } = require('../utils/constants');
const { ApiError } = require('../middleware/errorHandler');

// Computes line totals from catalog snapshots and rolls them up into order-level
// amount/discount/finalAmount. Pricing is frozen at order-creation time — callers
// must pass the *current* catalog price/discount only once, here, at creation.
function computeOrderTotals(items) {
  let amount = 0;
  let finalAmount = 0;

  const computedItems = items.map((item) => {
    const unitFinalPrice = Math.round((item.unitPrice - (item.unitPrice * item.discountPercentage) / 100) * 100) / 100;
    const lineTotal = Math.round(unitFinalPrice * item.quantity * 100) / 100;
    amount += item.unitPrice * item.quantity;
    finalAmount += lineTotal;
    return { ...item, unitFinalPrice, lineTotal };
  });

  amount = Math.round(amount * 100) / 100;
  finalAmount = Math.round(finalAmount * 100) / 100;
  const discountPercentage = amount > 0 ? Math.round(((amount - finalAmount) / amount) * 10000) / 100 : 0;

  return { items: computedItems, amount, finalAmount, discountPercentage };
}

// Enforces the controlled workflow graph — throws if the requested transition
// is not an immediate allowed edge from the current stage.
function assertValidTransition(currentStage, nextStage) {
  const allowed = STAGE_TRANSITIONS[currentStage] || [];
  if (!allowed.includes(nextStage)) {
    throw new ApiError(400, `Cannot move order from ${currentStage} to ${nextStage}`);
  }
}

module.exports = { computeOrderTotals, assertValidTransition };
