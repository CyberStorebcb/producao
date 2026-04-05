const { pool, ensureDatabaseSchema } = require('./_db');
const { loadKaizenHistory } = require('../shared/kaizenDb');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let client;
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({
        error: 'DATABASE_URL não configurada para o histórico do Kaizen.',
      });
    }

    client = await pool.connect();
    await ensureDatabaseSchema(client);

    const referenceDate = req.query && req.query.date ? String(req.query.date) : '';
    const limit = req.query && req.query.limit ? Number(req.query.limit) : 180;
    const history = await loadKaizenHistory(client, { referenceDate, limit });

    return res.status(200).json({
      entries: history.entries,
      runs: history.runs,
      summary: {
        entriesCount: history.entries.length,
        runsCount: history.runs.length,
      },
    });
  } catch (error) {
    console.error('get-kaizen-history error', error);
    return res.status(500).json({
      error: 'Erro ao carregar o histórico do Kaizen.',
      detail: error.message || String(error),
    });
  } finally {
    if (client) client.release();
  }
};
