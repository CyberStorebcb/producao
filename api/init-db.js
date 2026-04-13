const { pool, ensureDatabaseSchema, isDatabaseConfigured } = require('./_db');

const BASE_TABLES = [
  'producao_bcb', 'producao_itm', 'producao_sti',
  'producao_bdc', 'producao_pdt', 'producao_pds',
  'producao_lv169', 'producao_lv127', 'producao_poda',
];

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!isDatabaseConfigured()) {
    return res.status(500).json({
      error: 'URL do Postgres não configurada. Use DATABASE_URL ou POSTGRES_URL (ex.: integração Neon na Vercel).',
    });
  }

  const client = await pool.connect();
  try {
    await ensureDatabaseSchema(client);

    const tableCheckResult = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ANY($1)
    `, [BASE_TABLES]);

    const foundTables = tableCheckResult.rows.map((r) => r.table_name);
    const allTablesExist = BASE_TABLES.every((t) => foundTables.includes(t));

    const rowCounts = {};
    for (const tableName of BASE_TABLES) {
      if (foundTables.includes(tableName)) {
        const { rows } = await client.query(`SELECT COUNT(*) FROM ${tableName}`);
        rowCounts[tableName] = Number(rows[0].count);
      } else {
        rowCounts[tableName] = null;
      }
    }

    return res.status(200).json({
      ok: allTablesExist,
      message: allTablesExist
        ? 'Todas as tabelas de produção criadas/verificadas com sucesso.'
        : 'Algumas tabelas ainda não foram criadas.',
      tables: rowCounts,
    });
  } catch (error) {
    console.error('init-db error', error);
    return res.status(500).json({
      error: 'Falha ao inicializar banco de dados.',
      detail: error.message,
    });
  } finally {
    client.release();
  }
};