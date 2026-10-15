// ─── authController.js — Registro, login y sesión ───
// Responsabilidad: autenticación del sistema. Permite registrar usuarios,
// iniciar sesión (generando el JWT con su id y rol) y consultar el usuario
// autenticado actual. Las contraseñas se guardan siempre hasheadas con bcrypt.

const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { generateToken } = require('../utils/jwt');

// Coste de hashing bcrypt: a mayor valor, más seguro pero más lento.
const SALT_ROUNDS = 10;

const authController = {};

// POST /api/auth/register
// Alta de un nuevo usuario.
// Espera: req.body = { name, email, password, role }.
// Devuelve: 201 con { message, token, user }.
// Errores: 400 (campos/email/contraseña/rol inválidos), 409 (email en uso).
authController.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    // Todos los campos básicos son obligatorios; se trimean para evitar
    // espacios en blanco que parezcan datos válidos.
    if (!name || !name.trim() || !email || !email.trim() || !password) {
      return res.status(400).json({ message: 'Todos los campos son obligatorios' });
    }

    // Validación de formato de email; rechaza cadenas sin @ o dominio.
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      return res.status(400).json({ message: 'Email inválido' });
    }

    // Política mínima de seguridad de contraseñas.
    if (password.length < 6) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 6 caracteres' });
    }

    // Solo se permiten los roles que el sistema conoce. Si no se envía rol,
    // se asume 'judge' más adelante.
    const validRoles = ['admin', 'supervisor', 'judge'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Rol inválido' });
    }

    // Control de unicidad por email; evita cuentas duplicadas.
    const existing = await User.findByEmail(email.trim());
    if (existing) {
      return res.status(409).json({ message: 'El email ya está registrado' });
    }

    // Se guarda el hash de la contraseña, nunca en texto plano.
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({ name: name.trim(), email: email.trim(), passwordHash, role: role || 'judge' });

    // El token lleva el id y rol en el payload para autorizar rutas.
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

// POST /api/auth/login
// Inicio de sesión: valida credenciales y devuelve el JWT.
// Espera: req.body = { email, password }.
// Devuelve: 200 con { message, token, user }.
// Errores: 400 (campos faltantes), 401 (credenciales inválidas).
authController.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email y contraseña son obligatorios' });
    }

    // Buscamos el usuario por email; mismo mensaje para usuario inexistente
    // o contraseña incorrecta para no revelar qué dato falló.
    const user = await User.findByEmail(email);
    if (!user) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Comparación del hash: bcrypt.compare verifica contra el hash guardado.
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    // Generamos el token de sesión con el rol para el control de acceso.
    const token = generateToken({ id: user.id, role: user.role });

    // Devolvemos sólo los campos públicos del usuario (nunca el hash).
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

// GET /api/auth/me
// Devuelve el perfil del usuario autenticado.
// Espera: req.user.id (inyectado por authMiddleware).
// Devuelve: 200 con { user }.
// Errores: 404 (usuario no encontrado).
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
