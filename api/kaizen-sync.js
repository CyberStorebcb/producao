const { pool, ensureDatabaseSchema } = require('./_db');
const { normalizeReferenceDate } = require('../shared/kaizenBot');
const { syncKaizenDate, syncKaizenRange } = require('../shared/kaizenSync');

module.exports = async (req, res) => {
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let client;
  try {
    const body = req.method === 'POST' ? (req.body || {}) : (req.query || {});
    const referenceDate = normalizeReferenceDate(body.referenceDate || body.endDate || body.startDate);
    const startDate = body.startDate ? normalizeReferenceDate(body.startDate) : referenceDate;
    const endDate = body.endDate ? normalizeReferenceDate(body.endDate) : referenceDate;
    const sourceText = body.sourceText ? String(body.sourceText) : '';

    if (sourceText && startDate !== endDate) {
      return res.status(400).json({
        error: 'O modo manual do Kaizen aceita apenas uma data por vez.',
      });
    }

    if (!process.env.DATABASE_URL) {
      return res.status(200).json({
        ok: true,
        persisted: false,
        referenceDate,
        warning: 'DATABASE_URL não configurada. A exportação foi executada sem persistir histórico no Neon.',
      });
    }

    client = await pool.connect();
    await ensureDatabaseSchema(client);

    if (startDate !== endDate) {
      const result = await syncKaizenRange(client, {
        startDate,
        endDate,
        headless: true,
      });

      return res.status(200).json({
        ok: result.failedDates === 0,
        persisted: true,
        referenceDate: endDate,
        startDate,
        endDate,
        recordsCount: result.recordsCount,
        range: result,
        warning: result.failedDates
          ? `Sincronização parcial: ${result.syncedDates} datas concluídas e ${result.failedDates} falharam.`
          : '',
      });
    }

    const saved = await syncKaizenDate(client, {
      referenceDate,
      sourceText,
      rawFilename: body.rawFilename,
      headless: true,
    });

    return res.status(200).json({
      ok: true,
      persisted: true,
      referenceDate,
      recordsCount: saved.recordsCount,
      runId: saved.runId,
      rawFilename: saved.rawFilename,
      summary: saved.summary,
      retentionCutoffDate: saved.retentionCutoffDate,
    });
  } catch (error) {
    console.error('kaizen-sync error', error);
    return res.status(500).json({
      error: 'Erro ao sincronizar o Kaizen Bot.',
      detail: error.message || String(error),
    });
  } finally {
    if (client) client.release();
  }
};
