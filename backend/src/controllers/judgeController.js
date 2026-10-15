// ─── judgeController.js — Gestión de jueces (usuarios rol 'judge') ───
// Responsabilidad: CRUD de la entidad de jueces sobre la tabla de usuarios:
// listar, consultar, actualizar y eliminar usuarios con rol 'judge'.

const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Controlador de jueces — gestión y asignación de jueces

// GET /api/judges — Lista todos los jueces del sistema.
// Devuelve: 200 con el array de jueces. Sin errores previstos.
exports.getAll = async (req, res, next) => {
  try {
    const judges = await User.getAllJudges();
    res.json(judges);
  } catch (err) {
    next(err);
  }
};

// GET /api/judges/:id — Devuelve un juez puntual.
// Espera: req.params.id = id de usuario.
// Devuelve: 200 con el juez.
// Errores: 400 (no es juez), 404 (no existe).
exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const judge = await User.findById(id);
    if (!judge) return res.status(404).json({ message: 'Juez no encontrado' });
    // Sólo se permite consultar como juez a usuarios con ese rol.
    if (judge.role !== 'judge') return res.status(400).json({ message: 'El usuario no es un juez' });
    res.json(judge);
  } catch (err) {
    next(err);
  }
};

// PUT /api/judges/:id — Actualiza los datos de un juez.
// Espera: req.params.id; req.body = { name, email, level, is_active, password }.
// Devuelve: 200 con el juez actualizado.
// Errores: 400 (validaciones), 404 (no existe).
exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, level, is_active, password } = req.body;

    const judge = await User.findById(id);
    if (!judge) return res.status(404).json({ message: 'Juez no encontrado' });
    if (judge.role !== 'judge') return res.status(400).json({ message: 'No se puede editar un usuario que no sea juez' });

    // Nombre y email son obligatorios para la edición.
    if (!name || !name.trim()) return res.status(400).json({ message: 'El nombre es obligatorio' });
    if (!email || !email.trim()) return res.status(400).json({ message: 'El email es obligatorio' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ message: 'Email inválido' });

    // Si el email cambia, hay que verificar que no lo use otro usuario;
    // la comparación es case-insensitive para evitar duplicados por mayúsculas.
    if (email.toLowerCase() !== judge.email.toLowerCase()) {
      const existing = await User.findByEmail(email);
      if (existing) return res.status(400).json({ message: 'El email ya está registrado por otro usuario' });
    }

    // El nivel del juez debe ser uno de los 3 admitidos; si no viene en el body,
    // se conserva el actual (default 'junior' como red de seguridad). Estos son
    // exactamente los mismos valores internos que usa la actualización automática
    // fn_update_judge_level() (ENUM judge_level), así que la edición manual y la
    // automática nunca se contradicen.
    const validLevels = ['junior', 'senior', 'elite'];
    const finalLevel = level || judge.level || 'junior';
    if (!validLevels.includes(finalLevel)) {
      return res.status(400).json({ message: 'Nivel inválido. Debe ser junior, senior o elite' });
    }

    // La contraseña solo se re-hashea si se envió un valor nuevo; de lo
    // contrario el campo viaja undefined y el modelo lo ignora.
    let password_hash;
    if (password && password.trim()) {
      if (password.length < 6) return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
      password_hash = await bcrypt.hash(password, 10);
    }

    // Persistimos los cambios; el email se guarda normalizado en minúsculas.
    const updated = await User.updateJudge(id, {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      level: finalLevel,
      is_active: is_active !== undefined ? is_active : judge.is_active,
      password_hash,
    });

    if (!updated) return res.status(400).json({ message: 'No se pudo actualizar el juez' });

    res.json(updated);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/judges/:id — Elimina un juez del sistema.
// Espera: req.params.id.
// Devuelve: 200 con mensaje y juez eliminado.
// Errores: 400 (operación fallida), 404 (no existe o no es juez),
//          409 (violación de FK 23503: tiene datos asociados).
exports.delete = async (req, res, next) => {
  try {
    const { id } = req.params;
    const judge = await User.findById(id);
    if (!judge) return res.status(404).json({ message: 'Juez no encontrado' });
    if (judge.role !== 'judge') return res.status(400).json({ message: 'El usuario no es un juez' });

    const deleted = await User.deleteJudge(id);
    if (!deleted) return res.status(400).json({ message: 'No se pudo eliminar el juez' });

    res.json({ message: 'Juez eliminado correctamente', judge: deleted });
  } catch (err) {
    // Código 23503 de PostgreSQL: violación de integridad referencial, es
    // decir, el juez tiene asignaciones o puntuaciones asociadas.
    if (err.code === '23503') {
      return res.status(409).json({ message: 'No se puede eliminar el juez porque tiene datos asociados (asignaciones o puntuaciones)' });
    }
    next(err);
  }
};
