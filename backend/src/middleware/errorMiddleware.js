const errorMiddleware = (err, req, res, next) => {
  console.error('[Error]', err);

  if (err.code === '23505') {
    return res.status(409).json({ message: 'El registro ya existe' });
  }

  if (err.code === '23503') {
    return res.status(400).json({ message: 'Referencia inválida' });
  }

  if (err.code.startsWith('23')) {
    return res.status(400).json({ message: 'Violación de integridad de datos' });
  }

  res.status(err.status || 500).json({
    message: err.message || 'Error interno del servidor',
  });
};

module.exports = errorMiddleware;
