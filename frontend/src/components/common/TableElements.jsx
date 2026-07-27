export default function TableWrapper({ children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-[#111827] rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm overflow-hidden transition-all duration-300 hover:shadow-md ${className}`}>
      {children}
    </div>
  )
}

export function TableHead({ children, sticky = false, className = '' }) {
  return (
    <thead className={`${sticky ? 'sticky top-0 z-10' : ''} bg-slate-50/80 dark:bg-[#0B1120] ${className}`}>
      <tr className="border-b border-slate-200 dark:border-[#1E293B]">
        {children}
      </tr>
    </thead>
  )
}

export function Th({ children, align = 'left', className = '' }) {
  const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
  return (
    <th className={`${alignClass} py-3.5 px-5 text-[11px] font-semibold text-slate-500 dark:text-[#94A3B8] uppercase tracking-wide ${className}`}>
      {children}
    </th>
  )
}

export function Td({ children, align = 'left', className = '' }) {
  const alignClass = align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left'
  return (
    <td className={`${alignClass} py-3.5 px-5 ${className}`}>
      {children}
    </td>
  )
}

export function TableRow({ children, onClick, className = '' }) {
  return (
    <tr
      onClick={onClick}
      className={`border-b border-slate-100 dark:border-[#1E293B] last:border-0 hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-all duration-200 ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  )
}
