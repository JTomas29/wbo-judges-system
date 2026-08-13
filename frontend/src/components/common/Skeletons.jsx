export const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800 ${className}`} aria-hidden="true" />
);

export const PageHeaderSkeleton = () => (
  <div className="flex items-start gap-4 sm:gap-5" aria-hidden="true">
    <Skeleton className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shrink-0" />
    <div className="flex-1 min-w-0 pt-1 space-y-2.5">
      <Skeleton className="h-7 sm:h-8 w-56 max-w-full" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </div>
  </div>
);

export const FilterBarSkeleton = () => (
  <div className="bg-white dark:bg-[#111827] rounded-xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-4 sm:p-5 mb-5" aria-hidden="true">
    <div className="flex flex-wrap gap-3">
      <Skeleton className="h-10 flex-1 min-w-[180px]" />
      <Skeleton className="h-10 w-36 sm:w-44" />
      <Skeleton className="h-10 w-36 sm:w-44" />
    </div>
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 4 }) => (
  <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm overflow-hidden" aria-hidden="true">
    <div className="px-5 py-4 border-b border-slate-100 dark:border-[#1E293B] flex gap-4">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-3 flex-1" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="px-5 py-4 border-b border-slate-100 dark:border-[#1E293B] last:border-0 flex gap-4 items-center">
        <Skeleton className="w-9 h-9 rounded-full shrink-0" />
        {Array.from({ length: cols - 1 }).map((_, j) => (
          <Skeleton key={j} className="h-3.5 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

export const CardsGridSkeleton = ({ count = 3, className = '' }) => (
  <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`} aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-5">
        <Skeleton className="w-10 h-10 rounded-xl" />
        <Skeleton className="h-5 w-2/3 mt-4" />
        <Skeleton className="h-3 w-full mt-2.5" />
        <Skeleton className="h-3 w-1/2 mt-2" />
      </div>
    ))}
  </div>
);

export const StatCardsSkeleton = ({ count = 4 }) => (
  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" aria-hidden="true">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-5">
        <Skeleton className="w-9 h-9 rounded-lg" />
        <Skeleton className="h-7 w-16 mt-3" />
        <Skeleton className="h-3 w-24 mt-2" />
      </div>
    ))}
  </div>
);

export const ProfileHeaderSkeleton = () => (
  <div className="bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm p-5 sm:p-6 flex items-center gap-4" aria-hidden="true">
    <Skeleton className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shrink-0" />
    <div className="flex-1 min-w-0 space-y-2.5">
      <Skeleton className="h-6 w-48 max-w-full" />
      <Skeleton className="h-3.5 w-64 max-w-full" />
      <Skeleton className="h-3.5 w-40 max-w-full" />
    </div>
  </div>
);
