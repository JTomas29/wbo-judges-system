// Middleware de errores — captura y formatea errores de la aplicación
const errorMiddleware = (err, req, res, next) => {
  // TODO: registrar error y devolver respuesta JSON con código y mensaje
  res.status(err.status || 500).json({
    message: err.message || 'Error interno del servidor',
  });
};

module.exports = errorMiddleware;
