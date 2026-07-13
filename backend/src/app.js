const express = require('express');
const cors = require('cors');
const errorMiddleware = require('./middleware/errorMiddleware');

const authRoutes = require('./routes/authRoutes');
const fightRoutes = require('./routes/fightRoutes');
const judgeRoutes = require('./routes/judgeRoutes');
const scoreRoutes = require('./routes/scoreRoutes');
const analysisRoutes = require('./routes/analysisRoutes');
const meRoutes = require('./routes/meRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/fights', fightRoutes);
app.use('/api/judges', judgeRoutes);
app.use('/api/scores', scoreRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/me', meRoutes);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorMiddleware);

module.exports = app;
