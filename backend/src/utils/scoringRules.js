// ─── scoringRules.js — Reglas de puntuación de un round (sistema 10-point-must) ───
// Módulo puro (sin I/O ni acceso a base) con las reglas de sistema de boxeo que
// debe cumplir la puntuación de cada asalto de la tarjeta de un juez:
//
//   * Cada puntaje es un entero entre 6 y 10.
//   * Obligatoriamente UNO de los dos boxeadores recibe 10 puntos
//     (nunca ambos por debajo de 10).
//   * El descuento de puntos NO forma parte de la regla del round: se aplica
//     únicamente sobre el total acumulado de la tarjeta (último conteo).
//
// Estas mismas reglas están replicadas en `frontend/src/utils/scoringRules.js`
// para validar en el cliente; el servidor las vuelve a aplicar y es la única
// capa en la que se confía (nunca se acepta un round sin validar).

// Puntaje mínimo y máximo legal de un round.
const MIN_ROUND_SCORE = 6;
const MAX_ROUND_SCORE = 10;

// Descuentos admitidos por round (en puntos). No forman parte del round: se
// acumulan y se descuentan del total de la tarjeta.
const ALLOWED_DEDUCTIONS = Object.freeze([0, 1, 2]);
const MAX_DEDUCTION = 2;

// Convierte un puntaje recibido (número o string numérico) a entero.
// Devuelve `null` si no hay valor, y `NaN` si el valor no es un entero
// (así el llamador puede distinguir "falta" de "no numérico entero").
const toScore = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : NaN;
};

// Normaliza un descuento recibido: sólo 0, 1 o 2 puntos.
// Devuelve `null` si el valor no es válido (para que el llamador rechace).
const toDeduction = (v) => {
  if (v === undefined || v === null || v === '') return 0;
  const n = Number(v);
  if (!Number.isInteger(n) || !ALLOWED_DEDUCTIONS.includes(n)) return null;
  return n;
};

// Valida el par de puntajes de un round. Devuelve { valid: true } o
// { valid: false, code, message } con el mensaje listo para el cliente.
// Regla: ambos enteros en [6, 10] y el máximo tiene que ser exactamente 10.
const validateRoundScore = (scoreRed, scoreBlue) => {
  const red = toScore(scoreRed);
  const blue = toScore(scoreBlue);

  if (red === null || blue === null) {
    return { valid: false, code: 'SCORE_MISSING', message: 'score_red y score_blue son obligatorios' };
  }

  const outOfRange = [
    ['score_red', red, scoreRed],
    ['score_blue', blue, scoreBlue],
  ].filter(([, n]) => Number.isNaN(n) || n < MIN_ROUND_SCORE || n > MAX_ROUND_SCORE);

  if (outOfRange.length > 0) {
    const [field, , received] = outOfRange[0];
    return {
      valid: false,
      code: Number.isNaN(outOfRange[0][1]) ? 'SCORE_NOT_INTEGER' : 'SCORE_OUT_OF_RANGE',
      message: `${field} debe ser un número entero entre ${MIN_ROUND_SCORE} y ${MAX_ROUND_SCORE} (recibido: ${received})`,
    };
  }

  // 10-point-must: uno de los dos tiene que recibir los 10 puntos del round.
  if (Math.max(red, blue) !== MAX_ROUND_SCORE) {
    return {
      valid: false,
      code: 'MISSING_TEN_POINT_MUST',
      message:
        `En cada round uno de los dos boxeadores debe recibir ${MAX_ROUND_SCORE} puntos ` +
        `(recibido: ${red}-${blue}). Valores válidos: 10-10, 10-9, 10-8, 10-7, 10-6 ` +
        'y sus inversos (9-10, 8-10, 7-10, 6-10).',
    };
  }

  return { valid: true };
};

// `true` si el round tiene un par de puntajes válido.
const isValidRoundScore = (scoreRed, scoreBlue) => validateRoundScore(scoreRed, scoreBlue).valid;

// Suma los totales de una tarjeta separando explícitamente las tres magnitudes
// para no mezclarlas: `roundScore` (suma de los puntajes base de cada round),
// `deductions` (suma de los descuentos) y `finalScore` (= roundScore - deductions,
// que es lo que guarda la tarjeta en `score_cards.total_score_*`).
// `rounds` es un array de { score_red, score_blue, deduction_red, deduction_blue }.
const computeCardTotals = (rounds = []) =>
  rounds.reduce(
    (acc, r) => {
      const dRed = Number(r?.deduction_red || 0);
      const dBlue = Number(r?.deduction_blue || 0);
      acc.roundScore.red += Number(r?.score_red || 0);
      acc.roundScore.blue += Number(r?.score_blue || 0);
      acc.deductions.red += dRed;
      acc.deductions.blue += dBlue;
      acc.finalScore.red += Number(r?.score_red || 0) - dRed;
      acc.finalScore.blue += Number(r?.score_blue || 0) - dBlue;
      return acc;
    },
    {
      roundScore: { red: 0, blue: 0 },
      deductions: { red: 0, blue: 0 },
      finalScore: { red: 0, blue: 0 },
    }
  );

module.exports = {
  MIN_ROUND_SCORE,
  MAX_ROUND_SCORE,
  ALLOWED_DEDUCTIONS,
  MAX_DEDUCTION,
  toScore,
  toDeduction,
  validateRoundScore,
  isValidRoundScore,
  computeCardTotals,
};
