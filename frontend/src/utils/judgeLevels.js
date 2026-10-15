/**
 * judgeLevels.js — Catálogo único de niveles de juez.
 *
 * Fuente de verdad compartida por toda la UI para no repetir (y desincronizar)
 * la lista de niveles en cada pantalla. El sistema maneja exactamente 3 niveles,
 * con la progresión Junior → Senior → Elite:
 *
 *     0%  – 79.99…  →  Junior
 *    80%  – 89.99…  →  Senior
 *    90%  – 100%    →  Elite
 *
 * OJO: el nivel NO es la posición del ranking. Son conceptos independientes
 * (un juez puede ser #3 en el ranking y ser Senior). El ranking se ordena por
 * precisión (`avg_match_pct`); esta constante no participa en esa ordenación.
 *
 * Los valores internos son los del ENUM `judge_level` de PostgreSQL
 * (junior | senior | elite), los mismos que usa la actualización automática
 * `fn_update_judge_level()` y que acepta la edición manual del administrador.
 * `label` es sólo la presentación.
 */

/** Niveles válidos, en orden de progresión. */
export const JUDGE_LEVELS = Object.freeze([
  Object.freeze({ value: 'junior', label: 'Junior' }),
  Object.freeze({ value: 'senior', label: 'Senior' }),
  Object.freeze({ value: 'elite', label: 'Elite' }),
]);

/** Nivel inicial obligatorio de todo juez nuevo. */
export const DEFAULT_JUDGE_LEVEL = 'junior';

/** Set de valores internos válidos, para validaciones. */
export const JUDGE_LEVEL_VALUES = Object.freeze(JUDGE_LEVELS.map((l) => l.value));

const LABELS = Object.freeze(
  JUDGE_LEVELS.reduce((acc, l) => ({ ...acc, [l.value]: l.label }), {})
);

/**
 * Devuelve 'junior' | 'senior' | 'elite' para cualquier entrada.
 * Ante un valor ausente o desconocido (nivel NULL en datos viejos, por ejemplo)
 * cae en 'junior', el nivel inicial por definición, de modo que la UI nunca
 * muestre un cuarto nivel inexistente.
 */
export const normalizeJudgeLevel = (level) => {
  const key = String(level ?? '').trim().toLowerCase();
  return JUDGE_LEVEL_VALUES.includes(key) ? key : DEFAULT_JUDGE_LEVEL;
};

/** Etiqueta a mostrar ('Junior' | 'Senior' | 'Elite'). */
export const judgeLevelLabel = (level) => LABELS[normalizeJudgeLevel(level)];

/** Opciones para los <select> de filtro de nivel. */
export const JUDGE_LEVEL_OPTIONS = JUDGE_LEVELS.map(({ value, label }) => ({ value, label }));
