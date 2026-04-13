const { pool, ensureDatabaseSchema, isDatabaseConfigured } = require('./_db');
const { loadKaizenHistory, getDateWindow } = require('../shared/kaizenDb');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const referenceDate = req.query && req.query.date ? String(req.query.date) : '';
  const periodRaw = req.query && req.query.period ? String(req.query.period).toLowerCase() : 'day';
  const period = ['day', 'week', 'month'].includes(periodRaw) ? periodRaw : 'day';

  let client;
  try {
    if (!isDatabaseConfigured()) {
      const { startDate, endDate } = getDateWindow(referenceDate || null, period);
      res.setHeader('X-Kaizen-Database-Configured', '0');
      return res.status(200).json({
        entries: [],
        runs: [],
        range: { period, startDate, endDate },
        databaseConfigured: false,
        summary: {
          entriesCount: 0,
          runsCount: 0,
        },
        warning:
          'Nenhuma URL de Postgres configurada (use DATABASE_URL ou POSTGRES_URL) para o histórico do Kaizen.',
      });
    }

    client = await pool.connect();
    await ensureDatabaseSchema(client);

    const limit = req.query && req.query.limit ? Number(req.query.limit) : 180;
    const history = await loadKaizenHistory(client, { referenceDate, period, limit });

    res.setHeader('X-Kaizen-Database-Configured', '1');
    return res.status(200).json({
      entries: history.entries,
      runs: history.runs,
      range: history.range,
      databaseConfigured: true,
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
