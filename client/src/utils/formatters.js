export const formatCurrency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount || 0);

export const formatDate = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

export const formatDateTime = (date) => {
  if (!date) return "—";
  return new Date(date).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const WORKFLOW_LABELS = {
  ORDER_CREATED: "Order Created",
  PHOTO_VERIFICATION: "Photo Verification",
  PHOTO_REJECTED: "Photo Rejected",
  DESIGN: "Design",
  DESIGN_REVISION: "Design Revision",
  PRODUCTION: "Production",
  PRODUCTION_REWORK: "Production Rework",
  QC: "Quality Check",
  PACKING: "Packing",
  DELIVERY: "Delivery",
  COMPLETED: "Completed",
};

export const WORKFLOW_MAIN_SEQUENCE = [
  "ORDER_CREATED",
  "PHOTO_VERIFICATION",
  "DESIGN",
  "PRODUCTION",
  "QC",
  "PACKING",
  "DELIVERY",
  "COMPLETED",
];

// Maps a revision/rejection sub-state onto the main-sequence step it belongs under,
// so the timeline UI can highlight the right node even while in a revision loop.
export const REVISION_TO_MAIN = {
  PHOTO_REJECTED: "PHOTO_VERIFICATION",
  DESIGN_REVISION: "DESIGN",
  PRODUCTION_REWORK: "PRODUCTION",
};

export const label = (value = "") =>
  value
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
