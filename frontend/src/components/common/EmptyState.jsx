export default function EmptyState({ icon: Icon, title, description, action, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-2xl bg-slate-50 dark:bg-[#1F2937] flex items-center justify-center mb-6">
        {Icon && <Icon className="w-10 h-10 text-slate-300 dark:text-slate-600" />}
      </div>
      <h3 className="text-lg font-bold text-slate-800 dark:text-[#F8FAFC] mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-slate-500 dark:text-[#94A3B8] mb-6 max-w-sm">
          {description}
        </p>
      )}
      {action && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-2.5 bg-wbo-700 hover:bg-wbo-800 text-white rounded-xl text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wbo-700/40"
        >
          {action}
        </button>
      )}
    </div>
  )
}

export function TableFooter({ count, total, label = 'items' }) {
  return (
    <div className="px-5 py-3 border-t border-slate-100 dark:border-[#1E293B] bg-slate-50/50 dark:bg-[#0B1120]/50">
      <p className="text-xs text-slate-400 dark:text-[#94A3B8]">
        Showing {count} of {total} {label}
      </p>
    </div>
  )
}
