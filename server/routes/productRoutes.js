const express = require('express');
const {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deactivateProduct,
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');
const { ROLES } = require('../utils/constants');

const router = express.Router();

router.use(protect);

router.get('/', listProducts);
router.get('/:id', getProduct);
router.post('/', authorize(ROLES.SUPERADMIN), createProduct);
router.put('/:id', authorize(ROLES.SUPERADMIN), updateProduct);
router.delete('/:id', authorize(ROLES.SUPERADMIN), deactivateProduct);

module.exports = router;
