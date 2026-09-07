import { useCallback, useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import * as orderService from "../services/orderService";
import * as auditService from "../services/auditService";
import { assetUrl } from "../services/api";
import { useAuth } from "../hooks/useAuth";
import WorkflowTimeline from "../components/orders/WorkflowTimeline";
import StatusBadge from "../components/common/StatusBadge";
import LoadingSpinner from "../components/common/LoadingSpinner";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  label,
  WORKFLOW_MAIN_SEQUENCE,
} from "../utils/formatters";

const PAYMENT_OPTIONS = ["PENDING", "PARTIAL", "PAID", "FAILED", "REFUNDED"];
const DELIVERY_OPTIONS = [
  "PENDING",
  "SHIPPED",
  "IN_TRANSIT",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "DELIVERY_FAILED",
];

function Section({ title, children, className = "" }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-card ${className}`}
    >
      <h2 className="mb-4 text-sm font-semibold text-slate-800">{title}</h2>
      {children}
    </motion.section>
  );
}

const inputCls =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";
const btnPrimary =
  "rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50";
const btnDanger =
  "rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50";
const btnGhost =
  "rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50";

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isSuperadmin } = useAuth();
  const [order, setOrder] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    const auditRequest = isSuperadmin
      ? auditService.listAuditLogs({ entityId: id, limit: 50 })
      : Promise.resolve({ logs: [] });
    Promise.all([orderService.getOrder(id), auditRequest])
      .then(([o, l]) => {
        setOrder(o);
        setLogs(l.logs);
      })
      .catch(() => toast.error("Failed to load order"))
      .finally(() => setLoading(false));
  }, [id, isSuperadmin]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (fn, successMsg) => {
    setBusy(true);
    try {
      await fn();
      toast.success(successMsg);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !order) {
    return (
      <div className="flex h-64 items-center justify-center">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  const stage = order.workflowStage;
  const stageOptions = [...new Set([stage, ...WORKFLOW_MAIN_SEQUENCE])];
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <button
        onClick={() => navigate("/orders")}
        className="text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        ← Back to Orders
      </button>

      <Section title="">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-slate-900">
                {order.orderNumber}
              </h1>
              <StatusBadge status={stage} />
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {order.customer?.name} · {order.ambassadorId} / {order.teamId}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={order.paymentStatus}
              disabled={busy}
              onChange={(e) =>
                run(
                  () =>
                    orderService.updatePaymentStatus(order._id, e.target.value),
                  "Payment status updated",
                )
              }
              className={inputCls}
            >
              {PAYMENT_OPTIONS.map((p) => (
                <option key={p} value={p}>
                  {label(p)} (Payment)
                </option>
              ))}
            </select>
            {isSuperadmin && (
              <select
                value={stage}
                disabled={busy}
                onChange={(e) =>
                  run(
                    () => orderService.updateStage(order._id, e.target.value),
                    "Order status updated",
                  )
                }
                className={inputCls}
              >
                {stageOptions.map((value) => (
                  <option key={value} value={value}>
                    {label(value)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5 sm:grid-cols-4">
          <div>
            <p className="text-xs text-slate-400">Final Amount</p>
            <p className="text-sm font-semibold text-slate-800">
              {formatCurrency(order.finalAmount)}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Payment Status</p>
            <StatusBadge status={order.paymentStatus} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Delivery Status</p>
            <StatusBadge status={order.deliveryStatus} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Assigned Admin</p>
            <p className="text-sm font-semibold text-slate-800">
              {order.assignedAdmin?.name || "—"}
            </p>
          </div>
        </div>
      </Section>

      <Section title="Workflow">
        <WorkflowTimeline stage={stage} />
      </Section>

      {isSuperadmin && (
        <Section title="Customer & Delivery">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-slate-400">Name</p>
              <p className="text-sm text-slate-800">{order.customer?.name}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Phone</p>
              <p className="text-sm text-slate-800">{order.customer?.phone}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Email</p>
              <p className="text-sm text-slate-800">
                {order.customer?.email || "—"}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Delivery Address</p>
              <p className="text-sm text-slate-800">
                {order.customer?.address}
              </p>
            </div>
          </div>
        </Section>
      )}

      <Section title="Products & Pricing">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase text-slate-400">
                <th className="pb-2">Item</th>
                <th className="pb-2">Type</th>
                <th className="pb-2 text-center">Qty</th>
                <th className="pb-2 text-right">Unit Price</th>
                <th className="pb-2 text-right">Discount</th>
                <th className="pb-2 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.items.map((it, idx) => (
                <tr key={idx}>
                  <td className="py-2 font-medium text-slate-800">{it.name}</td>
                  <td className="py-2 text-slate-500">{it.itemType}</td>
                  <td className="py-2 text-center">{it.quantity}</td>
                  <td className="py-2 text-right">
                    {formatCurrency(it.unitPrice)}
                  </td>
                  <td className="py-2 text-right text-emerald-600">
                    {it.discountPercentage}%
                  </td>
                  <td className="py-2 text-right font-semibold">
                    {formatCurrency(it.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex justify-end gap-8 border-t border-slate-100 pt-3 text-sm">
          <span className="text-slate-500">
            Original: {formatCurrency(order.amount)}
          </span>
          <span className="font-bold text-slate-900">
            Final: {formatCurrency(order.finalAmount)}
          </span>
        </div>
      </Section>

      <PhotoVerificationSection
        order={order}
        run={run}
        busy={busy}
        isSuperadmin={isSuperadmin}
      />
      <DesignSection
        order={order}
        run={run}
        busy={busy}
        isSuperadmin={isSuperadmin}
      />
      <ProductionSection
        order={order}
        run={run}
        busy={busy}
        isSuperadmin={isSuperadmin}
      />
      <QCSection
        order={order}
        run={run}
        busy={busy}
        isSuperadmin={isSuperadmin}
      />
      <PackingSection
        order={order}
        run={run}
        busy={busy}
        isSuperadmin={isSuperadmin}
      />
      {isSuperadmin && <DeliverySection order={order} run={run} busy={busy} />}

      {isSuperadmin && (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            const reason = window.prompt("Why should this order be deleted?");
            if (!reason?.trim()) return;
            await run(
              () => orderService.deleteOrder(order._id, reason),
              "Order deleted",
            );
            navigate("/orders");
          }}
          className={`${btnDanger} w-full sm:w-auto`}
        >
          Delete Order
        </button>
      )}

      <Section title="Internal Notes (not visible to customer)">
        <NotesForm order={order} run={run} busy={busy} />
      </Section>

      <Section title="Activity History">
        <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
          {logs.length === 0 && (
            <p className="text-sm text-slate-400">No activity recorded yet.</p>
          )}
          {logs.map((l) => (
            <div
              key={l._id}
              className="flex items-start gap-3 border-b border-slate-50 pb-3 last:border-0"
            >
              <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-700">
                  <span className="font-semibold">{l.userName}</span> —{" "}
                  {label(l.action)}
                </p>
                <p className="text-xs text-slate-400">
                  {formatDateTime(l.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

function NotesForm({ order, run, busy }) {
  const [notes, setNotes] = useState(order.internalNotes || "");
  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-start">
      <textarea
        className={inputCls}
        rows={3}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <button
        disabled={busy}
        onClick={() =>
          run(
            () => orderService.updateOrder(order._id, { internalNotes: notes }),
            "Notes updated",
          )
        }
        className={`${btnPrimary} self-end sm:self-auto`}
      >
        Save
      </button>
    </div>
  );
}

function PhotoVerificationSection({ order, run, busy, isSuperadmin }) {
  const [notes, setNotes] = useState("");
  const canUpload =
    isSuperadmin &&
    ["PHOTO_VERIFICATION", "PHOTO_REJECTED"].includes(order.workflowStage);
  const canDecide =
    isSuperadmin && order.workflowStage === "PHOTO_VERIFICATION";

  return (
    <Section title="Photo Verification">
      <div className="mb-4 flex items-center gap-3">
        <StatusBadge status={order.photoVerification.status} />
        {order.photoVerification.notes && (
          <p className="text-xs text-slate-500">
            {order.photoVerification.notes}
          </p>
        )}
      </div>

      {order.photoVerification.files.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-3">
          {order.photoVerification.files.map((f) => (
            <a
              key={f._id}
              href={assetUrl(f.url)}
              target="_blank"
              rel="noreferrer"
              className="block h-20 w-20 overflow-hidden rounded-lg border border-slate-200"
            >
              <img
                src={assetUrl(f.url)}
                alt="verification"
                className="h-full w-full object-cover"
              />
            </a>
          ))}
        </div>
      )}

      {canUpload && (
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="file"
            multiple
            accept="image/*"
            disabled={busy}
            onChange={(e) =>
              e.target.files.length &&
              run(
                () => orderService.uploadPhotoFiles(order._id, e.target.files),
                "Photos uploaded",
              )
            }
            className="text-sm"
          />
        </div>
      )}

      {canDecide && (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
          <input
            placeholder="Notes (required for rejection)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`${inputCls} max-w-xs`}
          />
          <button
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  orderService.setPhotoVerificationStatus(
                    order._id,
                    "VERIFIED",
                    notes,
                  ),
                "Photos verified",
              )
            }
            className={btnPrimary}
          >
            Verify
          </button>
          <button
            disabled={busy}
            onClick={() =>
              run(
                () =>
                  orderService.setPhotoVerificationStatus(
                    order._id,
                    "REJECTED",
                    notes,
                  ),
                "Photos rejected",
              )
            }
            className={btnDanger}
          >
            Reject
          </button>
        </div>
      )}
    </Section>
  );
}

function DesignSection({ order, run, busy, isSuperadmin }) {
  const canUpload = isSuperadmin && order.workflowStage === "DESIGN";
  return (
    <Section title="Design">
      {order.design.versions.length === 0 ? (
        <p className="text-sm text-slate-400">
          No design has been uploaded yet.
        </p>
      ) : (
        <div className="mb-4 flex flex-wrap gap-3">
          {order.design.versions.map((v) => (
            <a
              key={v._id}
              href={assetUrl(v.url)}
              target="_blank"
              rel="noreferrer"
              className="group relative block h-28 w-28 overflow-hidden rounded-lg border border-slate-200"
            >
              <img
                src={assetUrl(v.url)}
                alt={`v${v.version}`}
                className="h-full w-full object-cover"
              />
              <span className="absolute bottom-0 left-0 right-0 bg-slate-900/70 px-2 py-1 text-center text-[11px] font-semibold text-white">
                v{v.version} {v.locked && "🔒"}
              </span>
            </a>
          ))}
        </div>
      )}
      {canUpload && (
        <input
          type="file"
          accept="image/*,application/pdf"
          disabled={busy}
          onChange={(e) =>
            e.target.files[0] &&
            run(
              () =>
                orderService.uploadDesignVersion(order._id, e.target.files[0]),
              "Design uploaded",
            )
          }
          className="text-sm"
        />
      )}
    </Section>
  );
}

function ApprovalSection({ order }) {
  const a = order.customerApproval;
  return (
    <Section title="Customer Approval">
      <div className="flex flex-wrap items-center gap-4">
        <StatusBadge status={a.status} />
        {a.timestamp && (
          <span className="text-xs text-slate-400">
            {formatDateTime(a.timestamp)}
          </span>
        )}
        {a.approvedVersion && (
          <span className="text-xs text-slate-500">
            Approved version: v{a.approvedVersion}
          </span>
        )}
      </div>
      {a.comment && (
        <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <span className="font-semibold">Customer comment: </span>
          {a.comment}
        </div>
      )}
      {order.workflowStage === "CUSTOMER_APPROVAL" && (
        <p className="mt-3 text-xs text-slate-400">
          Waiting for the customer to approve or reject via their secure order
          link.
        </p>
      )}
    </Section>
  );
}

function ProductionSection({ order, run, busy, isSuperadmin }) {
  const active =
    isSuperadmin &&
    ["PRODUCTION", "PRODUCTION_REWORK"].includes(order.workflowStage);
  const [notes, setNotes] = useState(order.production.notes || "");
  return (
    <Section title="Production">
      <div className="mb-4 flex items-center gap-3">
        <StatusBadge status={order.production.status} />
        {order.workflowStage === "PRODUCTION_REWORK" && (
          <span className="text-xs font-semibold text-amber-600">
            Rework in progress
          </span>
        )}
      </div>
      {active && (
        <div className="flex flex-wrap items-center gap-3">
          <input
            placeholder="Production notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className={`${inputCls} max-w-xs`}
          />
          {["STARTED", "IN_PROGRESS", "COMPLETED"].map((s) => (
            <button
              key={s}
              disabled={busy}
              onClick={() =>
                run(
                  () => orderService.updateProduction(order._id, s, notes),
                  `Production marked ${label(s)}`,
                )
              }
              className={btnGhost}
            >
              {label(s)}
            </button>
          ))}
        </div>
      )}
    </Section>
  );
}

function QCSection({ order, run, busy, isSuperadmin }) {
  const [reason, setReason] = useState("");
  const active = isSuperadmin && order.workflowStage === "QC";
  return (
    <Section title="Quality Check (QC)">
      <div className="mb-4 flex items-center gap-3">
        <StatusBadge status={order.qc.status} />
        {order.qc.reason && (
          <span className="text-xs text-red-600">
            Reason: {order.qc.reason}
          </span>
        )}
      </div>
      {active && (
        <div className="flex flex-wrap items-center gap-3">
          <input
            placeholder="Failure reason (required to fail)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className={`${inputCls} max-w-xs`}
          />
          <button
            disabled={busy}
            onClick={() =>
              run(() => orderService.updateQC(order._id, "PASSED"), "QC passed")
            }
            className={btnPrimary}
          >
            Pass
          </button>
          <button
            disabled={busy}
            onClick={() =>
              run(
                () => orderService.updateQC(order._id, "FAILED", reason),
                "QC failed, sent back to production",
              )
            }
            className={btnDanger}
          >
            Fail
          </button>
        </div>
      )}
    </Section>
  );
}

function PackingSection({ order, run, busy, isSuperadmin }) {
  const active = isSuperadmin && order.workflowStage === "PACKING";
  return (
    <Section title="Packing">
      <div className="mb-4 flex items-center gap-3">
        <StatusBadge status={order.packing.status} />
      </div>
      {active && (
        <button
          disabled={busy}
          onClick={() =>
            run(
              () => orderService.updatePacking(order._id),
              "Order marked as packed",
            )
          }
          className={btnPrimary}
        >
          Mark as Packed
        </button>
      )}
    </Section>
  );
}

function DeliverySection({ order, run, busy }) {
  const [form, setForm] = useState({
    deliveryStatus: order.deliveryStatus,
  });

  return (
    <Section title="Delivery Status">
      <div className="mb-4 flex items-center gap-3">
        <StatusBadge status={order.deliveryStatus} />
      </div>
      <div className="flex flex-wrap gap-3">
        <select
          value={form.deliveryStatus}
          onChange={(e) =>
            setForm((f) => ({ ...f, deliveryStatus: e.target.value }))
          }
          className={inputCls}
        >
          {DELIVERY_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
        </select>
        <button
          disabled={busy}
          onClick={() =>
            run(
              () =>
                orderService.updateTracking(order._id, {
                  deliveryStatus: form.deliveryStatus,
                }),
              "Delivery status updated",
            )
          }
          className={btnPrimary}
        >
          Save Delivery Status
        </button>
        {order.workflowStage !== "COMPLETED" && (
          <button
            disabled={busy}
            onClick={() =>
              run(
                () => orderService.updateStage(order._id, "COMPLETED"),
                "Order completed",
              )
            }
            className={btnGhost}
          >
            Complete Order
          </button>
        )}
      </div>
    </Section>
  );
}
