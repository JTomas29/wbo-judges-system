// Middleware de roles — restringe acceso según el rol del usuario
const roleMiddleware = (...roles) => {
  return (req, res, next) => {
    // TODO: verificar que req.user.role esté incluido en roles
    next();
  };
};

module.exports = roleMiddleware;
