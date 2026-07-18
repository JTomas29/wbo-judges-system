const FormSection = ({ icon, title, children, className = '' }) => (
  <div className={`mb-7 last:mb-0 ${className}`}>
    <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
      {icon && (
        <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
      )}
      <h3 className="text-sm font-bold text-slate-800">{title}</h3>
    </div>
    {children}
  </div>
);

export default FormSection;
