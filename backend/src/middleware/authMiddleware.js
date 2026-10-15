// ─── authMiddleware.js — Autenticación vía JWT (Bearer token) ───
// Responsabilidad: validar el token JWT de cada petición protegida y
// adjuntar el usuario autenticado (id y rol) a req.user para los siguientes
// middlewares (p. ej. roleMiddleware) y controllers.

const { verifyToken } = require('../utils/jwt');

const authMiddleware = (req, res, next) => {
  try {
    // El token debe viajar en el header 'Authorization' con el prefijo "Bearer ".
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // 401: no hay credenciales de autenticación válidas.
      return res.status(401).json({ message: 'Token no proporcionado' });
    }

    // Extraemos únicamente la parte del token (todo lo que va después de "Bearer ").
    const token = authHeader.split(' ')[1];
    // Verifica la firma y la expiración; lanza excepción si es inválido o expirado.
    const decoded = verifyToken(token);

    // Adjuntamos el usuario al request para que el resto de la cadena
    // no tenga que volver a leer ni decodificar el token.
    req.user = { id: decoded.id, role: decoded.role };
    next();
  } catch (err) {
    // Diferenciamos el mensaje según el motivo concreto del fallo.
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado' });
    }
    return res.status(401).json({ message: 'Token inválido' });
  }
};

module.exports = authMiddleware;
