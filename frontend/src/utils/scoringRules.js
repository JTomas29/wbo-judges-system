/**
 * scoringRules.js — Reglas de puntuación de un round (sistema 10-point-must).
 *
 * Módulo puro (sin llamadas de red) replicando exactamente las reglas que
 * aplica el backend en `backend/src/utils/scoringRules.js`. Existe para dar
 * feedback inmediato en el formulario y evitar un round trip por cada tecla;
 * la validación real sigue estando en el servidor.
 *
 * Reglas de un round:
 *   * Cada puntaje es un entero entre 6 y 10.
 *   * Obligatoriamente UNO de los dos boxeadores recibe 10 puntos.
 *   * El descuento NO participa de la regla del round: se aplica sólo sobre el
 *     total acumulado de la tarjeta (último conteo), nunca al round.
 */

// Puntaje mínimo y máximo legal de un round.
export const MIN_ROUND_SCORE = 6;
export const MAX_ROUND_SCORE = 10;

// Descuentos admitidos por round (en puntos), aplicados al total de la tarjeta.
export const ALLOWED_DEDUCTIONS = Object.freeze([0, 1, 2]);
export const MAX_DEDUCTION = 2;

// Convierte un puntaje del formulario (número o string) a entero.
// Devuelve `null` si está vacío y `NaN` si no es un entero.
const toScore = (v) => {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isInteger(n) ? n : NaN;
};

// Normaliza un descuento del selector (0, 1 o 2). `null` si el valor es inválido.
export const toDeduction = (v) => {
  if (v === undefined || v === null || v === '') return 0;
  const n = Number(v);
  if (!Number.isInteger(n) || !ALLOWED_DEDUCTIONS.includes(n)) return null;
  return n;
};

// Valida el par de puntajes de un round. Devuelve `{ valid: true }` o
// `{ valid: false, code, message }` con el mensaje listo para la UI.
export const validateRoundScore = (scoreRed, scoreBlue) => {
  const red = toScore(scoreRed);
  const blue = toScore(scoreBlue);

  if (red === null || blue === null) {
    return { valid: false, code: 'SCORE_MISSING', message: 'Enter the score for both boxers' };
  }

  const outOfRange = [
    ['Red', red, scoreRed],
    ['Blue', blue, scoreBlue],
  ].filter(([, n]) => Number.isNaN(n) || n < MIN_ROUND_SCORE || n > MAX_ROUND_SCORE);

  if (outOfRange.length > 0) {
    const [side, , received] = outOfRange[0];
    return {
      valid: false,
      code: Number.isNaN(outOfRange[0][1]) ? 'SCORE_NOT_INTEGER' : 'SCORE_OUT_OF_RANGE',
      message: `${side} score must be a whole number between ${MIN_ROUND_SCORE} and ${MAX_ROUND_SCORE} (received: ${received})`,
    };
  }

  // 10-point-must: uno de los dos tiene que recibir los 10 puntos del round.
  if (Math.max(red, blue) !== MAX_ROUND_SCORE) {
    return {
      valid: false,
      code: 'MISSING_TEN_POINT_MUST',
      message:
        `One boxer must get ${MAX_ROUND_SCORE} points. Valid: 10-10, 10-9, 10-8, 10-7, 10-6 ` +
        'and the reverse (9-10, 8-10, 7-10, 6-10).',
    };
  }

  return { valid: true };
};

// `true` si el round tiene un par de puntajes válido.
export const isValidRoundScore = (scoreRed, scoreBlue) => validateRoundScore(scoreRed, scoreBlue).valid;

// Totales de la tarjeta separando las tres magnitudes, para no mezclarlas:
//   roundScore   → suma de los puntajes base de cada round (lo que se ve en el round)
//   deductions   → suma de los descuentos cargados
//   finalScore   → roundScore - deductions (lo que muestra la tarjeta finalizada)
// `rounds` es un array de { score_red, score_blue, deduction_red, deduction_blue }.
export const computeCardTotals = (rounds = []) =>
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
