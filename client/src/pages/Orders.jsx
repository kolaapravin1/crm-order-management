import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import * as orderService from '../services/orderService';
import OrderTable from '../components/orders/OrderTable';
import OrderFilters from '../components/orders/OrderFilters';
import Pagination from '../components/common/Pagination';
import EmptyState from '../components/common/EmptyState';
import { SkeletonTable } from '../components/common/SkeletonLoader';

const DEFAULT_FILTERS = { search: '', workflowStage: '', paymentStatus: '', deliveryStatus: '', from: '', to: '', page: 1 };

export default function Orders() {
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [result, setResult] = useState({ orders: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const timeout = setTimeout(() => {
      orderService
        .listOrders({ ...filters, limit: 20 })
        .then(setResult)
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [filters]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Orders</h1>
          <p className="text-sm text-slate-500">{result.total} total orders</p>
        </div>
        <Link
          to="/orders/new"
          className="rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          + New Order
        </Link>
      </div>

      <OrderFilters filters={filters} onChange={setFilters} />

      {loading ? (
        <SkeletonTable rows={8} cols={10} />
      ) : !result.orders.length ? (
        <EmptyState
          title="No orders found"
          description="Try adjusting your filters, or create a new order."
          action={
            <Link to="/orders/new" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
              + New Order
            </Link>
          }
        />
      ) : (
        <>
          <OrderTable orders={result.orders} />
          <Pagination page={result.page} pages={result.pages} onChange={(page) => setFilters((f) => ({ ...f, page }))} />
        </>
      )}
    </div>
  );
}
