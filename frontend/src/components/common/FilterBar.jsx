const icons = {
  search: 'M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z',
  filter: 'M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z',
  sort: 'M3 7h9M3 12h9M3 17h9M16 4v16m0 0l-4-4m4 4l4-4',
  calendar: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5',
};

const ChevronIcon = () => (
  <svg className="w-3.5 h-3.5 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
  </svg>
);

const LeftIcon = ({ name }) => {
  if (!name) return null;
  return (
    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d={icons[name]} />
      </svg>
    </span>
  );
};

const FilterBar = ({ children, onClear }) => (
  <div className="bg-slate-50/80 dark:bg-[#0F172A]/60 rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-4 sm:p-5 transition-all duration-200 hover:shadow-md dark:hover:shadow-black/20">
    <div className="flex flex-wrap items-end gap-3">
      {children}
    </div>
    {onClear && (
      <div className="mt-3.5 pt-3.5 border-t border-slate-200/70 flex justify-end dark:border-[#1E293B]">
        <button
          onClick={onClear}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-9 rounded-lg text-xs font-bold text-slate-500 bg-white border border-slate-200 shadow-sm hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition-all duration-200 dark:text-[#94A3B8] dark:bg-[#111827] dark:border-[#1E293B] dark:hover:text-red-400 dark:hover:border-red-900/50 dark:hover:bg-red-950/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wbo-700/40"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Clear filters
        </button>
      </div>
    )}
  </div>
);

const baseInput = "w-full px-3.5 py-2.5 min-h-11 border rounded-xl text-base sm:text-sm transition-all duration-200 outline-none focus:ring-2 focus:ring-wbo-700/15 hover:border-slate-300 dark:border-[#1E293B] dark:text-[#F8FAFC] dark:placeholder-slate-500 dark:focus:border-wbo-400 dark:focus:ring-wbo-700/20 dark:hover:border-[#334155] dark:bg-[#0B1120]";

export const FilterInput = ({ value, onChange, placeholder, className = '', icon = 'search' }) => (
  <div className={`min-w-[180px] flex-1 relative ${className}`}>
    <LeftIcon name={icon} />
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className={`${baseInput} ${icon ? 'pl-10' : 'pl-4'} pr-9 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-wbo-600 bg-white dark:border-[#1E293B] dark:text-[#F8FAFC] dark:placeholder-slate-500 dark:focus:border-wbo-400 dark:bg-[#0B1120]`}
    />
    {value && (
      <button
        type="button"
        onClick={() => onChange('')}
        aria-label={`Clear ${placeholder || 'search'}`}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wbo-700/40 dark:text-slate-500 dark:hover:text-slate-300 dark:hover:bg-slate-800"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    )}
  </div>
);

export const FilterSelect = ({ value, onChange, options, placeholder, className = '', icon = 'filter' }) => (
  <div className={`min-w-[150px] relative ${className}`}>
    <LeftIcon name={icon} />
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={placeholder}
      className={`${baseInput} appearance-none ${icon ? 'pl-10' : 'pl-4'} pr-9 border-slate-200 text-slate-900 focus:border-wbo-600 bg-white dark:border-[#1E293B] dark:text-[#F8FAFC] dark:focus:border-wbo-400 dark:bg-[#0B1120]`}
    >
      <option value="">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
      <ChevronIcon />
    </span>
  </div>
);

export const FilterDate = ({ value, onChange, placeholder, className = '' }) => (
  <div className={`min-w-[150px] ${className}`}>
    {placeholder && (
      <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1 dark:text-[#94A3B8]">{placeholder}</label>
    )}
    <div className="relative">
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${baseInput} pr-9 border-slate-200 text-slate-900 focus:border-wbo-600 dark:border-[#1E293B] dark:text-[#F8FAFC] dark:focus:border-wbo-400 dark:bg-[#0B1120]`}
      />
      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d={icons.calendar} />
        </svg>
      </span>
    </div>
  </div>
);

export default FilterBar;
