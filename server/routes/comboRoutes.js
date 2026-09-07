const express = require('express');
const {
  listCombos,
  getCombo,
  createCombo,
  updateCombo,
  deactivateCombo,
} = require('../controllers/comboController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.use(protect);

router.get('/', listCombos);
router.get('/:id', getCombo);
router.post('/', authorize(ROLES.SUPERADMIN), createCombo);
router.put('/:id', authorize(ROLES.SUPERADMIN), updateCombo);
router.delete('/:id', authorize(ROLES.SUPERADMIN), deactivateCombo);

module.exports = router;
