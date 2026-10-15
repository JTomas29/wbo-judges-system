// ─── ActionPanel / ActionButton ────────────────────────────────────────────────
// Panel de acciones y botón de acción reutilizables para las páginas de detalle.
//   - ActionPanel : contenedor flex para agrupar botones de acción.
//   - ActionButton: botón con variantes (primary/secondary/danger/ghost), estado
//                   disabled/loading (spinner) e ícono opcional.
// Componentes puros controlados: reciben props y no usan contexto ni estado.
// ───────────────────────────────────────────────────────────────────────────────

// ActionPanel: props → children (botones), className extra y stacked
// (apila verticalmente en móvil / fila en escritorio)
export default function ActionPanel({ children, className = '', stacked = false }) {
  return (
    <div className={`${stacked ? 'flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center' : 'flex flex-wrap items-center'} gap-3 ${className}`}>
      {children}
    </div>
  )
}

// ActionButton: props → children, onClick, variant, disabled, loading, icon (componente), className
export function ActionButton({ children, onClick, variant = 'primary', disabled = false, loading = false, icon: Icon, className = '' }) {
  // Clases base comunes a cualquier botón de acción
  const base = 'inline-flex items-center justify-center gap-2 px-5 py-2.5 min-h-11 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wbo-700/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-[#111827]'

  // Estilos particulares por variante visual
  const variants = {
    primary: 'bg-wbo-700 text-white hover:bg-wbo-800 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] shadow-sm',
    secondary: 'bg-white dark:bg-[#1F2937] text-slate-700 dark:text-[#94A3B8] border border-slate-200 dark:border-[#1E293B] hover:bg-slate-50 dark:hover:bg-slate-700',
    danger: 'bg-red-600 text-white hover:bg-red-700 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] shadow-sm',
    ghost: 'text-slate-600 dark:text-[#94A3B8] hover:bg-slate-100 dark:hover:bg-slate-700/50'
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${base} ${variants[variant]} ${className}`}
    >
      {/* Spinner de carga, ícono o nada según el estado */}
      {loading ? (
        <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
      ) : Icon ? (
        <Icon className="w-4 h-4" />
      ) : null}
      {children}
    </button>
  )
}
