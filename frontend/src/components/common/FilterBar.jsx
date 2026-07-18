const FilterBar = ({ children, onClear }) => (
  <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-5 mb-5 transition-all duration-200 hover:shadow-md">
    <div className="flex flex-wrap items-end gap-3">
      {children}
    </div>
    {onClear && (
      <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-red-800 transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Limpiar filtros
        </button>
      </div>
    )}
  </div>
);

const baseInput = "w-full px-3.5 py-2.5 border rounded-xl text-sm transition-all duration-200 outline-none focus:ring-2 focus:ring-red-800/20 hover:border-slate-300";

export const FilterInput = ({ value, onChange, placeholder, className = '' }) => (
  <div className={`min-w-[180px] flex-1 ${className}`}>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${baseInput} border-slate-200 text-slate-900 placeholder-slate-400 focus:border-red-800 bg-white`}
    />
  </div>
);

export const FilterSelect = ({ value, onChange, options, placeholder, className = '' }) => (
  <div className={`min-w-[150px] ${className}`}>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${baseInput} border-slate-200 text-slate-900 focus:border-red-800 bg-white`}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

export const FilterDate = ({ value, onChange, placeholder, className = '' }) => (
  <div className={`min-w-[150px] ${className}`}>
    {placeholder && (
      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">{placeholder}</label>
    )}
    <input
      type="date"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${baseInput} border-slate-200 text-slate-900 focus:border-red-800`}
    />
  </div>
);

export default FilterBar;
