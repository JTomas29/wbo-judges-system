const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

const SALT_ROUNDS = 10;

const authController = {};

authController.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    const validRoles = ['admin', 'supervisor', 'judge'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Rol inválido' });
    }

    const existing = await User.findByEmail(email);
    if (existing) {
      return res.status(409).json({ message: 'El email ya está registrado' });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ name, email, passwordHash, role: role || 'judge' });

    const token = generateToken({ id: user.id, role: user.role });

    res.status(201).json({
      message: 'Usuario registrado exitosamente',
      token,
      user,
    });
  } catch (err) {
    next(err);
  }
};

authController.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son obligatorios' });
    }

    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = generateToken({ id: user.id, role: user.role });

    res.json({
      message: 'Inicio de sesión exitoso',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        is_active: user.is_active,
        created_at: user.created_at,
      },
    });
  } catch (err) {
    next(err);
  }
};

authController.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

module.exports = authController;
