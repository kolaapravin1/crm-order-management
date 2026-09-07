const express = require('express');
const { getPublicOrder, submitCustomerApproval } = require('../controllers/orderController');

const router = express.Router();

// No auth middleware here — access is gated purely by the unguessable order token.
router.get('/:token', getPublicOrder);
router.post('/:token/approval', submitCustomerApproval);

module.exports = router;
