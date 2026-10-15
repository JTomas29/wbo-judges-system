// ─── jwt.js — Utilidades de generación y verificación de tokens JWT ───
// Responsabilidad: centralizar la creación y validación de los tokens JWT
// que usa el sistema para autenticar a los usuarios en cada petición.

const jwt = require('jsonwebtoken');

// Secreto con el que se firman los tokens; debe definirse en el .env
// (variable obligatoria, sin valor por defecto por seguridad).
const JWT_SECRET = process.env.JWT_SECRET;
// Vida útil de cada token; por defecto 8 horas.
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// Firma un token con la expiración configurada.
// El payload suele contener { id, role } del usuario autenticado.
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Verifica la firma y la expiración de un token.
// Devuelve el payload decodificado o lanza un error
// (TokenExpiredError o JsonWebTokenError según el caso).
const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = { generateToken, verifyToken };
