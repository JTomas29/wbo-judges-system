export const RESULT_TYPE_LABELS = {
  decision: 'Decisión',
  ko: 'KO',
  tko: 'TKO',
  rtd: 'RTD',
  dq: 'DQ',
  nc: 'NC',
};

export const RESULT_TYPE_OPTIONS = [
  { value: 'ko', label: 'Nocaut (KO)' },
  { value: 'tko', label: 'Nocaut técnico (TKO)' },
  { value: 'rtd', label: 'Abandono (RTD)' },
  { value: 'dq', label: 'Descalificación (DQ)' },
  { value: 'nc', label: 'Sin decisión (NC)' },
  { value: 'decision', label: 'Decisión' },
];

export const EARLY_RESULT_TYPES = ['ko', 'tko', 'rtd', 'dq', 'nc'];

export const isEarlyResult = (fight) =>
  !!fight?.result_type && EARLY_RESULT_TYPES.includes(fight.result_type);

export const getEffectiveTotalRounds = (fight) => {
  if (isEarlyResult(fight) && fight.result_round) return Number(fight.result_round);
  return Number(fight?.total_rounds) || 0;
};

export const formatFightResult = (fight) => {
  if (!fight?.result_type) return null;
  const type = RESULT_TYPE_LABELS[fight.result_type] || fight.result_type;
  const winner = fight.result_winner ? `Ganador: ${fight.result_winner}` : 'Sin decisión';
  const detail = isEarlyResult(fight)
    ? `R${fight.result_round} · ${fight.result_time || '--:--'}`
    : null;
  return { type, winner, detail };
};
