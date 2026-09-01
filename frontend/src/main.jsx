import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.jsx';
import { registerSW } from 'virtual:pwa-register';

if (import.meta.env.VITE_DEMO_MODE !== 'false') {
  const { setupMocks } = await import('./mocks/setupMocks.js');
  setupMocks();
}

const updateSW = registerSW({
  onNeedRefresh() {
    const update = confirm(
      '¡Nueva versión disponible! ¿Actualizás ahora?'
    );
    if (update) updateSW(true);
  },
  onOfflineReady() {
    console.log('App lista para usar sin conexión');
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
