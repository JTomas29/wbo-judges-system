import { useLocation } from 'react-router-dom';
import Navbar from './Navbar';

const MainLayout = ({ children }) => {
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#f5f4f2]">
      <Navbar />
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6">
        {children}
      </main>
    </div>
  );
};

export default MainLayout;
