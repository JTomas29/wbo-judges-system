// ─── errorMiddleware.js — Manejo centralizado de errores de Express ───
// Responsabilidad: capturar cualquier error que se propague con next(err),
// loguearlo y devolver una respuesta JSON homogénea y segura al cliente.

// En producción ocultamos detalles internos (stacks) al cliente por seguridad.
const isProduction = process.env.NODE_ENV === 'production';

const errorMiddleware = (err, req, res, next) => {
  // Express invoca este middleware cuando una ruta llama a next(err).
  // En producción se loguea solo el mensaje; en desarrollo, el stack completo.
  if (isProduction) {
    console.error('[Error]', err.message);
  } else {
    console.error('[Error] Stack:', err.stack);
  }

  // Los errores de PostgreSQL llegan con un código en err.code (string).
  // 23505 = unique_violation → se intentó duplicar un valor único.
  if (err.code === '23505') {
    const detail = err.detail || '';
    // El detalle de Postgres indica qué columna violó la unicidad (p. ej. email).
    if (detail.includes('email')) return res.status(409).json({ message: 'El email ya está registrado' });
    return res.status(409).json({ message: 'El registro ya existe' });
  }

  // 23503 = foreign_key_violation → la FK referenciada no existe.
  if (err.code === '23503') {
    return res.status(400).json({ message: 'Referencia inválida: el registro relacionado no existe' });
  }

  // 23502 = not_null_violation → llegó NULL a un campo obligatorio.
  if (err.code === '23502') {
    return res.status(400).json({ message: 'Violación de campo obligatorio en la base de datos' });
  }

  // 22P02 = invalid_text_representation → valor no numérico en un campo numérico.
  if (err.code === '22P02') {
    return res.status(400).json({ message: 'Valor inválido proporcionado para un campo numérico' });
  }

  // Cualquier otro código de la clase 23 (violaciones de integridad de datos).
  if (err.code && err.code.startsWith('23')) {
    return res.status(400).json({ message: 'Violación de integridad de datos' });
  }

  // Los errores controlados pueden traer su propio status (p. ej. 404 lanzado
  // en un controller); si no, asumimos un error interno de servidor.
  const status = err.status || 500;
  // Respuesta genérica: nunca filtramos el error real al cliente en producción.
  const response = { message: 'Error interno del servidor' };

  // Solo en desarrollo añadimos el mensaje real de los 5xx para depurar mejor.
  if (!isProduction && status >= 500) {
    response.details = err.message;
  }

  res.status(status).json(response);
};

module.exports = errorMiddleware;
