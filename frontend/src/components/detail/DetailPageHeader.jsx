import BackButton from '../common/BackButton'
import StatusBadge from '../common/StatusBadge'

export default function DetailPageHeader({ title, subtitle, description, status, backFallback, children }) {
  return (
    <div className="mb-6 animate-fadeIn">
      <div className="mb-4">
        <BackButton fallbackRoute={backFallback || '/dashboard'} />
      </div>
      <div className="flex flex-wrap justify-between items-start gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F8FAFC] m-0 leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-1">{subtitle}</p>
          )}
          {description && (
            <p className="text-xs text-slate-400 dark:text-[#64748B] mt-0.5">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {status && <StatusBadge status={status} />}
          {children}
        </div>
      </div>
    </div>
  )
}
