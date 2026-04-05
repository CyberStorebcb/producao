const { pool, ensureDatabaseSchema } = require('./_db');
const { saveKaizenSnapshot } = require('../shared/kaizenDb');
const { parseKaizenTxt } = require('../shared/kaizenParser');
const { exportTxtFromSiga, normalizeReferenceDate } = require('../shared/kaizenBot');

module.exports = async (req, res) => {
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let client;
  try {
    const body = req.method === 'POST' ? (req.body || {}) : (req.query || {});
    const referenceDate = normalizeReferenceDate(body.referenceDate);
    const sourceText = body.sourceText ? String(body.sourceText) : '';

    let rawText;
    let rawFilename;
    let parsed;
    let metadata = {};
    let source = 'siga';

    if (sourceText) {
      rawText = sourceText;
      rawFilename = body.rawFilename || `kaizen-manual-${referenceDate}.txt`;
      parsed = parseKaizenTxt(rawText, { referenceDate });
      source = 'manual-text';
      metadata = {
        trigger: 'manual-text',
      };
    } else {
      const exported = await exportTxtFromSiga({ referenceDate, headless: true });
      rawText = exported.rawText;
      rawFilename = exported.rawFilename;
      parsed = exported.parsed;
      metadata = exported.metadata || {};
      source = 'siga';
    }

    if (!process.env.DATABASE_URL) {
      return res.status(200).json({
        ok: true,
        persisted: false,
        referenceDate,
        recordsCount: parsed.records.length,
        rawFilename,
        summary: parsed.summary,
        warning: 'DATABASE_URL não configurada. A exportação foi executada sem persistir histórico no Neon.',
      });
    }

    client = await pool.connect();
    await ensureDatabaseSchema(client);

    const saved = await saveKaizenSnapshot(client, {
      referenceDate,
      source,
      rawText,
      rawFilename,
      records: parsed.records,
      metadata: {
        ...metadata,
        parserSummary: parsed.summary,
      },
    });

    return res.status(200).json({
      ok: true,
      persisted: true,
      referenceDate,
      recordsCount: saved.recordsCount,
      runId: saved.runId,
      rawFilename,
      summary: parsed.summary,
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
