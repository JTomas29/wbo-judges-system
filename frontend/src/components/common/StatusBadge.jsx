const STATUS_CONFIG = {
  pending: {
    light: 'bg-amber-50 text-amber-700 border-amber-200',
    dark: 'dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50',
    label: 'Pending'
  },
  active: {
    light: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dark: 'dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50',
    label: 'Active'
  },
  completed: {
    light: 'bg-blue-50 text-blue-700 border-blue-200',
    dark: 'dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50',
    label: 'Completed'
  },
  analyzed: {
    light: 'bg-violet-50 text-violet-700 border-violet-200',
    dark: 'dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-800/50',
    label: 'Analyzed'
  },
  cancelled: {
    light: 'bg-red-50 text-red-700 border-red-200',
    dark: 'dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50',
    label: 'Cancelled'
  },
  archived: {
    light: 'bg-slate-100 text-slate-600 border-slate-300',
    dark: 'dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600',
    label: 'Archived'
  },
  confirmed: {
    light: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dark: 'dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800/50',
    label: 'Confirmed'
  },
  rejected: {
    light: 'bg-red-50 text-red-700 border-red-200',
    dark: 'dark:bg-red-900/30 dark:text-red-300 dark:border-red-800/50',
    label: 'Rejected'
  },
  draft: {
    light: 'bg-amber-50 text-amber-700 border-amber-200',
    dark: 'dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50',
    label: 'Draft'
  },
  finalized: {
    light: 'bg-green-50 text-green-700 border-green-200',
    dark: 'dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50',
    label: 'Finalized'
  },
  scheduled: {
    light: 'bg-amber-50 text-amber-700 border-amber-200',
    dark: 'dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50',
    label: 'Scheduled'
  }
}

const DOT_COLORS = {
  pending: 'bg-amber-500',
  active: 'bg-emerald-500',
  completed: 'bg-blue-500',
  analyzed: 'bg-violet-500',
  cancelled: 'bg-red-500',
  archived: 'bg-slate-400',
  confirmed: 'bg-emerald-500',
  rejected: 'bg-red-500',
  draft: 'bg-amber-500',
  finalized: 'bg-green-500',
  scheduled: 'bg-amber-500'
}

export default function StatusBadge({ status, customLabel, customClasses }) {
  if (customClasses) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border border-transparent ${customClasses}`}>
        {status}
      </span>
    )
  }

  const config = STATUS_CONFIG[status] || {
    light: 'bg-slate-50 text-slate-600 border-slate-200',
    dark: 'dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600',
    label: status
  }

  const dotColor = DOT_COLORS[status] || 'bg-slate-400'

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border ${config.light} ${config.dark}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {customLabel || config.label}
    </span>
  )
}

export function LevelBadge({ level }) {
  const levels = {
    elite: { light: 'bg-green-50 text-green-700 border-green-200', dark: 'dark:bg-green-900/30 dark:text-green-300 dark:border-green-800/50', label: 'Elite' },
    senior: { light: 'bg-blue-50 text-blue-700 border-blue-200', dark: 'dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800/50', label: 'Senior' },
    junior: { light: 'bg-amber-50 text-amber-700 border-amber-200', dark: 'dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50', label: 'Junior' },
    intermediate: { light: 'bg-amber-50 text-amber-700 border-amber-200', dark: 'dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800/50', label: 'Intermediate' }
  }

  const config = levels[level] || { light: 'bg-slate-100 text-slate-600 border-slate-200', dark: 'dark:bg-slate-700/50 dark:text-slate-300 dark:border-slate-600', label: level || '—' }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.light} ${config.dark}`}>
      {config.label}
    </span>
  )
}

export function PrecisionBadge({ precision }) {
  const num = parseFloat(precision)
  let colors
  if (num >= 80) colors = { light: 'bg-green-50 text-green-700', dark: 'dark:bg-green-900/30 dark:text-green-300' }
  else if (num >= 60) colors = { light: 'bg-amber-50 text-amber-700', dark: 'dark:bg-amber-900/30 dark:text-amber-300' }
  else colors = { light: 'bg-red-50 text-red-700', dark: 'dark:bg-red-900/30 dark:text-red-300' }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors.light} ${colors.dark}`}>
      {num.toFixed(1)}%
    </span>
  )
}
