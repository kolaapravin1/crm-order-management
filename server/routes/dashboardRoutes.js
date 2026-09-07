const express = require('express');
const { superadminSummary, adminSummary } = require('../controllers/dashboardController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.use(protect);

router.get('/superadmin', authorize(ROLES.SUPERADMIN), superadminSummary);
router.get('/admin', adminSummary);

module.exports = router;
