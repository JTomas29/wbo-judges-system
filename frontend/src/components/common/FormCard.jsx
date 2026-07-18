import BackButton from './BackButton';

const FormCard = ({ title, subtitle, icon, backRoute, children, error, success, maxWidth = 'max-w-3xl' }) => (
  <div className={`${maxWidth} mx-auto`}>
    <div className="mb-4">
      <BackButton fallbackRoute={backRoute} />
    </div>

    {/* Header */}
    <div className="flex items-start gap-4 mb-6">
      {icon && (
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-800 to-red-900 flex items-center justify-center shrink-0 shadow-sm">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
      )}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
    </div>

    {/* Messages */}
    {error && (
      <div className="mb-5 flex items-center gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
        <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm font-medium text-red-700">{error}</p>
      </div>
    )}

    {success && (
      <div className="mb-5 flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3">
        <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-sm font-medium text-emerald-700">{success}</p>
      </div>
    )}

    {/* Card */}
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 transition-all duration-300">
      {children}
    </div>
  </div>
);

export default FormCard;
