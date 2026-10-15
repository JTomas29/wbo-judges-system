// ─── roleMiddleware.js — Autorización por roles (RBAC) ───
// Responsabilidad: restringir el acceso a un endpoint solo a los roles permitidos.
// Debe ejecutarse SIEMPRE después de authMiddleware, porque depende de req.user.

const roleMiddleware = (...allowedRoles) => {
  // Retorna un middleware que verifica el rol del usuario autenticado.
  return (req, res, next) => {
    // Si no existe req.user es que la petición no pasó por authMiddleware
    // (o el token no era válido): no está autenticado.
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    // Si el rol del usuario no está entre los permitidos → 403 Forbidden.
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Acceso denegado. Se requiere uno de los roles: ${allowedRoles.join(', ')}`,
      });
    }

    // Rol autorizado: continúa con el siguiente middleware o controller.
    next();
  };
};

module.exports = roleMiddleware;
