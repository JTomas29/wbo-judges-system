const path = require('path');
const express = require('express');
const cors = require('cors');
const errorMiddleware = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const fightRoutes = require('./routes/fightRoutes');
const judgeRoutes = require('./routes/judgeRoutes');
const scoreRoutes = require('./routes/scoreRoutes');
const analysisRoutes = require('./routes/analysisRoutes');
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

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/fights', fightRoutes);
app.use('/api/judges', judgeRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/scorecards', scoringRoutes);
app.use('/api/me', meRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/fights', officialCardRoutes);
app.use('/api/fights', officialJudgeCardRoutes);
app.use('/api/statistics', statisticsRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/referees', refereeRoutes);
app.use('/api/referee-evaluations', refereeEvaluationRoutes);
app.use('/api/profile-observations', profileObservationRoutes);
app.use('/api/profile', pdfRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Servir el build del frontend (single-URL con ngrok en plan free)
const distPath = path.join(__dirname, '../../frontend/dist');
if (require('fs').existsSync(distPath)) {
  app.use(express.static(distPath));

  // Fallback SPA: cualquier ruta no-API devuelve el index.html
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

app.use(errorMiddleware);

module.exports = app;
