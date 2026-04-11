const { pool, ensureDatabaseSchema } = require('./_db');

const BASE_TABLES = ['producao_bcb', 'producao_itm', 'producao_sti'];

module.exports = async (req, res) => {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({
      error: 'DATABASE_URL não configurada na Vercel/ambiente atual.',
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