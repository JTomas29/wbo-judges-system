const RankingTabs = ({ tabs, active, onChange }) => (
  <div className="inline-flex items-center bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-2xl p-1.5 shadow-sm gap-1 max-w-full overflow-x-auto">
    {tabs.map((tab) => {
      const isActive = tab.id === active;
      return (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 min-h-11 rounded-xl text-sm font-semibold whitespace-nowrap transition-all duration-200 ${
            isActive
              ? 'bg-gradient-to-r from-wbo-700 to-wbo-800 text-white shadow-md shadow-wbo-700/25 ring-1 ring-white/10'
              : 'text-slate-500 dark:text-[#94A3B8] hover:text-wbo-700 dark:hover:text-wbo-300 hover:bg-wbo-50 dark:hover:bg-white/[0.05]'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      );
    })}
  </div>
);

export default RankingTabs;
