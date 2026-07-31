const InputField = ({ name, label, value, onChange, placeholder, type = 'text', required, error, icon, className = '', ...rest }) => (
  <div className={className}>
    <label htmlFor={name} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide mb-1.5">
      {icon && <span className="text-slate-400 dark:text-slate-500">{icon}</span>}
      {label}
      {required && <span className="text-red-500 text-sm leading-none">*</span>}
    </label>
    <input
      id={name}
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...rest}
      className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all duration-250 outline-none ${
        error
          ? 'border-red-300 dark:border-red-700 text-red-900 dark:text-red-300 placeholder-red-300 dark:placeholder-red-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
          : 'border-slate-200 dark:border-[#374151] text-slate-900 dark:text-[#F8FAFC] placeholder-slate-400 dark:placeholder-slate-500 focus:border-red-800 focus:ring-2 focus:ring-red-800/20 hover:border-slate-300 dark:hover:border-[#4B5563] bg-white dark:bg-[#1F2937]'
      }`}
    />
    {error && (
      <p className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 mt-1.5">
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {error}
      </p>
    )}
  </div>
);

export default InputField;
