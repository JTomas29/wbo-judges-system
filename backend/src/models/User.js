// ─── User.js — Modelo de usuarios: administradores y jueces del sistema.
// ─── CRUD de jueces, autenticación (búsqueda por email/por id) y el alta de
// ─── cuentas nuevas. El hash de contraseña solo se expone en el login ───
const { pool } = require('../config/db');

const User = {};

// Busca un usuario para el login. Filtro `is_active = TRUE` (los desactivados no
// pueden autenticarse) e incluye `password_hash`, que es el único método que lo
// expone: aquí se compara la contraseña en la capa de autenticación.
User.findByEmail = async (email) => {
  const { rows } = await pool.query(
    `SELECT id, name, email, role, level::text AS level, is_active, created_at, password_hash
     FROM users WHERE email = $1 AND is_active = TRUE`,
    [email]
  );
  return rows[0] || null;
};

// Usuario por id. A diferencia de `findByEmail`, NUNCA devuelve el password_hash
// (el perfil propio y el del admin no deben exponerlo). Devuelve null si no existe.
User.findById = async (id) => {
  const { rows } = await pool.query(
    "SELECT id, name, email, role, level::text AS level, is_active, created_at FROM users WHERE id = $1",
    [id]
  );
  return rows[0] || null;
};

// Actualiza un juez (cast de `level` al enum judge_level) y, si viene un nuevo
// `password_hash`, lo incluye en el UPDATE; en caso contrario no toca la
// contraseña. El `AND role = 'judge'` restringe la operación solo a cuentas de
// juez (previene editar admins aquí). Devuelve la fila o null si no existe/no
// es juez.
User.updateJudge = async (id, data) => {
  let query, params;
  if (data.password_hash) {
    query = `UPDATE users SET name = $1, email = $2, level = $3::judge_level, is_active = $4, password_hash = $5 WHERE id = $6 AND role = 'judge'
      RETURNING id, name, email, role, level::text AS level, is_active, created_at`;
    params = [data.name, data.email, data.level, data.is_active, data.password_hash, id];
  } else {
    query = `UPDATE users SET name = $1, email = $2, level = $3::judge_level, is_active = $4 WHERE id = $5 AND role = 'judge'
      RETURNING id, name, email, role, level::text AS level, is_active, created_at`;
    params = [data.name, data.email, data.level, data.is_active, id];
  }
  const { rows } = await pool.query(query, params);
  return rows[0] || null;
};

// Crea un usuario nuevo (admin o juez) con su password_hash ya hasheado; el
// rol lo decide el llamador. Devuelve la fila creada sin exponer el hash.
//
// El nivel NO se fija aquí: lo resuelve el DEFAULT 'junior' de la columna
// `users.level` (migration_022), que es el único lugar donde vive la regla del
// nivel inicial. Así no hay lógica duplicada entre la app y la base. El nivel
// real (junior/senior/elite) lo recalcula después fn_update_judge_level() cuando
// ya existan análisis válidos de la pelea.
User.create = async ({ name, email, passwordHash, role }) => {
  const { rows } = await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ($1, $2, $3, $4)
     RETURNING id, name, email, role, level::text AS level, is_active, created_at`,
    [name, email, passwordHash, role]
  );
  return rows[0];
};

// Elimina una cuenta de juez. `AND role = 'judge'` evita borrar administradores.
// No devuelve el hash; null si el id no existía o no era un juez.
User.deleteJudge = async (id) => {
  const { rows } = await pool.query(
    `DELETE FROM users WHERE id = $1 AND role = 'judge' RETURNING id, name, email`,
    [id]
  );
  return rows[0] || null;
};

// Catálogo de jueces para los paneles de administración: solo cuentas con
// role 'judge', ordenadas alfabéticamente, sin datos sensibles.
User.getAllJudges = async () => {
  const { rows } = await pool.query(
    "SELECT id, name, email, role, level::text AS level, is_active FROM users WHERE role = 'judge' ORDER BY name"
  );
  return rows;
};

module.exports = User;
