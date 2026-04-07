require('dotenv').config();
const { pool, ensureDatabaseSchema } = require('../api/_db');
const { loadKaizenHistory } = require('../shared/kaizenDb');

(async () => {
  const client = await pool.connect();
  try {
    await ensureDatabaseSchema(client);
    const result = await client.query("SELECT reference_date, team_id, shift_start, shift_end FROM kaizen_turnos WHERE reference_date >= '2026-02-19' AND reference_date < '2026-02-20' ORDER BY team_id");
    console.log('count', result.rows.length);
    console.log(JSON.stringify(result.rows.slice(0, 20), null, 2));
    const hist = await loadKaizenHistory(client, { referenceDate: '2026-02-01', period: 'month', limit: 400 });
    const found = hist.entries.filter(e => e.reference_date.startsWith('2026-02-19'));
    console.log('history feb19 count', found.length);
    console.log('sample', JSON.stringify(found.slice(0, 10), null, 2));
  } catch (e) {
    console.error(e);
  } finally {
    client.release();
    process.exit();
  }
})();
