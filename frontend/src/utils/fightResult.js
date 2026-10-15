/**
 * fightResult.js — Utilidades puras para tipificar el resultado de una pelea.
 *
 * No hace llamadas de red. Centraliza la lógica de "resultado temprano"
 * (KO/TKO/RTD/DQ/NC), el estado que muestra el juez según el estado de la pelea
 * y el formato legible del resultado para la UI.
 */

// Mapa resultado → etiqueta corta usada en badges/encabezados de la UI.
export const RESULT_TYPE_LABELS = {
  decision: 'Decision',
  ko: 'KO',
  tko: 'TKO',
  rtd: 'RTD',
  dq: 'DQ',
  nc: 'NC',
};

// Opciones que alimentan selects (valor + texto legible). Nota: la opción
// "Decision" se incluye al final aunque el label venga primero en el mapa.
export const RESULT_TYPE_OPTIONS = [
  { value: 'ko', label: 'Knockout (KO)' },
  { value: 'tko', label: 'Technical Knockout (TKO)' },
  { value: 'rtd', label: 'Retirement (RTD)' },
  { value: 'dq', label: 'Disqualification (DQ)' },
  { value: 'nc', label: 'No Contest (NC)' },
  { value: 'decision', label: 'Decision' },
];

// Tipos de resultado que terminan la pelea antes de la distancia completa.
export const EARLY_RESULT_TYPES = ['ko', 'tko', 'rtd', 'dq', 'nc'];

// Devuelve true si la pelea tiene un resultado temprano registrado (falsy-safe:
// si fight o result_type no existen, no sabemos aún el resultado).
export const isEarlyResult = (fight) =>
  !!fight?.result_type && EARLY_RESULT_TYPES.includes(fight.result_type);

// Estado de una asignación para el juez. Si la pelea terminó anticipadamente
// (KO/TKO/RTD/DQ/NC) sigue siendo puntuable hasta el round de finalización.
export const getFightState = (a) => {
  // Pelea en curso: el juez puede puntuar; si su tarjeta fue finalizada,
  // el estado pasa a 'finalized' para la vista del juez.
  if (a.fight_status === 'active') {
    return a.scorecard_status === 'finalized' ? 'finalized' : 'active';
  }
  // Pelea completada: si fue resultado temprano y la tarjeta del juez sigue
  // abierta, aún puede puntuarla; si no, se considera definitivamente 'completed'.
  if (a.fight_status === 'completed') {
    if (isEarlyResult(a)) {
      return a.scorecard_status === 'finalized' ? 'finalized' : 'active';
    }
    return 'completed';
  }
  // Análisis ya procesado (post-completado).
  if (a.fight_status === 'analyzed') return 'analyzed';
  // Cualquier otro caso (pelea futura/programada) = pendiente de asignación.
  return 'pending';
};

// Rounds "efectivos" a puntuar: en un resultado temprano solo se puntúa hasta
// el round en que terminó (result_round); si no, la distancia completa.
export const getEffectiveTotalRounds = (fight) => {
  if (isEarlyResult(fight) && fight.result_round) return Number(fight.result_round);
  return Number(fight?.total_rounds) || 0;
};
