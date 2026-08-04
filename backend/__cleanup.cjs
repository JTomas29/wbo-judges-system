const { pool } = require('./src/config/db');
const ids = [61, 62];
const queries = [
  `DELETE FROM official_round_scores WHERE official_card_id IN (SELECT id FROM official_cards WHERE fight_id = ANY($1))`,
  `DELETE FROM official_cards WHERE fight_id = ANY($1)`,
  `DELETE FROM round_scores WHERE score_card_id IN (SELECT id FROM score_cards WHERE fight_id = ANY($1))`,
  `DELETE FROM score_cards WHERE fight_id = ANY($1)`,
  `DELETE FROM analysis_results WHERE fight_id = ANY($1)`,
  `DELETE FROM judge_consistency WHERE fight_id = ANY($1)`,
  `DELETE FROM notifications WHERE reference_type = 'fight' AND reference_id = ANY($1)`,
  `DELETE FROM judge_assignments WHERE fight_id = ANY($1)`,
  `DELETE FROM fights WHERE id = ANY($1)`,
];
(async () => {
  for (const q of queries) {
    await pool.query(q, [ids]);
  }
  console.log('CLEANED test fights', ids.join(','));
  await pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
