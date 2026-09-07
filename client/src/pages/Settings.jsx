import { useAuth } from '../hooks/useAuth';

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500">Account and system information.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="mb-4 text-sm font-semibold text-slate-800">Account</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs text-slate-400">Name</p>
            <p className="text-slate-800">{user?.name}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Email</p>
            <p className="text-slate-800">{user?.email}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Role</p>
            <p className="text-slate-800">Superadmin</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <h2 className="mb-2 text-sm font-semibold text-slate-800">System Configuration</h2>
        <p className="text-sm text-slate-500">
          Product and combo pricing/discounts are managed from the <span className="font-medium text-slate-700">Products</span> and{' '}
          <span className="font-medium text-slate-700">Combos</span> pages. Admin accounts are managed from{' '}
          <span className="font-medium text-slate-700">Admins</span>. All changes are recorded in{' '}
          <span className="font-medium text-slate-700">Audit Logs</span>.
        </p>
      </div>
    </div>
  );
}
