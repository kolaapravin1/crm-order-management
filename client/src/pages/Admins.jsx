import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import * as userService from "../services/userService";
import Modal from "../components/common/Modal";
import StatusBadge from "../components/common/StatusBadge";
import EmptyState from "../components/common/EmptyState";
import { SkeletonTable } from "../components/common/SkeletonLoader";
import { formatDate } from "../utils/formatters";

const inputCls =
  "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";

const EMPTY_FORM = {
  name: "",
  email: "",
  password: "",
  ambassadorId: "",
  teamId: "",
};

export default function Admins() {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const load = () => {
    setLoading(true);
    userService
      .listAdmins()
      .then(setAdmins)
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (a) => {
    setEditing(a);
    setForm({
      name: a.name,
      email: a.email,
      password: "",
      ambassadorId: a.ambassadorId || "",
      teamId: a.teamId || "",
    });
    setShowPassword(false);
    setModalOpen(true);
  };

  const save = async () => {
    if (!form.name || !form.email || (!editing && !form.password))
      return toast.error("Name, email and password are required");
    setSaving(true);
    try {
      if (editing) {
        const payload = {
          name: form.name,
          email: form.email,
          ambassadorId: form.ambassadorId,
          teamId: form.teamId,
        };
        if (form.password) payload.password = form.password;
        await userService.updateAdmin(editing._id, payload);
        toast.success("Admin updated");
      } else {
        await userService.createAdmin({
          ...form,
          ambassadorId: form.ambassadorId.toUpperCase(),
          teamId: form.teamId.toUpperCase(),
        });
        toast.success("Admin created");
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleStatus = async (a) => {
    await userService.setAdminStatus(a._id, !a.isActive);
    toast.success(a.isActive ? "Admin disabled" : "Admin enabled");
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Admin Accounts</h1>
          <p className="text-sm text-slate-500">
            Create and manage day-to-day order processing accounts.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700"
        >
          + New Admin
        </button>
      </div>

      {loading ? (
        <SkeletonTable rows={4} cols={4} />
      ) : !admins.length ? (
        <EmptyState title="No admin accounts yet" />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-semibold uppercase text-slate-500">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Ambassador / Team</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admins.map((a) => (
                <tr key={a._id} className="hover:bg-brand-50/40">
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {a.name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{a.email}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {a.ambassadorId || "—"} / {a.teamId || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={a.isActive ? "ACTIVE" : "INACTIVE"} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {formatDate(a.createdAt)}
                  </td>
                  <td className="space-x-3 px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(a)}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-800"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => toggleStatus(a)}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-800"
                    >
                      {a.isActive ? "Disable" : "Enable"}
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
        title={editing ? "Edit Admin" : "New Admin"}
        footer={
          <>
            <button
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              disabled={saving}
              onClick={save}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <input
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            className={inputCls}
          />
          <input
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            className={inputCls}
          />
          <input
            type={showPassword ? "text" : "password"}
            placeholder={
              editing
                ? "New password (leave blank to keep current)"
                : "Password"
            }
            value={form.password}
            onChange={(e) =>
              setForm((f) => ({ ...f, password: e.target.value }))
            }
            className={inputCls}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="text-xs font-medium text-brand-600"
          >
            {showPassword ? "Hide password" : "Show password"}
          </button>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input
              placeholder="Ambassador ID (optional)"
              value={form.ambassadorId}
              onChange={(e) =>
                setForm((f) => ({ ...f, ambassadorId: e.target.value }))
              }
              className={inputCls}
            />
            <input
              placeholder="Team ID (optional)"
              value={form.teamId}
              onChange={(e) =>
                setForm((f) => ({ ...f, teamId: e.target.value }))
              }
              className={inputCls}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
