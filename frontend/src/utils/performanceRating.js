/**
 * performanceRating.js — Clasificación de rendimiento por CANTIDAD DE ERRORES.
 *
 * Fuente de verdad compartida por perfil e historial para que ambos componentes
 * muestren exactamente la misma clasificación (antes cada uno tenía la suya y
 * además existían dos funciones distintas por porcentaje con etiquetas que se
 * contradecían entre sí).
 *
 * La clasificación se deriva SIEMPRE de un entero de errores, nunca de un
 * porcentaje redondeado:
 *
 *     0 errores      →  Excelente   (Excellent)
 *     1 error        →  Muy bueno   (Very good)
 *     2 errores      →  Bueno       (Good)
 *     3 errores      →  Regular     (Fair)
 *     4 o más errores → Malo       (Poor)
 *
 * La fuente del entero es `analysis_results.errors`: los rounds efectivos en los
 * que los puntajes finales del juez difieren de la tarjeta oficial de referencia
 * (`official_round_scores`) del supervisor.
 *
 * OJO — no confundir con otras métricas del sistema:
 *   - `errors`            → cantidad de rounds con puntaje distinto (esto).
 *   - `match_pct`         → porcentaje de acierto EXACTO. Otra métrica.
 *   - SAME (WINNER)       → el juez acertó el ganador pero no el puntaje.
 *                            Cuenta como error en esta clasificación, porque el
 *                            puntaje del round no coincidió.
 *   - `judge_consistency` → coincidencia ENTRE pares de jueces (no contra la
 *                            tarjeta oficial). Métrica distinta, no se usa acá.
 */

/**
 * Bandas ordenadas por cantidad de errores. `minErrors` es el umbral de entrada
 * de la banda; la última aplica para todo `>= minErrors` (4 o más).
 */
export const PERFORMANCE_RATINGS = Object.freeze([
  Object.freeze({
    minErrors: 0,
    label: 'Excellent',
    emoji: '🥇',
    color: 'text-green-700 dark:text-green-300',
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800/50',
    bar: 'bg-gradient-to-r from-green-500 to-emerald-400',
  }),
  Object.freeze({
    minErrors: 1,
    label: 'Very good',
    emoji: '🥈',
    color: 'text-lime-700 dark:text-lime-300',
    bg: 'bg-lime-50 dark:bg-lime-900/20',
    border: 'border-lime-200 dark:border-lime-800/50',
    bar: 'bg-gradient-to-r from-lime-500 to-green-400',
  }),
  Object.freeze({
    minErrors: 2,
    label: 'Good',
    emoji: '🥉',
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800/50',
    bar: 'bg-gradient-to-r from-amber-500 to-yellow-400',
  }),
  Object.freeze({
    minErrors: 3,
    label: 'Fair',
    emoji: '⚠️',
    color: 'text-orange-700 dark:text-orange-300',
    bg: 'bg-orange-50 dark:bg-orange-900/20',
    border: 'border-orange-200 dark:border-orange-800/50',
    bar: 'bg-gradient-to-r from-orange-500 to-amber-400',
  }),
  Object.freeze({
    minErrors: 4,
    label: 'Poor',
    emoji: '🔻',
    color: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800/50',
    bar: 'bg-gradient-to-r from-red-500 to-rose-400',
  }),
]);

const LAST_RATING = PERFORMANCE_RATINGS[PERFORMANCE_RATINGS.length - 1];

/**
 * Normaliza la entrada a un entero de errores no negativo.
 * `null` / `undefined` / NaN → 0, para que un dato ausente nunca se muestre
 * como "Malo" ni rompa la tabla.
 */
export const normalizeErrorCount = (errorCount) => {
  const n = Number(errorCount);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
};

/**
 * Devuelve la banda de rendimiento correspondiente a la cantidad de errores.
 * Siempre devuelve una banda válida (nunca undefined).
 *
 * Las bandas están ordenadas de menor a mayor umbral, así que se recorre de
 * atrás hacia adelante: la banda elegida es la de mayor umbral que la cantidad
 * de errores alcanza (y la última, "Poor", absorbe los 4 o más).
 */
export const getPerformanceRating = (errorCount) => {
  const errors = normalizeErrorCount(errorCount);
  for (let i = PERFORMANCE_RATINGS.length - 1; i >= 0; i -= 1) {
    if (errors >= PERFORMANCE_RATINGS[i].minErrors) return PERFORMANCE_RATINGS[i];
  }
  return LAST_RATING;
};

/**
 * RATING_SIN_DATOS — etiqueta para cuando NO hay peleas analizadas.
 *
 * Importante: sin peleas el total de errores es 0, y 0 errores por definición da
 * "Excelente". Mostrar eso sería afirmar que un juez sin un solo round evaluado
 * rinde excelentemente. Por eso el perfil usa esta banda aparte cuando
 * total_fights === 0, en lugar de la clasificación real.
 */
export const RATING_SIN_DATOS = Object.freeze({
  label: 'No data yet',
  emoji: '—',
  bg: 'bg-slate-100 dark:bg-slate-700/40',
  color: 'text-slate-600 dark:text-slate-300',
  border: 'border-slate-200 dark:border-slate-600/60',
});

/**
 * Agrega los errores de varios jueces para la inconsistencia general de una
 * pelea. Reutiliza `getPerformanceRating` para no duplicar la tabla de bandas.
 * @param {number|Array<number>} errorsOrList entero, o lista de errores por juez
 */
export const getOverallInconsistencyRating = (errorsOrList) => {
  const total = Array.isArray(errorsOrList)
    ? errorsOrList.reduce((sum, e) => sum + normalizeErrorCount(e), 0)
    : normalizeErrorCount(errorsOrList);
  return { totalErrors: total, ...getPerformanceRating(total) };
};