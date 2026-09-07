const express = require("express");
const {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
} = require("../controllers/customerController");
const { protect, authorize } = require("../middleware/auth");
const { ROLES } = require("../utils/constants");

const router = express.Router();

router.use(protect, authorize(ROLES.SUPERADMIN));

router.get("/", listCustomers);
router.post("/", createCustomer);
router.get("/:id", getCustomer);
router.put("/:id", updateCustomer);

module.exports = router;
