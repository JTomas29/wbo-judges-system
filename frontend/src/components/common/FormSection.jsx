const FormSection = ({ icon, title, subtitle, children, className = '' }) => (
  <div className={`mb-10 last:mb-0 ${className}`}>
    {title && (
      <div className="flex items-center gap-3 mb-6">
        {icon && (
          <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center shrink-0">
            <svg className="w-[18px] h-[18px] text-red-700 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
            </svg>
          </div>
        )}
        <div>
          <h3 className="text-sm font-bold text-slate-800 dark:text-[#F8FAFC]">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    )}
    {children}
  </div>
);

export default FormSection;
