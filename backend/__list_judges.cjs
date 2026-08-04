const { pool } = require('./src/config/db');
(async () => {
  const r = await pool.query("SELECT id, name FROM users WHERE role = 'judge' ORDER BY id LIMIT 12");
  console.log(JSON.stringify(r.rows));
  await pool.end();
})().catch((e) => { console.error(e.message); process.exit(1); });
