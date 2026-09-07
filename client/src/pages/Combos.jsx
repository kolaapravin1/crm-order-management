import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import * as comboService from '../services/comboService';
import * as productService from '../services/productService';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import { SkeletonTable } from '../components/common/SkeletonLoader';
import { formatCurrency } from '../utils/formatters';

const inputCls =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100';

const EMPTY_FORM = { name: '', description: '', products: [], price: '', discountPercentage: '0', image: '' };

export default function Combos() {
  const [combos, setCombos] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([comboService.listCombos(true), productService.listProducts(true)])
      .then(([c, p]) => {
        setCombos(c);
        setProducts(p);
      })
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      name: c.name,
      description: c.description,
      products: c.products.map((p) => p._id),
      price: c.price,
      discountPercentage: c.discountPercentage,
      image: c.image || '',
    });
    setModalOpen(true);
  };

  const toggleProduct = (id) => {
    setForm((f) => ({
      ...f,
      products: f.products.includes(id) ? f.products.filter((p) => p !== id) : [...f.products, id],
    }));
  };

  const save = async () => {
    if (!form.name || !form.products.length || form.price === '') return toast.error('Name, at least one product and price are required');
    setSaving(true);
    try {
      const payload = { ...form, price: Number(form.price), discountPercentage: Number(form.discountPercentage) };
      if (editing) {
        await comboService.updateCombo(editing._id, payload);
        toast.success('Combo updated');
      } else {
        await comboService.createCombo(payload);
        toast.success('Combo created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (c) => {
    if (c.isActive) {
      setConfirmTarget(c);
      return;
    }
    await comboService.updateCombo(c._id, { isActive: true });
    toast.success('Combo activated');
    load();
  };

  const confirmDeactivate = async () => {
    await comboService.deactivateCombo(confirmTarget._id);
    toast.success('Combo deactivated');
    setConfirmTarget(null);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Combos</h1>
          <p className="text-sm text-slate-500">Bundle products together with combo pricing.</p>
        </div>
        <button onClick={openCreate} className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
          + New Combo
        </button>
      </div>

      {loading ? (
        <SkeletonTable rows={4} cols={5} />
      ) : !combos.length ? (
        <EmptyState title="No combos yet" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-semibold uppercase text-slate-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Included Products</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Final Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {combos.map((c) => (
                <tr key={c._id} className="hover:bg-brand-50/40">
                  <td className="px-4 py-3 font-medium text-slate-800">{c.name}</td>
                  <td className="max-w-[260px] truncate px-4 py-3 text-slate-500">{c.products.map((p) => p.name).join(', ')}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(c.price)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(c.finalPrice)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.isActive ? 'ACTIVE' : 'INACTIVE'} />
                  </td>
                  <td className="space-x-3 px-4 py-3 text-right">
                    <button onClick={() => openEdit(c)} className="text-xs font-semibold text-brand-600 hover:text-brand-800">Edit</button>
                    <button onClick={() => toggleActive(c)} className="text-xs font-semibold text-slate-500 hover:text-slate-800">
                      {c.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Edit Combo' : 'New Combo'}
        footer={
          <>
            <button onClick={() => setModalOpen(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
            <button disabled={saving} onClick={save} className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <input placeholder="Combo name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
          <textarea placeholder="Description" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} />

          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-600">Included Products</p>
            <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2">
              {products.map((p) => (
                <label key={p._id} className="flex items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                  <input type="checkbox" checked={form.products.includes(p._id)} onChange={() => toggleProduct(p._id)} />
                  {p.name}
                </label>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input type="number" placeholder="Combo price" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className={inputCls} />
            <input type="number" placeholder="Discount %" value={form.discountPercentage} onChange={(e) => setForm((f) => ({ ...f, discountPercentage: e.target.value }))} className={inputCls} />
          </div>
          <input placeholder="Image URL (optional)" value={form.image} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} className={inputCls} />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={confirmDeactivate}
        title="Deactivate combo?"
        description="Deactivated combos can no longer be selected in new orders."
        confirmLabel="Deactivate"
        danger
      />
    </div>
  );
}
