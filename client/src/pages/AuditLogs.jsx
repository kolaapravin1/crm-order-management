import { useEffect, useState } from 'react';
import * as auditService from '../services/auditService';
import Pagination from '../components/common/Pagination';
import EmptyState from '../components/common/EmptyState';
import { SkeletonTable } from '../components/common/SkeletonLoader';
import { formatDateTime, label } from '../utils/formatters';

const inputCls =
  'rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100';

export default function AuditLogs() {
  const [entityType, setEntityType] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ logs: [], total: 0, page: 1, pages: 1 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    auditService
      .listAuditLogs({ entityType, page, limit: 25 })
      .then(setResult)
      .finally(() => setLoading(false));
  }, [entityType, page]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Audit Logs</h1>
        <p className="text-sm text-slate-500">Complete history of important system actions. Read-only.</p>
      </div>

      <select
        value={entityType}
        onChange={(e) => {
          setEntityType(e.target.value);
          setPage(1);
        }}
        className={inputCls}
      >
        <option value="">All Entities</option>
        <option value="Order">Order</option>
        <option value="Product">Product</option>
        <option value="Combo">Combo</option>
        <option value="User">User</option>
      </select>

      {loading ? (
        <SkeletonTable rows={8} cols={5} />
      ) : !result.logs.length ? (
        <EmptyState title="No audit log entries found" />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-card">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-left text-xs font-semibold uppercase text-slate-500">
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Entity</th>
                  <th className="px-4 py-3">Previous</th>
                  <th className="px-4 py-3">New</th>
                  <th className="px-4 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.logs.map((l) => (
                  <tr key={l._id} className="align-top hover:bg-brand-50/30">
                    <td className="px-4 py-3 font-medium text-slate-800">{l.userName}</td>
                    <td className="px-4 py-3 text-slate-700">{label(l.action)}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {l.entityType} {l.entityLabel && <span className="text-slate-400">· {l.entityLabel}</span>}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 font-mono text-[11px] text-slate-400">
                      {l.previousValue ? JSON.stringify(l.previousValue) : '—'}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 font-mono text-[11px] text-slate-400">
                      {l.newValue ? JSON.stringify(l.newValue) : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-500">{formatDateTime(l.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={result.page} pages={result.pages} onChange={setPage} />
        </>
      )}
    </div>
  );
}
