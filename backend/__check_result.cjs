const { pool } = require('./src/config/db');

(async () => {
  try {
    const fights = await pool.query(`
      SELECT id, event_name, total_rounds, status::text, result_type::text, result_winner, result_round, result_time
      FROM fights
      WHERE id = 9
    `);
    console.log('FIGHT9_STATE:', JSON.stringify(fights.rows[0]));
  } catch (e) {
    console.error('ERR:', e.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
