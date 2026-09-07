import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import * as orderService from "../services/orderService";
import { assetUrl } from "../services/api";
import WorkflowTimeline from "../components/orders/WorkflowTimeline";
import StatusBadge from "../components/common/StatusBadge";
import LoadingSpinner from "../components/common/LoadingSpinner";
import { formatCurrency, formatDate } from "../utils/formatters";

export default function CustomerTracking() {
  const { token } = useParams();
  const [order, setOrder] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    orderService
      .getPublicOrder(token)
      .then(setOrder)
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  };

  useEffect(load, [token]);

  const decide = async (decision) => {
    if (decision === "REJECT" && !comment.trim()) {
      toast.error("Please tell us what needs to change");
      return;
    }
    setSubmitting(true);
    try {
      await orderService.submitCustomerApproval(token, decision, comment);
      toast.success(
        decision === "APPROVE"
          ? "Design approved!"
          : "Feedback sent to the team",
      );
      setComment("");
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  if (notFound || !order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 text-center">
        <div>
          <h1 className="text-lg font-bold text-slate-800">Link not found</h1>
          <p className="mt-1 text-sm text-slate-500">
            This tracking link is invalid or has expired.
          </p>
        </div>
      </div>
    );
  }

  const latestDesign =
    order.design?.versions?.[order.design.versions.length - 1];
  const canDecide = order.workflowStage === "CUSTOMER_APPROVAL";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-2xl space-y-6"
      >
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-sm font-bold text-white">
            CO
          </div>
          <h1 className="text-lg font-bold text-slate-900">
            Order {order.orderNumber}
          </h1>
          <p className="text-sm text-slate-500">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <WorkflowTimeline stage={order.workflowStage} />
        </div>

        <div className="grid grid-cols-2 gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-card sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-400">Amount</p>
            <p className="text-sm font-semibold text-slate-800">
              {formatCurrency(order.finalAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Payment</p>
            <StatusBadge status={order.paymentStatus} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Current Stage</p>
            <StatusBadge status={order.workflowStage} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Delivery</p>
            <StatusBadge status={order.deliveryStatus} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="mb-3 text-sm font-semibold text-slate-800">
            Products
          </h2>
          <ul className="space-y-1.5 text-sm text-slate-600">
            {order.items?.map((it, idx) => (
              <li key={idx} className="flex justify-between">
                <span>
                  {it.name} × {it.quantity}
                </span>
                <span className="font-medium text-slate-800">
                  {formatCurrency(it.lineTotal)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {latestDesign && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">
              Design Proof
            </h2>
            <img
              src={assetUrl(latestDesign.url)}
              alt="Design proof"
              className="w-full rounded-xl border border-slate-100 object-contain"
            />

            {canDecide && (
              <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                <p className="text-sm text-slate-600">
                  Please review the design above and let us know if it's
                  approved.
                </p>
                <textarea
                  placeholder="Comments (required if requesting changes)"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
                <div className="flex gap-3">
                  <button
                    disabled={submitting}
                    onClick={() => decide("APPROVE")}
                    className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                  >
                    Approve Design
                  </button>
                  <button
                    disabled={submitting}
                    onClick={() => decide("REJECT")}
                    className="flex-1 rounded-lg border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                  >
                    Request Changes
                  </button>
                </div>
              </div>
            )}

            {order.customerApproval?.status === "APPROVED" && (
              <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                ✓ You approved this design.
              </p>
            )}
          </div>
        )}

        {(order.tracking?.trackingNumber ||
          order.deliveryStatus !== "PENDING") && (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
            <h2 className="mb-3 text-sm font-semibold text-slate-800">
              Delivery Tracking
            </h2>
            <div className="space-y-1 text-sm text-slate-600">
              {order.tracking?.courier && (
                <p>
                  Courier:{" "}
                  <span className="font-medium text-slate-800">
                    {order.tracking.courier}
                  </span>
                </p>
              )}
              {order.tracking?.trackingNumber && (
                <p>
                  Tracking #:{" "}
                  <span className="font-medium text-slate-800">
                    {order.tracking.trackingNumber}
                  </span>
                </p>
              )}
              {order.tracking?.trackingUrl && (
                <a
                  href={order.tracking.trackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block font-medium text-brand-600 hover:underline"
                >
                  Track Shipment →
                </a>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
