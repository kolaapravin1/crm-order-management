import { WORKFLOW_LABELS } from '../../utils/formatters';

const PAYMENT_STATUSES = ['PENDING', 'PARTIAL', 'PAID', 'FAILED', 'REFUNDED'];
const DELIVERY_STATUSES = ['PENDING', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'DELIVERY_FAILED'];

export default function OrderFilters({ filters, onChange }) {
  const set = (key) => (e) => onChange({ ...filters, [key]: e.target.value, page: 1 });

  const selectCls =
    'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative flex-1 min-w-[220px]">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" strokeLinecap="round" />
        </svg>
        <input
          value={filters.search}
          onChange={set('search')}
          placeholder="Search order #, ambassador, team ID…"
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <select value={filters.workflowStage} onChange={set('workflowStage')} className={selectCls}>
        <option value="">All Stages</option>
        {Object.entries(WORKFLOW_LABELS).map(([k, v]) => (
          <option key={k} value={k}>{v}</option>
        ))}
      </select>

      <select value={filters.paymentStatus} onChange={set('paymentStatus')} className={selectCls}>
        <option value="">All Payment</option>
        {PAYMENT_STATUSES.map((s) => (
          <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
        ))}
      </select>

      <select value={filters.deliveryStatus} onChange={set('deliveryStatus')} className={selectCls}>
        <option value="">All Delivery</option>
        {DELIVERY_STATUSES.map((s) => (
          <option key={s} value={s}>{s.replaceAll('_', ' ')}</option>
        ))}
      </select>

      <input type="date" value={filters.from} onChange={set('from')} className={selectCls} />
      <input type="date" value={filters.to} onChange={set('to')} className={selectCls} />
    </div>
  );
}
