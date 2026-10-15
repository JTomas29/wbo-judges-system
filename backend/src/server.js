// ─── server.js — Punto de entrada del backend (arranque del servidor HTTP) ───
// Responsabilidad: cargar la configuración y poner a escuchar la aplicación Express.

// Carga las variables de entorno del archivo .env antes de usar process.env.
require('dotenv').config();

// Importa la app Express configurada (middlewares + rutas) desde app.js.
const app = require('./app');

// Puerto del servidor: lo define la variable PORT del entorno; por defecto 4000.
const PORT = process.env.PORT || 4000;

// Arranca el servidor HTTP y se queda escuchando peticiones en el puerto indicado.
const server = app.listen(PORT, () => {
  // Log de confirmación con la URL local donde la API queda disponible.
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});

// Si el puerto ya está ocupado (p. ej. una instancia anterior quedó viva),
// mostramos un mensaje claro en vez de un stack trace de Node.
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`El puerto ${PORT} ya está en uso. Cerrá la instancia anterior o ejecutá ./start.sh (libera el puerto automáticamente).`);
    process.exit(1);
  }
  throw err;
});
