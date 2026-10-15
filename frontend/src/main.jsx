/**
 * main.jsx — Punto de entrada de la aplicación (React + Vite).
 *
 * Es el primer módulo que ejecuta Vite: monta la raíz de React en el DOM,
 * activa el modo estricto de React y registra el Service Worker del PWA
 * (plugin "virtual:pwa-register") para habilitar el soporte offline.
 */

// StrictMode: detección de efectos secundarios y renderizado doble en desarrollo.
// createRoot: API moderna de React 18+ para montar el árbol en el nodo #root de index.html.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
// CSS global de Tailwind (directivas base, componentes y utilidades).
import './index.css';
// Componente raíz de la aplicación (contiene los Providers y las rutas).
import App from './App.jsx';
// Utilidad del plugin virtual:pwa-register que expone callbacks del Service Worker.
import { registerSW } from 'virtual:pwa-register';

// Registra el Service Worker devolviendo una función updateSW que fuerza la actualización.
const updateSW = registerSW({
  // onNeedRefresh: hay una versión nueva precachead; se pregunta al usuario
  // y, si acepta, se llama a updateSW(true) para que recargue la app nueva.
  onNeedRefresh() {
    const update = confirm(
      '¡Nueva versión disponible! ¿Actualizás ahora?'
    );
    if (update) updateSW(true);
  },
  // onOfflineReady: el Service Worker terminó de cachear la app; ya funciona sin conexión.
  onOfflineReady() {
    console.log('App lista para usar sin conexión');
  },
});

// Monta <App /> dentro del nodo <div id="root"> y activa StrictMode.
createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
