import BackButton from './BackButton';

const pageWrapper =
  'bg-[#F5F7FB] dark:bg-[#0B1120] min-h-screen -mx-4 sm:-mx-6 lg:-mx-8 -mt-5 sm:-mt-6 -mb-5 sm:-mb-6 px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-12 sm:pb-16';

const AlertBanner = ({ type, message }) => {
  const isError = type === 'error';
  return (
    <div className={`mb-7 flex items-center gap-3 rounded-2xl px-5 py-3.5 border animate-[fadeIn_0.3s_ease-out] ${
      isError
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40'
        : 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/40'
    }`}>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
        isError ? 'bg-red-100 dark:bg-red-900/40' : 'bg-emerald-100 dark:bg-emerald-900/40'
      }`}>
        <svg className={`w-4 h-4 ${isError ? 'text-red-600 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          {isError ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          )}
        </svg>
      </div>
      <p className={`text-sm font-semibold m-0 ${isError ? 'text-red-700 dark:text-red-300' : 'text-emerald-700 dark:text-emerald-300'}`}>{message}</p>
    </div>
  );
};

const FormCard = ({ title, subtitle, icon, backRoute, children, error, success, maxWidth = 'max-w-3xl' }) => (
  <div className={pageWrapper}>
    <div className={`${maxWidth} mx-auto`}>
      <BackButton fallbackRoute={backRoute} />

      {/* Header */}
      <div className="flex items-start gap-4 sm:gap-5 mt-6 sm:mt-8 mb-8 sm:mb-10 animate-[fadeIn_0.3s_ease-out]">
        {icon && (
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-wbo-700 to-wbo-800 flex items-center justify-center shrink-0 shadow-lg shadow-wbo-700/20 ring-1 ring-white/10">
            {typeof icon === 'string' ? (
              <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
              </svg>
            ) : (
              icon
            )}
          </div>
        )}
        <div className="min-w-0 pt-1">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-[#F8FAFC] tracking-tight m-0">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 dark:text-[#94A3B8] mt-1.5 m-0">{subtitle}</p>}
        </div>
      </div>

      {/* Messages */}
      {error && <AlertBanner type="error" message={error} />}
      {success && <AlertBanner type="success" message={success} />}

      {/* Content (sections as cards) */}
      {children}
    </div>
  </div>
);

export default FormCard;
