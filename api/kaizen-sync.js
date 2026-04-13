const { pool, ensureDatabaseSchema, isDatabaseConfigured } = require('./_db');
const { normalizeReferenceDate } = require('../shared/kaizenBot');
const { syncKaizenDate, syncKaizenRange } = require('../shared/kaizenSync');
const {
  createKaizenSyncJob,
  runKaizenSyncJob,
  getKaizenSyncJob,
} = require('./_kaizenSyncJobs');

module.exports = async (req, res) => {
  if (!['GET', 'POST'].includes(req.method)) {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let client;
  try {
    if (req.method === 'GET') {
      const jobId = String((req.query || {}).jobId || '');
      if (!jobId) {
        return res.status(200).json({
          ok: false,
          error: 'Informe o jobId para consultar o progresso da sincronização.',
          usage: 'GET /api/kaizen-sync?jobId=<uuid>',
        });
      }

      if (isDatabaseConfigured()) {
        client = await pool.connect();
        await ensureDatabaseSchema(client);
        client.release();
        client = null;
      }

      const job = await getKaizenSyncJob(jobId);
      if (!job) {
        return res.status(404).json({ error: 'Job de sincronização Kaizen não encontrado.' });
      }

      return res.status(200).json({ ok: true, job });
    }

    const body = req.method === 'POST' ? (req.body || {}) : (req.query || {});
    const referenceDate = normalizeReferenceDate(body.referenceDate || body.endDate || body.startDate);
    const startDate = body.startDate ? normalizeReferenceDate(body.startDate) : referenceDate;
    const endDate = body.endDate ? normalizeReferenceDate(body.endDate) : referenceDate;
    const asyncMode = body.async === true || body.async === 'true';

    if (startDate > endDate) {
      return res.status(400).json({
        error: 'A data inicial do sync deve ser menor ou igual à data final.',
      });
    }

    if (body.sourceText) {
      return res.status(400).json({
        error: 'O Kaizen aceita apenas sincronização via SIGA. O envio manual de texto foi desabilitado.',
      });
    }

    // Credenciais SIGA são obrigatórias para o robô. DATABASE_URL é necessário apenas para gravar
    // turnos no Neon — não bloqueia o POST (o job em memória trata ausência de banco).
    const missingEnv = [];
    if (!process.env.KAIZEN_SIGA_USERNAME) missingEnv.push('KAIZEN_SIGA_USERNAME');
    if (!process.env.KAIZEN_SIGA_PASSWORD) missingEnv.push('KAIZEN_SIGA_PASSWORD');
    if (missingEnv.length > 0) {
      return res.status(400).json({
        error: `Credenciais SIGA não configuradas: ${missingEnv.join(', ')}`,
        detail: `Defina KAIZEN_SIGA_USERNAME e KAIZEN_SIGA_PASSWORD no .env (local) ou nas variáveis do deploy.`,
        missingEnv,
      });
    }

    if (asyncMode) {
      if (isDatabaseConfigured()) {
        client = await pool.connect();
        await ensureDatabaseSchema(client);
        client.release();
        client = null;
      }

      const job = await createKaizenSyncJob({
        referenceDate,
        startDate,
        endDate,
      });
      runKaizenSyncJob(job.jobId).catch((error) => {
        console.error('kaizen-sync async job error', error);
      });
      return res.status(202).json({
        ok: true,
        async: true,
        job,
        message: 'Sincronização Kaizen iniciada.',
      });
    }

    if (!isDatabaseConfigured()) {
      return res.status(200).json({
        ok: true,
        persisted: false,
        referenceDate,
        warning:
          'Nenhuma URL de Postgres (DATABASE_URL ou POSTGRES_URL). A exportação não persiste histórico no Neon.',
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
