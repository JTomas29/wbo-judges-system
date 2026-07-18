const InputField = ({ name, label, value, onChange, placeholder, type = 'text', required, error, icon, className = '' }) => (
  <div className={className}>
    <label htmlFor={name} className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
      {icon && <span className="text-slate-400">{icon}</span>}
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
      className={`w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all duration-200 outline-none ${
        error
          ? 'border-red-300 text-red-900 placeholder-red-300 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
          : 'border-slate-200 text-slate-900 placeholder-slate-400 focus:border-red-800 focus:ring-2 focus:ring-red-800/20 hover:border-slate-300'
      }`}
    />
    {error && (
      <p className="flex items-center gap-1 text-xs text-red-600 mt-1.5">
        <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        {error}
      </p>
    )}
  </div>
);

export default InputField;
