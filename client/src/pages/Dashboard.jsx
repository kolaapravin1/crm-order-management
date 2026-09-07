import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import * as dashboardService from '../services/dashboardService';
import StatCard from '../components/common/StatCard';
import { SkeletonCard, SkeletonTable } from '../components/common/SkeletonLoader';
import EmptyState from '../components/common/EmptyState';
import StatusBadge from '../components/common/StatusBadge';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function Dashboard() {
  const { user, isSuperadmin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetcher = isSuperadmin ? dashboardService.getSuperadminSummary : dashboardService.getAdminSummary;
    fetcher()
      .then(setData)
      .finally(() => setLoading(false));
  }, [isSuperadmin]);

  const cards = isSuperadmin
    ? [
        { label: 'Total Orders', key: 'totalOrders', accent: 'brand' },
        { label: 'Orders Today', key: 'ordersToday', accent: 'brand' },
        { label: 'Pending Orders', key: 'pendingOrders', accent: 'amber' },
        { label: 'Awaiting Approval', key: 'awaitingApproval', accent: 'amber' },
        { label: 'In Production', key: 'inProduction', accent: 'brand' },
        { label: 'In QC', key: 'inQC', accent: 'brand' },
        { label: 'Ready for Delivery', key: 'readyForDelivery', accent: 'brand' },
        { label: 'Delivered', key: 'delivered', accent: 'emerald' },
        { label: 'Pending Payments', key: 'pendingPayments', accent: 'red' },
        { label: 'Total Customers', key: 'totalCustomers', accent: 'slate' },
        { label: 'Total Admins', key: 'totalAdmins', accent: 'slate' },
      ]
    : [
        { label: 'My Active Orders', key: 'myActiveOrders', accent: 'brand' },
        { label: 'New Orders', key: 'newOrders', accent: 'brand' },
        { label: 'Awaiting Photo Verification', key: 'awaitingPhoto', accent: 'amber' },
        { label: 'Awaiting Design', key: 'awaitingDesign', accent: 'amber' },
        { label: 'Awaiting Customer Approval', key: 'awaitingApproval', accent: 'amber' },
        { label: 'Production', key: 'production', accent: 'brand' },
        { label: 'QC', key: 'qc', accent: 'brand' },
        { label: 'Packing', key: 'packing', accent: 'brand' },
        { label: 'Delivery', key: 'delivery', accent: 'emerald' },
      ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Welcome back, {user?.name?.split(' ')[0]}</h1>
          <p className="text-sm text-slate-500">Here's what's happening with your orders today.</p>
        </div>
        <Link
          to="/orders/new"
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          + New Order
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {loading
          ? Array.from({ length: cards.length }).map((_, i) => <SkeletonCard key={i} />)
          : cards.map((c) => <StatCard key={c.key} label={c.label} value={data?.[c.key] ?? 0} accent={c.accent} />)}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Recent Orders</h2>
        {loading ? (
          <SkeletonTable rows={5} cols={5} />
        ) : !data?.recentOrders?.length ? (
          <EmptyState title="No orders yet" description="Orders you create will show up here." />
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
            <table className="w-full min-w-[700px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Stage</th>
                  <th className="px-4 py-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.recentOrders.map((o) => (
                  <tr key={o._id} className="cursor-pointer hover:bg-brand-50/40">
                    <td className="px-4 py-3">
                      <Link to={`/orders/${o._id}`} className="font-semibold text-brand-700">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{o.customer?.name || '—'}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-800">{formatCurrency(o.finalAmount)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.workflowStage} />
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatDate(o.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
