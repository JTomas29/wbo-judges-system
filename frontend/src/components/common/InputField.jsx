const InputField = ({ name, label, value, onChange, placeholder, type = 'text', required, error, icon, className = '', ...rest }) => {
  const valid = !error && Boolean(value) && type !== 'date';

  const stateClasses = error
    ? 'border-red-400 dark:border-red-500/70 bg-red-50/40 dark:bg-red-950/20 placeholder-red-300 dark:placeholder-red-600/70 focus:border-red-500 focus:ring-4 focus:ring-red-500/15'
    : valid
      ? 'border-emerald-300 dark:border-emerald-600/60 bg-white dark:bg-[#1F2937] placeholder-slate-400 dark:placeholder-slate-500 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/15 focus:shadow-md'
      : 'border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1F2937] placeholder-slate-400 dark:placeholder-slate-500 hover:border-slate-300 dark:hover:border-[#475569] focus:border-wbo-600 dark:focus:border-wbo-400 focus:ring-4 focus:ring-wbo-700/10 focus:shadow-md';

  return (
    <div className={className}>
      <label htmlFor={name} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider mb-2">
        {icon && <span className="text-slate-400 dark:text-slate-500">{icon}</span>}
        {label}
        {required && <span className="text-wbo-600 dark:text-wbo-400 text-sm leading-none">*</span>}
      </label>
      <div className="relative">
        <input
          id={name}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          {...rest}
          className={`w-full px-4 py-3 border rounded-xl text-sm font-medium transition-all duration-200 outline-none shadow-sm ${stateClasses} ${valid ? 'pr-10' : ''}`}
        />
        {valid && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
            <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </span>
        )}
      </div>
      {error && (
        <p className="flex items-center gap-1.5 text-xs font-medium text-red-600 dark:text-red-400 mt-2">
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
};

export default InputField;
