const isProduction = process.env.NODE_ENV === 'production';

const errorMiddleware = (err, req, res, next) => {
  if (isProduction) {
    console.error('[Error]', err.message);
  } else {
    console.error('[Error] Stack:', err.stack);
  }

  if (err.code === '23505') {
    const detail = err.detail || '';
    if (detail.includes('email')) return res.status(409).json({ message: 'El email ya está registrado' });
    return res.status(409).json({ message: 'El registro ya existe' });
  }

  if (err.code === '23503') {
    return res.status(400).json({ message: 'Referencia inválida: el registro relacionado no existe' });
  }

  if (err.code === '23502') {
    return res.status(400).json({ message: 'Violación de campo obligatorio en la base de datos' });
  }

  if (err.code === '22P02') {
    return res.status(400).json({ message: 'Valor inválido proporcionado para un campo numérico' });
  }

  if (err.code && err.code.startsWith('23')) {
    return res.status(400).json({ message: 'Violación de integridad de datos' });
  }

  const status = err.status || 500;
  const response = { message: 'Error interno del servidor' };

  if (!isProduction && status >= 500) {
    response.details = err.message;
  }

  res.status(status).json(response);
};

module.exports = errorMiddleware;
