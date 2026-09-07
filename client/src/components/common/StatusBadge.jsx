import { label as toLabel } from "../../utils/formatters";

const COLOR_MAP = {
  // payment
  PENDING: "bg-amber-100 text-amber-800",
  PARTIAL: "bg-orange-100 text-orange-800",
  PAID: "bg-emerald-100 text-emerald-800",
  FAILED: "bg-red-100 text-red-800",
  REFUNDED: "bg-slate-200 text-slate-700",
  // delivery
  SHIPPED: "bg-blue-100 text-blue-800",
  IN_TRANSIT: "bg-indigo-100 text-indigo-800",
  OUT_FOR_DELIVERY: "bg-purple-100 text-purple-800",
  DELIVERED: "bg-emerald-100 text-emerald-800",
  DELIVERY_FAILED: "bg-red-100 text-red-800",
  // approval / verification / qc
  VERIFIED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  PASSED: "bg-emerald-100 text-emerald-800",
  PACKED: "bg-emerald-100 text-emerald-800",
  // workflow
  ORDER_CREATED: "bg-slate-200 text-slate-700",
  PHOTO_VERIFICATION: "bg-amber-100 text-amber-800",
  PHOTO_REJECTED: "bg-red-100 text-red-800",
  DESIGN: "bg-blue-100 text-blue-800",
  DESIGN_REVISION: "bg-orange-100 text-orange-800",
  PRODUCTION: "bg-indigo-100 text-indigo-800",
  PRODUCTION_REWORK: "bg-orange-100 text-orange-800",
  QC: "bg-cyan-100 text-cyan-800",
  PACKING: "bg-sky-100 text-sky-800",
  DELIVERY: "bg-blue-100 text-blue-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  INACTIVE: "bg-slate-200 text-slate-600",
};

export default function StatusBadge({ status, className = "" }) {
  const color = COLOR_MAP[status] || "bg-slate-200 text-slate-700";
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${color} ${className}`}
    >
      {toLabel(status)}
    </span>
  );
}
