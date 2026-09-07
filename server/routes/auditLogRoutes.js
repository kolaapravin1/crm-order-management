const express = require('express');
const { listAuditLogs } = require('../controllers/auditLogController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.use(protect, authorize(ROLES.SUPERADMIN));
router.get('/', listAuditLogs);

module.exports = router;
