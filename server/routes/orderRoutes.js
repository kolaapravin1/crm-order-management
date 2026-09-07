const express = require("express");
const {
  listOrders,
  getOrder,
  createOrder,
  updateOrder,
  updateStage,
  deleteOrder,
  updatePaymentStatus,
  uploadPhotoFiles,
  setPhotoVerificationStatus,
  uploadDesignVersion,
  updateProduction,
  updateQC,
  updatePacking,
  updateTracking,
} = require("../controllers/orderController");
const { protect, authorize } = require("../middleware/auth");
const { ROLES } = require("../utils/constants");
const { makeUploader } = require("../middleware/upload");

const router = express.Router();
const photoUploader = makeUploader("photos");
const designUploader = makeUploader("design");

router.use(protect);

router.get("/", listOrders);
router.post("/", createOrder);
router.get("/:id", getOrder);
router.put("/:id", updateOrder);
router.patch("/:id/stage", authorize(ROLES.SUPERADMIN), updateStage);
router.delete("/:id", authorize(ROLES.SUPERADMIN), deleteOrder);

router.patch("/:id/payment", updatePaymentStatus);

router.patch(
  "/:id/photo-verification/upload",
  photoUploader.array("files", 10),
  uploadPhotoFiles,
);
router.patch("/:id/photo-verification/status", setPhotoVerificationStatus);

router.patch(
  "/:id/design/upload",
  designUploader.single("file"),
  uploadDesignVersion,
);

router.patch("/:id/production", updateProduction);
router.patch("/:id/qc", updateQC);
router.patch("/:id/packing", updatePacking);

router.patch("/:id/tracking", authorize(ROLES.SUPERADMIN), updateTracking);

module.exports = router;
