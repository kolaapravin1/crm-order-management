export default function Pagination({ page, pages, onChange }) {
  if (pages <= 1) return null;

  const nums = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(pages, start + 4);
  for (let i = start; i <= end; i += 1) nums.push(i);

  const btn = (active) =>
    `h-8 min-w-[2rem] rounded-lg px-2 text-sm font-medium transition ${
      active ? 'bg-brand-600 text-white' : 'text-slate-600 hover:bg-slate-100'
    }`;

  return (
    <div className="flex items-center justify-between gap-3 px-1 py-3">
      <p className="text-xs text-slate-500">
        Page {page} of {pages}
      </p>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => onChange(page - 1)} className="h-8 rounded-lg px-2 text-sm text-slate-500 disabled:opacity-30 hover:bg-slate-100">
          Prev
        </button>
        {nums.map((n) => (
          <button key={n} onClick={() => onChange(n)} className={btn(n === page)}>
            {n}
          </button>
        ))}
        <button disabled={page >= pages} onClick={() => onChange(page + 1)} className="h-8 rounded-lg px-2 text-sm text-slate-500 disabled:opacity-30 hover:bg-slate-100">
          Next
        </button>
      </div>
    </div>
  );
}
