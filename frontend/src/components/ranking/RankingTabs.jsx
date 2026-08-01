const RankingTabs = ({ tabs, active, onChange }) => (
  <div className="inline-flex items-center bg-white dark:bg-[#111827] border border-slate-200 dark:border-[#1E293B] rounded-xl p-1 shadow-sm gap-1">
    {tabs.map((tab) => {
      const isActive = tab.id === active;
      return (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
            isActive
              ? 'bg-wbo-700 text-white shadow-sm'
              : 'text-slate-500 dark:text-[#94A3B8] hover:text-slate-800 dark:hover:text-[#F8FAFC] hover:bg-slate-100 dark:hover:bg-white/[0.05]'
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
