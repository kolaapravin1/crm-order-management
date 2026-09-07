const express = require('express');
const { listAdmins, createAdmin, updateAdmin, setAdminStatus } = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.use(protect, authorize(ROLES.SUPERADMIN));

router.get('/', listAdmins);
router.post('/', createAdmin);
router.put('/:id', updateAdmin);
router.patch('/:id/status', setAdminStatus);

module.exports = router;
