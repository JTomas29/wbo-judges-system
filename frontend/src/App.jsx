import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import AppRoutes from './routes/AppRoutes';
import MainLayout from './components/layout/MainLayout';
import ScrollToTop from './components/common/ScrollToTop';

function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ScrollToTop />
          <MainLayout>
            <AppRoutes />
          </MainLayout>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}

export default App;
