import { motion } from 'framer-motion';
import { WORKFLOW_LABELS, WORKFLOW_MAIN_SEQUENCE, REVISION_TO_MAIN } from '../../utils/formatters';

const REVISION_STAGES = new Set(Object.keys(REVISION_TO_MAIN));

export default function WorkflowTimeline({ stage }) {
  const isRevision = REVISION_STAGES.has(stage);
  const effectiveStage = isRevision ? REVISION_TO_MAIN[stage] : stage;
  const currentIndex = WORKFLOW_MAIN_SEQUENCE.indexOf(effectiveStage);

  return (
    <div className="w-full overflow-x-auto pb-1">
      <div className="flex min-w-[720px] items-start">
        {WORKFLOW_MAIN_SEQUENCE.map((s, idx) => {
          const done = idx < currentIndex;
          const active = idx === currentIndex && !isRevision;
          const activeRevision = idx === currentIndex && isRevision;
          const last = idx === WORKFLOW_MAIN_SEQUENCE.length - 1;

          return (
            <div key={s} className="flex flex-1 flex-col items-center">
              <div className="flex w-full items-center">
                <div
                  className={`h-0.5 flex-1 ${idx === 0 ? 'invisible' : done || active || activeRevision ? 'bg-brand-500' : 'bg-slate-200'}`}
                />
                <motion.div
                  initial={false}
                  animate={{ scale: active || activeRevision ? 1.15 : 1 }}
                  className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold ${
                    done
                      ? 'border-brand-500 bg-brand-500 text-white'
                      : active
                      ? 'border-brand-500 bg-white text-brand-600 shadow-soft'
                      : activeRevision
                      ? 'border-amber-500 bg-amber-50 text-amber-600 shadow-soft'
                      : 'border-slate-200 bg-white text-slate-400'
                  }`}
                >
                  {done ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    idx + 1
                  )}
                  {(active || activeRevision) && (
                    <span className="absolute -inset-1 -z-10 animate-ping rounded-full bg-brand-400/30" />
                  )}
                </motion.div>
                <div className={`h-0.5 flex-1 ${last ? 'invisible' : done ? 'bg-brand-500' : 'bg-slate-200'}`} />
              </div>
              <div className="mt-2 max-w-[90px] text-center">
                <p className={`text-[11px] font-medium leading-tight ${active || activeRevision ? 'text-slate-900' : done ? 'text-slate-600' : 'text-slate-400'}`}>
                  {WORKFLOW_LABELS[s]}
                </p>
                {activeRevision && <p className="mt-0.5 text-[10px] font-semibold text-amber-600">{WORKFLOW_LABELS[stage]}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
