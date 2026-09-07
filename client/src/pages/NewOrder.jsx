import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import * as customerService from "../services/customerService";
import * as productService from "../services/productService";
import * as comboService from "../services/comboService";
import * as userService from "../services/userService";
import * as orderService from "../services/orderService";
import { useAuth } from "../hooks/useAuth";
import { formatCurrency } from "../utils/formatters";
import Modal from "../components/common/Modal";

function lineFinal(unitPrice, discountPercentage, quantity) {
  const unitFinal = unitPrice - (unitPrice * discountPercentage) / 100;
  return Math.round(unitFinal * quantity * 100) / 100;
}

export default function NewOrder() {
  const navigate = useNavigate();
  const { user, isSuperadmin } = useAuth();

  const [customerMode, setCustomerMode] = useState(
    isSuperadmin ? "existing" : "new",
  );
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerOptions, setCustomerOptions] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });

  const [catalog, setCatalog] = useState({ products: [], combos: [] });
  const [items, setItems] = useState([]);
  const [pickerValue, setPickerValue] = useState("");

  const [ambassadorId, setAmbassadorId] = useState("");
  const [teamId, setTeamId] = useState("");
  const [admins, setAdmins] = useState([]);
  const [assignedAdmin, setAssignedAdmin] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);

  useEffect(() => {
    if (!isSuperadmin) {
      setCustomerMode("new");
      setAmbassadorId(user?.ambassadorId || "");
      setTeamId(user?.teamId || "");
    }
  }, [isSuperadmin, user]);

  useEffect(() => {
    Promise.all([
      productService.listProducts(),
      comboService.listCombos(),
    ]).then(([products, combos]) => setCatalog({ products, combos }));
    if (isSuperadmin) userService.listAdmins().then(setAdmins);
  }, [isSuperadmin]);

  useEffect(() => {
    if (!isSuperadmin || !customerSearch) return setCustomerOptions([]);
    const t = setTimeout(() => {
      customerService
        .listCustomers({ search: customerSearch, limit: 6 })
        .then((r) => setCustomerOptions(r.customers));
    }, 250);
    return () => clearTimeout(t);
  }, [customerSearch, isSuperadmin]);

  const catalogOptions = useMemo(
    () => [
      ...catalog.products.map((p) => ({
        id: `PRODUCT:${p._id}`,
        itemType: "PRODUCT",
        refId: p._id,
        name: p.name,
        price: p.price,
        discountPercentage: p.discountPercentage,
      })),
      ...catalog.combos.map((c) => ({
        id: `COMBO:${c._id}`,
        itemType: "COMBO",
        refId: c._id,
        name: c.name,
        price: c.price,
        discountPercentage: c.discountPercentage,
      })),
    ],
    [catalog],
  );

  const addItem = () => {
    if (!pickerValue) return;
    const opt = catalogOptions.find((o) => o.id === pickerValue);
    if (!opt) return;
    if (
      items.some((i) => i.refId === opt.refId && i.itemType === opt.itemType)
    ) {
      toast.error("Item already added");
      return;
    }
    setItems((prev) => [...prev, { ...opt, quantity: 1 }]);
    setPickerValue("");
  };

  const updateQuantity = (idx, qty) => {
    setItems((prev) =>
      prev.map((it, i) =>
        i === idx ? { ...it, quantity: Math.max(1, Number(qty) || 1) } : it,
      ),
    );
  };

  const removeItem = (idx) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));

  const totals = useMemo(() => {
    const amount = items.reduce((s, i) => s + i.price * i.quantity, 0);
    const finalAmount = items.reduce(
      (s, i) => s + lineFinal(i.price, i.discountPercentage, i.quantity),
      0,
    );
    return {
      amount: Math.round(amount * 100) / 100,
      finalAmount: Math.round(finalAmount * 100) / 100,
    };
  }, [items]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    if (!ambassadorId || !teamId)
      return toast.error("Ambassador ID and Team ID are required");
    if (!items.length) return toast.error("Add at least one product or combo");
    if (isSuperadmin && customerMode === "existing" && !selectedCustomer)
      return toast.error("Select a customer");
    if (
      customerMode === "new" &&
      (!newCustomer.name || !newCustomer.phone || !newCustomer.address)
    ) {
      return toast.error("New customer requires name, phone and address");
    }

    setSubmitting(true);
    try {
      const payload = {
        ambassadorId: ambassadorId.toUpperCase(),
        teamId: teamId.toUpperCase(),
        items: items.map((i) => ({
          itemType: i.itemType,
          refId: i.refId,
          quantity: i.quantity,
        })),
        internalNotes,
        ...(assignedAdmin && { assignedAdmin }),
        ...(isSuperadmin && customerMode === "existing"
          ? { customer: selectedCustomer._id }
          : { newCustomer }),
      };
      const order = await orderService.createOrder(payload);
      toast.success(`Order ${order.orderNumber} created`);
      setCreatedOrder(order);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create order");
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls =
    "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";
  const labelCls = "mb-1.5 block text-xs font-medium text-slate-600";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Create New Order</h1>
        <p className="text-sm text-slate-500">
          Select a customer, choose products or combos, and confirm pricing.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-card"
        >
          <h2 className="mb-4 text-sm font-semibold text-slate-800">
            Customer
          </h2>
          {isSuperadmin && (
            <div className="mb-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => setCustomerMode("existing")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${customerMode === "existing" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                Existing Customer
              </button>
              <button
                type="button"
                onClick={() => setCustomerMode("new")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${customerMode === "new" ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}
              >
                New Customer
              </button>
            </div>
          )}

          {isSuperadmin && customerMode === "existing" ? (
            <div className="relative">
              <input
                value={
                  selectedCustomer
                    ? `${selectedCustomer.name} — ${selectedCustomer.phone}`
                    : customerSearch
                }
                onChange={(e) => {
                  setSelectedCustomer(null);
                  setCustomerSearch(e.target.value);
                }}
                placeholder="Search by name, phone or email…"
                className={inputCls}
              />
              {!selectedCustomer && customerOptions.length > 0 && (
                <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-soft">
                  {customerOptions.map((c) => (
                    <button
                      type="button"
                      key={c._id}
                      onClick={() => {
                        setSelectedCustomer(c);
                        setCustomerOptions([]);
                      }}
                      className="block w-full px-4 py-2.5 text-left text-sm hover:bg-brand-50"
                    >
                      <span className="font-medium text-slate-800">
                        {c.name}
                      </span>{" "}
                      <span className="text-slate-400">— {c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>Name</label>
                <input
                  className={inputCls}
                  value={newCustomer.name}
                  onChange={(e) =>
                    setNewCustomer((c) => ({ ...c, name: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className={labelCls}>Phone</label>
                <input
                  className={inputCls}
                  value={newCustomer.phone}
                  onChange={(e) =>
                    setNewCustomer((c) => ({ ...c, phone: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input
                  className={inputCls}
                  value={newCustomer.email}
                  onChange={(e) =>
                    setNewCustomer((c) => ({ ...c, email: e.target.value }))
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <label className={labelCls}>Delivery Address</label>
                <textarea
                  className={inputCls}
                  rows={2}
                  value={newCustomer.address}
                  onChange={(e) =>
                    setNewCustomer((c) => ({ ...c, address: e.target.value }))
                  }
                />
              </div>
            </div>
          )}
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-card"
        >
          <h2 className="mb-4 text-sm font-semibold text-slate-800">
            Ambassador &amp; Team
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Ambassador ID</label>
              <input
                readOnly={!isSuperadmin}
                className={`${inputCls} ${!isSuperadmin ? "bg-slate-100 text-slate-500" : ""}`}
                placeholder="e.g. VM26-A07"
                value={ambassadorId}
                onChange={(e) => setAmbassadorId(e.target.value)}
              />
              {!isSuperadmin && !ambassadorId && (
                <p className="mt-1 text-xs text-amber-600">
                  Ask the superadmin to assign your Ambassador ID.
                </p>
              )}
            </div>
            <div>
              <label className={labelCls}>Team ID</label>
              <input
                readOnly={!isSuperadmin}
                className={`${inputCls} ${!isSuperadmin ? "bg-slate-100 text-slate-500" : ""}`}
                placeholder="e.g. VM26-T03"
                value={teamId}
                onChange={(e) => setTeamId(e.target.value)}
              />
              {!isSuperadmin && !teamId && (
                <p className="mt-1 text-xs text-amber-600">
                  Ask the superadmin to assign your Team ID.
                </p>
              )}
            </div>
            {isSuperadmin && (
              <div className="sm:col-span-2">
                <label className={labelCls}>Assign to Admin</label>
                <select
                  className={inputCls}
                  value={assignedAdmin}
                  onChange={(e) => setAssignedAdmin(e.target.value)}
                >
                  <option value="">Myself (Superadmin)</option>
                  {admins.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-card"
        >
          <h2 className="mb-4 text-sm font-semibold text-slate-800">
            Products &amp; Combos
          </h2>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <select
              className={inputCls}
              value={pickerValue}
              onChange={(e) => setPickerValue(e.target.value)}
            >
              <option value="">Select a product or combo…</option>
              <optgroup label="Products">
                {catalog.products.map((p) => (
                  <option key={p._id} value={`PRODUCT:${p._id}`}>
                    {p.name} — {formatCurrency(p.price)}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Combos">
                {catalog.combos.map((c) => (
                  <option key={c._id} value={`COMBO:${c._id}`}>
                    {c.name} — {formatCurrency(c.price)}
                  </option>
                ))}
              </optgroup>
            </select>
            <button
              type="button"
              onClick={addItem}
              className="shrink-0 rounded-lg bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900"
            >
              Add
            </button>
          </div>

          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-200 py-6 text-center text-sm text-slate-400">
              No items added yet
            </p>
          ) : (
            <div className="space-y-2">
              {items.map((it, idx) => (
                <div
                  key={it.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5"
                >
                  <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-400 ring-1 ring-slate-200">
                    {it.itemType}
                  </span>
                  <span className="flex-1 truncate text-sm font-medium text-slate-800">
                    {it.name}
                  </span>
                  {it.discountPercentage > 0 && (
                    <span className="text-xs font-semibold text-emerald-600">
                      -{it.discountPercentage}%
                    </span>
                  )}
                  <input
                    type="number"
                    min={1}
                    value={it.quantity}
                    onChange={(e) => updateQuantity(idx, e.target.value)}
                    className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm"
                  />
                  <span className="w-24 text-right text-sm font-semibold text-slate-800">
                    {formatCurrency(
                      lineFinal(it.price, it.discountPercentage, it.quantity),
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="text-slate-400 hover:text-red-500"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex justify-end border-t border-slate-100 pt-4">
            <div className="w-56 space-y-1 text-sm">
              <div className="flex justify-between text-slate-500">
                <span>Original Amount</span>
                <span>{formatCurrency(totals.amount)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900">
                <span>Final Amount</span>
                <span>{formatCurrency(totals.finalAmount)}</span>
              </div>
            </div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-slate-200 bg-white p-5 shadow-card"
        >
          <label className={labelCls}>
            Internal Notes (not visible to customer)
          </label>
          <textarea
            className={inputCls}
            rows={3}
            value={internalNotes}
            onChange={(e) => setInternalNotes(e.target.value)}
          />
        </motion.section>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {submitting ? "Creating…" : "Create Order"}
          </button>
        </div>
      </form>
      <Modal
        open={!!createdOrder}
        onClose={() => setCreatedOrder(null)}
        title="Order link ready"
        footer={
          <button
            onClick={() => {
              setCreatedOrder(null);
              navigate(`/orders/${createdOrder?._id}`);
            }}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Open Order
          </button>
        }
      >
        {createdOrder && <OrderLinkActions order={createdOrder} />}
      </Modal>
    </div>
  );
}

function OrderLinkActions({ order }) {
  const link = `${window.location.origin}/order/${order.customerToken}`;
  const copy = async () => {
    await navigator.clipboard.writeText(link);
    toast.success("Order link copied");
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-600">
        Send this link manually to the customer.
      </p>
      <input
        readOnly
        value={link}
        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600"
      />
      <div className="flex flex-wrap gap-3">
        <button
          onClick={copy}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Copy link
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Welcome to MindFul Photography!\n\nPlease find your order details below.\nOrder number: ${order.orderNumber}\n\nUse the link below to track your order status:\n${link}\n\nThank you for choosing MindFul Photography.`)}`}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Share on WhatsApp
        </a>
      </div>
      <p className="text-xs text-slate-400">
        WhatsApp sharing opens WhatsApp with a prefilled message.
      </p>
    </div>
  );
}
