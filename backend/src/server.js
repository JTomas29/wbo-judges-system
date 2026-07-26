require('dotenv').config();

const app = require('./app');

app.get('/version', (_req, res) => {
  res.json({ version: 'backend-nuevo-2026-07-26', time: new Date() });
  console.log('=== ENDPOINT /version ACCESSED ===');
});

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`BACKEND ACTIVO - VERSION NUEVA - Puerto ${PORT}`);
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
