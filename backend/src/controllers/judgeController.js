const User = require('../models/User');
const bcrypt = require('bcryptjs');

// Controlador de jueces — gestión y asignación de jueces
exports.getAll = async (req, res, next) => {
  try {
    const judges = await User.getAllJudges();
    res.json(judges);
  } catch (err) {
    next(err);
  }
};

exports.getById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const judge = await User.findById(id);
    if (!judge) return res.status(404).json({ message: 'Juez no encontrado' });
    if (judge.role !== 'judge') return res.status(400).json({ message: 'El usuario no es un juez' });
    res.json(judge);
  } catch (err) {
    next(err);
  }
};

exports.update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, level, is_active, password } = req.body;

    const judge = await User.findById(id);
    if (!judge) return res.status(404).json({ message: 'Juez no encontrado' });
    if (judge.role !== 'judge') return res.status(400).json({ message: 'No se puede editar un usuario que no sea juez' });

    if (!name || !name.trim()) return res.status(400).json({ message: 'El nombre es obligatorio' });
    if (!email || !email.trim()) return res.status(400).json({ message: 'El email es obligatorio' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return res.status(400).json({ message: 'Email inv\u00e1lido' });

    if (email.toLowerCase() !== judge.email.toLowerCase()) {
      const existing = await User.findByEmail(email);
      if (existing) return res.status(400).json({ message: 'El email ya est\u00e1 registrado por otro usuario' });
    }

    const validLevels = ['junior', 'senior', 'elite'];
    const finalLevel = level || judge.level;
    if (!validLevels.includes(finalLevel)) return res.status(400).json({ message: 'Nivel inv\u00e1lido. Debe ser junior, senior o elite' });

    let password_hash;
    if (password && password.trim()) {
      if (password.length < 6) return res.status(400).json({ message: 'La contrase\u00f1a debe tener al menos 6 caracteres' });
      password_hash = await bcrypt.hash(password, 10);
    }

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
    if (err.code === '23503') {
      return res.status(409).json({ message: 'No se puede eliminar el juez porque tiene datos asociados (asignaciones o puntuaciones)' });
    }
    next(err);
  }
};

exports.assign = (req, res) => {
  // TODO: asignar juez(es) a una pelea
};

exports.getAssignments = (req, res) => {
  // TODO: obtener asignaciones de una pelea
};
