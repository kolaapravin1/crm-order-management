import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import * as productService from '../services/productService';
import Modal from '../components/common/Modal';
import ConfirmDialog from '../components/common/ConfirmDialog';
import StatusBadge from '../components/common/StatusBadge';
import EmptyState from '../components/common/EmptyState';
import { SkeletonTable } from '../components/common/SkeletonLoader';
import { formatCurrency } from '../utils/formatters';

const inputCls =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100';

const EMPTY_FORM = { name: '', sku: '', description: '', price: '', discountPercentage: '0', image: '' };

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState(null);

  const load = () => {
    setLoading(true);
    productService
      .listProducts(true)
      .then(setProducts)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (p) => {
    setEditing(p);
    setForm({ name: p.name, sku: p.sku, description: p.description, price: p.price, discountPercentage: p.discountPercentage, image: p.image || '' });
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name || !form.sku || form.price === '') return toast.error('Name, SKU and price are required');
    setSaving(true);
    try {
      const payload = { ...form, price: Number(form.price), discountPercentage: Number(form.discountPercentage) };
      if (editing) {
        await productService.updateProduct(editing._id, payload);
        toast.success('Product updated');
      } else {
        await productService.createProduct(payload);
        toast.success('Product created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p) => {
    if (p.isActive) {
      setConfirmTarget(p);
      return;
    }
    await productService.updateProduct(p._id, { isActive: true });
    toast.success('Product activated');
    load();
  };

  const confirmDeactivate = async () => {
    await productService.deactivateProduct(confirmTarget._id);
    toast.success('Product deactivated');
    setConfirmTarget(null);
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Products</h1>
          <p className="text-sm text-slate-500">Master catalog and pricing. Admins can only select active items.</p>
        </div>
        <button onClick={openCreate} className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
          + New Product
        </button>
      </div>

      {loading ? (
        <SkeletonTable rows={5} cols={6} />
      ) : !products.length ? (
        <EmptyState title="No products yet" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-semibold uppercase text-slate-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Discount</th>
                <th className="px-4 py-3 text-right">Final Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((p) => (
                <tr key={p._id} className="hover:bg-brand-50/40">
                  <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                  <td className="px-4 py-3 text-slate-500">{p.sku}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(p.price)}</td>
                  <td className="px-4 py-3 text-right text-emerald-600">{p.discountPercentage}%</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCurrency(p.finalPrice)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.isActive ? 'ACTIVE' : 'INACTIVE'} />
                  </td>
                  <td className="space-x-3 px-4 py-3 text-right">
                    <button onClick={() => openEdit(p)} className="text-xs font-semibold text-brand-600 hover:text-brand-800">Edit</button>
                    <button onClick={() => toggleActive(p)} className="text-xs font-semibold text-slate-500 hover:text-slate-800">
                      {p.isActive ? 'Deactivate' : 'Activate'}
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
        title={editing ? 'Edit Product' : 'New Product'}
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
          <input placeholder="Product name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className={inputCls} />
          <input placeholder="SKU" value={form.sku} onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))} className={inputCls} />
          <textarea placeholder="Description" rows={2} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={inputCls} />
          <div className="grid grid-cols-2 gap-3">
            <input type="number" placeholder="Base price" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className={inputCls} />
            <input type="number" placeholder="Discount %" value={form.discountPercentage} onChange={(e) => setForm((f) => ({ ...f, discountPercentage: e.target.value }))} className={inputCls} />
          </div>
          <input placeholder="Image URL (optional)" value={form.image} onChange={(e) => setForm((f) => ({ ...f, image: e.target.value }))} className={inputCls} />
        </div>
      </Modal>

      <ConfirmDialog
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={confirmDeactivate}
        title="Deactivate product?"
        description="Deactivated products can no longer be selected in new orders, but existing orders keep their historical pricing."
        confirmLabel="Deactivate"
        danger
      />
    </div>
  );
}
