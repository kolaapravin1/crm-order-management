import { motion } from 'framer-motion';

export default function StatCard({ label, value, accent = 'brand', hint = '' }) {
  const accents = {
    brand: 'text-brand-600 bg-brand-50',
    emerald: 'text-emerald-600 bg-emerald-50',
    amber: 'text-amber-600 bg-amber-50',
    red: 'text-red-600 bg-red-50',
    slate: 'text-slate-600 bg-slate-100',
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="rounded-xl border border-slate-200 bg-white p-5 shadow-card transition hover:shadow-soft"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <div className="mt-2 flex items-end justify-between">
        <span className="text-2xl font-bold text-slate-900">{value}</span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${accents[accent]}`}>{hint}</span>
      </div>
    </motion.div>
  );
}
