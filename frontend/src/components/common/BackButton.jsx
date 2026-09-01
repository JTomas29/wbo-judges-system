import { useNavigate } from 'react-router-dom';

const BackButton = ({ fallbackRoute = '/dashboard' }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallbackRoute, { replace: true });
    }
  };

  return (
    <button
      onClick={handleBack}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 min-h-11 sm:px-4 sm:py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-[#1E293B] border border-slate-200 dark:border-[#334155] rounded-xl shadow-sm hover:bg-slate-50 dark:hover:bg-[#263548] hover:shadow-md hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm transition-all duration-200"
    >
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      Back
    </button>
  );
};

export default BackButton;
