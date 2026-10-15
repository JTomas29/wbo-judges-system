// ─── seed.js — Poblado inicial de la base de datos (usuarios de prueba) ───
// Responsabilidad: crear los usuarios base del sistema (admin, supervisor y jueces)
// con contraseñas hasheadas. Es idempotente: si un email ya existe, lo salta sin error.

const path = require('path');
// Carga el .env usando una ruta absoluta para que funcione desde cualquier carpeta.
require('dotenv').config({ path: path.join(__dirname, '../.env') });

// Pool de PostgreSQL reutilizado desde config/db para ejecutar las consultas.
const { pool } = require('./config/db');
// bcryptjs genera el hash de las contraseñas (aquí con 10 rondas de sal).
const bcrypt = require('bcryptjs');

const seed = async () => {
  // Tomamos un cliente dedicado del pool para las operaciones del seed.
  const client = await pool.connect();

  try {
    console.log('Ejecutando seed de datos...');

    // Datos maestros: usuarios iniciales del sistema con su rol asignado.
    const users = [
      { name: 'Admin WBO', email: 'admin@wbo.com', password: 'admin123', role: 'admin' },
      { name: 'Supervisor WBO', email: 'supervisor@wbo.com', password: 'super123', role: 'supervisor' },
      { name: 'Ricardo Méndez', email: 'rmendez@wbo.com', password: 'juez123', role: 'judge' },
      { name: 'Ana Flores', email: 'aflores@wbo.com', password: 'juez123', role: 'judge' },
      { name: 'Laura Vega', email: 'lvega@wbo.com', password: 'juez123', role: 'judge' },
      { name: 'Pedro Sánchez', email: 'psanchez@wbo.com', password: 'juez123', role: 'judge' },
      { name: 'Jorge Ríos', email: 'jrios@wbo.com', password: 'juez123', role: 'judge' },
    ];

    for (const u of users) {
      // Comprobamos si el email ya existe para no duplicar usuarios
      // (esto hace que el seed se pueda re-ejecutar sin problemas).
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [u.email]);
      if (existing.rows.length > 0) {
        console.log(`  ↻ ${u.email} — ya existe, saltando`);
        continue;
      }

      // Nunca se guarda la contraseña en texto plano: calculamos su hash.
      const hash = await bcrypt.hash(u.password, 10);
      // Insertamos el usuario con su hash y su rol.
      await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)`,
        [u.name, u.email, hash, u.role]
      );
      console.log(`  ✓ ${u.email} — creado como ${u.role}`);
    }

    console.log('Seed completado exitosamente.');
  } catch (err) {
    // Cualquier error (p. ej. tablas aún no creadas) se loguea sin interrumpir el proceso.
    console.error('Error en seed:', err);
  } finally {
    // Liberamos el cliente del pool y cerramos el pool para terminar el proceso limpio.
    client.release();
    await pool.end();
  }
};

// Ejecutamos el seed al lanzar el script (node src/seed.js).
seed();
