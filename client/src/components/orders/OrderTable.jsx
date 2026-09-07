import { useNavigate } from 'react-router-dom';
import StatusBadge from '../common/StatusBadge';
import { formatCurrency, formatDate } from '../../utils/formatters';

export default function OrderTable({ orders }) {
  const navigate = useNavigate();

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
      <table className="w-full min-w-[1100px] text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Order ID</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Product / Combo</th>
            <th className="px-4 py-3">Ambassador</th>
            <th className="px-4 py-3">Team</th>
            <th className="px-4 py-3 text-right">Amount</th>
            <th className="px-4 py-3">Payment</th>
            <th className="px-4 py-3">Stage</th>
            <th className="px-4 py-3">Delivery</th>
            <th className="px-4 py-3">Assigned Admin</th>
            <th className="px-4 py-3">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {orders.map((o) => (
            <tr
              key={o._id}
              onClick={() => navigate(`/orders/${o._id}`)}
              className="cursor-pointer transition hover:bg-brand-50/40"
            >
              <td className="whitespace-nowrap px-4 py-3 font-semibold text-brand-700">{o.orderNumber}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-700">{o.customer?.name || '—'}</td>
              <td className="max-w-[180px] truncate px-4 py-3 text-slate-600">
                {o.items?.map((i) => i.name).join(', ')}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{o.ambassadorId}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{o.teamId}</td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-medium text-slate-800">
                {formatCurrency(o.finalAmount)}
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <StatusBadge status={o.paymentStatus} />
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <StatusBadge status={o.workflowStage} />
              </td>
              <td className="whitespace-nowrap px-4 py-3">
                <StatusBadge status={o.deliveryStatus} />
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-600">{o.assignedAdmin?.name || '—'}</td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDate(o.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
