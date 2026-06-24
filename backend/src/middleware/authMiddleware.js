// Middleware de autenticación — verifica JWT en el header Authorization
const authMiddleware = (req, res, next) => {
  // TODO: extraer token, verificar con jwt.verify, adjuntar usuario a req.user
  next();
};

module.exports = authMiddleware;
