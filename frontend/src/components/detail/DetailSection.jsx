export default function DetailSection({ icon: Icon, title, description, children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm overflow-hidden ${className}`}>
      <div className="px-4 sm:px-5 py-4 border-b border-slate-100 dark:border-[#1E293B]">
        <div className="flex items-center gap-2.5">
          {Icon && (
            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700/50 flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-slate-800 dark:text-[#F8FAFC] m-0 leading-tight">
              {title}
            </h3>
            {description && (
              <p className="text-[11px] text-slate-400 dark:text-[#64748B] m-0 mt-0.5">{description}</p>
            )}
          </div>
        </div>
      </div>
      <div className="p-5">
        {children}
      </div>
    </div>
  )
}
