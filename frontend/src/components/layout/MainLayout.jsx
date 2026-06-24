import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const MainLayout = ({ children }) => {
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-area">
        <Navbar />
        <main className="page-content">{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;
