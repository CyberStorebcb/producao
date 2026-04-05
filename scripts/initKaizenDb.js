require('dotenv').config();

const { pool, ensureDatabaseSchema } = require('../api/_db');

(async () => {
  const client = await pool.connect();
  try {
    await ensureDatabaseSchema(client);
    const result = await client.query(`
      select tablename
      from pg_tables
      where schemaname = 'public'
        and tablename in ('producao_diaria', 'kaizen_runs', 'kaizen_turnos')
      order by tablename
    `);

    console.log(JSON.stringify({
      ok: true,
      tables: result.rows.map((row) => row.tablename),
    }, null, 2));
  } finally {
    client.release();
    await pool.end();
  }
})().catch((error) => {
  console.error(error && error.stack ? error.stack : error);
  process.exit(1);
});
