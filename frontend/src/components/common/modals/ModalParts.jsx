const ICON_BG = {
  danger: 'bg-red-100 dark:bg-red-900/30',
  warning: 'bg-amber-100 dark:bg-amber-900/30',
  success: 'bg-emerald-100 dark:bg-emerald-900/30',
  info: 'bg-blue-100 dark:bg-blue-900/30',
};

const ICON_COLOR = {
  danger: 'text-red-600 dark:text-red-400',
  warning: 'text-amber-600 dark:text-amber-400',
  success: 'text-emerald-600 dark:text-emerald-400',
  info: 'text-blue-600 dark:text-blue-400',
};

const DEFAULT_ICONS = {
  danger: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
  warning: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </svg>
  ),
  success: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  info: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </svg>
  ),
};

export default function ModalHeader({ title, description, type = 'info', icon }) {
  return (
    <div className="flex items-start gap-4 mb-5">
      <div className={`w-12 h-12 rounded-xl ${ICON_BG[type]} flex items-center justify-center shrink-0`}>
        <span className={ICON_COLOR[type]}>
          {icon || DEFAULT_ICONS[type]}
        </span>
      </div>
      <div className="min-w-0 pt-0.5">
        <h3 className="text-lg font-bold text-slate-900 dark:text-[#F8FAFC] m-0 leading-tight">
          {title}
        </h3>
        {description && (
          <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-1 m-0 leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

export function ModalFooter({ children, className = '' }) {
  return (
    <div className={`flex gap-3 justify-end mt-6 pt-4 border-t border-slate-100 dark:border-[#1E293B] ${className}`}>
      {children}
    </div>
  );
}

export function ModalButton({ children, onClick, variant = 'primary', disabled = false, loading = false, icon: Icon, className = '' }) {
  const base = 'inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wbo-700/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#111827]'

  const variants = {
    primary: 'bg-wbo-700 text-white hover:bg-wbo-800 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] shadow-sm',
    secondary: 'bg-white dark:bg-[#1F2937] text-slate-700 dark:text-[#94A3B8] border border-slate-200 dark:border-[#1E293B] hover:bg-slate-50 dark:hover:bg-slate-700',
    danger: 'bg-red-600 text-white hover:bg-red-700 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] shadow-sm',
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {loading ? (
        <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {children}
    </button>
  );
}
