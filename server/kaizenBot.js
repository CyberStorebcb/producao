const { pool, ensureDatabaseSchema } = require('../api/_db');
const { exportTxtFromSiga, normalizeReferenceDate } = require('../shared/kaizenBot');
const { saveKaizenSnapshot } = require('../shared/kaizenDb');

function parseArgs(argv) {
  const payload = {};
  argv.forEach((arg) => {
    if (arg.startsWith('--date=')) payload.referenceDate = arg.slice('--date='.length);
    if (arg === '--headed') payload.headless = false;
  });
  return payload;
}

(async () => {
  const options = parseArgs(process.argv.slice(2));
  const referenceDate = normalizeReferenceDate(options.referenceDate);
  let client;

  try {
    if (!process.env.DATABASE_URL) {
      throw new Error('Defina DATABASE_URL para persistir o histórico do Kaizen.');
    }

    const exported = await exportTxtFromSiga({
      referenceDate,
      headless: options.headless !== false,
    });

    client = await pool.connect();
    await ensureDatabaseSchema(client);

    const saved = await saveKaizenSnapshot(client, {
      referenceDate,
      source: 'siga-script',
      rawText: exported.rawText,
      rawFilename: exported.rawFilename,
      records: exported.parsed.records,
      metadata: {
        ...exported.metadata,
        parserSummary: exported.parsed.summary,
      },
    });

    console.log(JSON.stringify({
      ok: true,
      referenceDate,
      recordsCount: saved.recordsCount,
      runId: saved.runId,
    }, null, 2));
  } catch (error) {
    console.error('Kaizen Bot failed:', error.message || error);
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    await pool.end();
  }
})();
