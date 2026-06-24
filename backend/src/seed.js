const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { pool } = require('./config/db');
const bcrypt = require('bcryptjs');

const seed = async () => {
  const client = await pool.connect();

  try {
    console.log('Ejecutando seed de datos...');

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
      const existing = await pool.query('SELECT id FROM users WHERE email = $1', [u.email]);
      if (existing.rows.length > 0) {
        console.log(`  ↻ ${u.email} — ya existe, saltando`);
        continue;
      }

      const hash = await bcrypt.hash(u.password, 10);
      await pool.query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)`,
        [u.name, u.email, hash, u.role]
      );
      console.log(`  ✓ ${u.email} — creado como ${u.role}`);
    }

    console.log('Seed completado exitosamente.');
  } catch (err) {
    console.error('Error en seed:', err);
  } finally {
    client.release();
    await pool.end();
  }
};

seed();
