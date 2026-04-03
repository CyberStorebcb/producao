const { pool, ensureDatabaseSchema } = require('./_db');

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

    const tableCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'producao_diaria'
    `);

    return res.status(200).json({
      ok: true,
      message: 'Tabela producao_diaria criada/verificada com sucesso.',
      tableExists: tableCheck.rows.length > 0,
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