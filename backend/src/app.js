// ─── app.js — Configuración y montaje de la aplicación Express ───
// Responsabilidad: crear la instancia de Express, registrar middlewares globales,
// montar los routers por dominio bajo /api y servir el build del frontend (SPA).

// 'path' permite resolver rutas absolutas (p. ej. la carpeta de build del frontend).
const path = require('path');
// Framework web: manejo de rutas, middlewares y respuestas HTTP.
const express = require('express');
// CORS: permite peticiones desde otros orígenes (necesario para servir el frontend
// en una sola URL, p. ej. a través de ngrok en el plan free).
const cors = require('cors');
// Middleware global de errores: normaliza las respuestas de error de toda la API.
const errorMiddleware = require('./middleware/errorMiddleware');

// Routers de cada dominio de la aplicación. Se montan más abajo bajo su prefijo /api.
const authRoutes = require('./routes/authRoutes');
const fightRoutes = require('./routes/fightRoutes');
const judgeRoutes = require('./routes/judgeRoutes');
const scoringRoutes = require('./routes/scoringRoutes');
const meRoutes = require('./routes/meRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const officialCardRoutes = require('./routes/officialCardRoutes');
const officialJudgeCardRoutes = require('./routes/officialJudgeCardRoutes');
const statisticsRoutes = require('./routes/statisticsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const refereeRoutes = require('./routes/refereeRoutes');
const refereeEvaluationRoutes = require('./routes/refereeEvaluationRoutes');
const profileObservationRoutes = require('./routes/profileObservationRoutes');
const pdfRoutes = require('./routes/pdfRoutes');

// Instancia principal de Express sobre la que se registran rutas y middlewares.
const app = express();

// Habilitamos CORS para que el cliente (en otro puerto/origen) pueda consumir la API.
app.use(cors());
// Parseo automático de cuerpos JSON en las peticiones (req.body).
app.use(express.json());

// Montaje de routers por dominio. Cada prefijo define la "base" de sus endpoints.
app.use('/api/auth', authRoutes);
app.use('/api/fights', fightRoutes);
app.use('/api/judges', judgeRoutes);
app.use('/api/scorecards', scoringRoutes);
app.use('/api/me', meRoutes);
app.use('/api/dashboard', dashboardRoutes);
// Nota: officialCardRoutes y officialJudgeCardRoutes comparten el prefijo
// '/api/fights' porque sus rutas cuelgan de una pelea (:id).
app.use('/api/fights', officialCardRoutes);
app.use('/api/fights', officialJudgeCardRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/referees', refereeRoutes);
app.use('/api/referee-evaluations', refereeEvaluationRoutes);
app.use('/api/profile-observations', profileObservationRoutes);
app.use('/api/profile', pdfRoutes);

// GET /api/health — endpoint de salud para verificar que el backend responde.
app.get('/api/health', (_req, res) => {
  // Devuelve estado 'ok' y la hora del servidor en formato ISO 8601.
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Servir el build del frontend (single-URL con ngrok en plan free)
// Si existe el build compilado del frontend, se sirve como estático.
const distPath = path.join(__dirname, '../../frontend/dist');
if (require('fs').existsSync(distPath)) {
  // Archivos estáticos (JS, CSS, imágenes) desde la carpeta dist.
  app.use(express.static(distPath));

  // Fallback SPA: cualquier ruta no-API devuelve el index.html
  app.get('*', (req, res, next) => {
    // Las rutas /api no deben caer aquí: se delegan a los routers de la API.
    if (req.path.startsWith('/api')) return next();
    // Cualquier otra ruta devuelve el index.html para que React Router la resuelva.
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Middleware de manejo de errores: DEBE registrarse al final, después de las rutas,
// para capturar cualquier error que se propague con next(err).
app.use(errorMiddleware);

// Exportamos la app sin arrancar el servidor: lo hace server.js con app.listen().
module.exports = app;
