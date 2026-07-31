const SelectField = ({ name, label, value, onChange, options, placeholder, required, error, icon, className = '' }) => {
  const stateClasses = error
    ? 'border-red-400 dark:border-red-500/70 bg-red-50/40 dark:bg-red-950/20 focus:border-red-500 focus:ring-4 focus:ring-red-500/15'
    : 'border-slate-200 dark:border-[#334155] bg-white dark:bg-[#1F2937] hover:border-slate-300 dark:hover:border-[#475569] focus:border-wbo-600 dark:focus:border-wbo-400 focus:ring-4 focus:ring-wbo-700/10 focus:shadow-md';

  const textColor = error
    ? 'text-red-900 dark:text-red-300'
    : value
      ? 'text-slate-900 dark:text-[#F8FAFC]'
      : 'text-slate-400 dark:text-slate-500';

  return (
    <div className={className}>
      <label htmlFor={name} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wider mb-2">
        {icon && <span className="text-slate-400 dark:text-slate-500">{icon}</span>}
        {label}
        {required && <span className="text-wbo-600 dark:text-wbo-400 text-sm leading-none">*</span>}
      </label>
      <div className="relative">
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          className={`w-full px-4 py-3 pr-10 border rounded-xl text-sm font-medium transition-all duration-200 outline-none shadow-sm appearance-none ${textColor} ${stateClasses}`}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <svg className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none w-4 h-4 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
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

export default SelectField;
