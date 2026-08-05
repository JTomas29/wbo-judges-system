import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const TOAST_STYLES = {
  info: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    ring: 'ring-blue-200',
    icon: (
      <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
      </svg>
    ),
  },
  success: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-800',
    ring: 'ring-emerald-200',
    icon: (
      <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  error: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    ring: 'ring-red-200',
    icon: (
      <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
      </svg>
    ),
  },
};

const Toast = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (location.state?.toast) {
      setToast(location.state.toast);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, navigate]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] animate-toastSlideUp">
      <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl ${style.bg} ${style.text} ring-1 ${style.ring} shadow-lg shadow-black/10`}>
        {style.icon}
        <span className="text-sm font-medium">{toast.message}</span>
        <button
          onClick={() => setToast(null)}
          aria-label="Close notification"
          className="ml-2 p-0.5 rounded-md hover:bg-white/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/40"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Toast;
