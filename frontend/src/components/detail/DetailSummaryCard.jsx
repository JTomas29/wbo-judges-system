export default function DetailSummaryCard({ icon: Icon, label, value, accent = false }) {
  return (
    <div className={`
      flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-200
      ${accent
        ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/30'
        : 'bg-slate-50 dark:bg-[#1F2937] border-slate-100 dark:border-[#1E293B] hover:shadow-sm'
      }
    `}>
      {Icon && (
        <div className={`
          w-9 h-9 rounded-lg flex items-center justify-center shrink-0
          ${accent
            ? 'bg-red-100 dark:bg-red-900/40'
            : 'bg-slate-100 dark:bg-slate-700/50'
          }
        `}>
          <Icon className={`w-4.5 h-4.5 ${accent ? 'text-red-700 dark:text-red-300' : 'text-slate-500 dark:text-slate-400'}`} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-[#64748B] m-0 leading-none">
          {label}
        </p>
        <p className={`text-sm sm:text-base font-bold mt-1 m-0 leading-tight truncate ${accent ? 'text-red-800 dark:text-red-300' : 'text-slate-800 dark:text-[#F8FAFC]'}`}>
          {value}
        </p>
      </div>
    </div>
  )
}
