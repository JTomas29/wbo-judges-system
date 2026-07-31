const FormSection = ({ icon, title, subtitle, children, className = '' }) => (
  <div className={`bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] border-t-[3px] border-t-wbo-700 shadow-md overflow-hidden mb-6 last:mb-0 animate-[fadeIn_0.4s_ease-out] ${className}`}>
    {(icon || title) && (
      <div className="px-5 sm:px-7 py-4 flex items-center gap-3.5 border-b border-slate-100 dark:border-[#1E293B] bg-gradient-to-r from-wbo-50/70 to-transparent dark:from-wbo-900/15">
        {icon && (
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-wbo-700 to-wbo-800 flex items-center justify-center shrink-0 shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
            </svg>
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900 dark:text-[#F8FAFC] m-0">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 dark:text-[#64748B] mt-0.5 m-0">{subtitle}</p>}
        </div>
      </div>
    )}
    <div className="p-5 sm:p-7">{children}</div>
  </div>
);

export default FormSection;
