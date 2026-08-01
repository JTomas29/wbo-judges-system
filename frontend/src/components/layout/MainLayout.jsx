import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import Toast from '../common/Toast';
import ErrorBoundary from '../common/ErrorBoundary';

const MainLayout = ({ children }) => {
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
      <Navbar />
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
      <Toast />
    </div>
  );
};

export default MainLayout;
