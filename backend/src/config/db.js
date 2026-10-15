// ─── db.js — Pool de conexiones a PostgreSQL ───
// Responsabilidad: centralizar la configuración de conexión a la base de datos
// en un único pool reutilizable por todos los modelos del backend.

// 'Pool' mantiene un conjunto de conexiones reutilizables a PostgreSQL,
// mejorando el rendimiento frente a abrir una conexión por cada consulta.
const { Pool } = require('pg');

// Configuración de conexión con valores por defecto (se usan si no vienen del .env).
// Entorno del proyecto: PostgreSQL en 127.0.0.1:5435, base de datos 'wbo_judges'.
const {
  DB_HOST = '127.0.0.1',
  DB_PORT = '5435',
  DB_NAME = 'wbo_judges',
  DB_USER = 'postgres',
  DB_PASSWORD = 'postgres',
} = process.env;

// Creamos el pool único de la aplicación con esas credenciales.
const pool = new Pool({
  host: DB_HOST,
  // El puerto llega como string desde el .env pero PostgreSQL espera un número.
  port: parseInt(DB_PORT, 10),
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  // Máximo de conexiones simultáneas que puede mantener el pool.
  max: 20,
  // Una conexión inactiva durante más de 30s se cierra para liberar recursos.
  idleTimeoutMillis: 30000,
  // Tiempo máximo de espera (5s) para obtener una conexión antes de lanzar error.
  connectionTimeoutMillis: 5000,
});

// Errores de bajo nivel del pool (caída de red, servidor caído, etc.) se loguean
// para no matar silenciosamente el proceso de Node.
pool.on('error', (err) => {
  console.error('Error inesperado en el pool de PostgreSQL:', err);
});

// Exportamos el pool para que los modelos y scripts (p. ej. seed.js) lo reutilicen.
module.exports = { pool };
