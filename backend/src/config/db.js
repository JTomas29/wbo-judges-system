const { Pool } = require('pg');

const {
  DB_HOST = '127.0.0.1',
  DB_PORT = '5435',
  DB_NAME = 'wbo_judges',
  DB_USER = 'postgres',
  DB_PASSWORD = 'postgres',
} = process.env;

const pool = new Pool({
  host: DB_HOST,
  port: parseInt(DB_PORT, 10),
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
});

module.exports = { pool };
