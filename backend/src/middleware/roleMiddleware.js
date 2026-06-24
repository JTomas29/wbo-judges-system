const roleMiddleware = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Acceso denegado. Se requiere uno de los roles: ${allowedRoles.join(', ')}`,
      });
    }

    next();
  };
};

module.exports = roleMiddleware;
