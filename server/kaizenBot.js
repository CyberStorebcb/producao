const { pool, ensureDatabaseSchema, isDatabaseConfigured } = require('../api/_db');
const { normalizeReferenceDate } = require('../shared/kaizenBot');
const { syncKaizenDate, syncKaizenRange } = require('../shared/kaizenSync');

function parseArgs(argv) {
  const payload = {};
  argv.forEach((arg) => {
    if (arg.startsWith('--date=')) payload.referenceDate = arg.slice('--date='.length);
    if (arg.startsWith('--start-date=')) payload.startDate = arg.slice('--start-date='.length);
    if (arg.startsWith('--end-date=')) payload.endDate = arg.slice('--end-date='.length);
    if (arg === '--headed') payload.headless = false;
    if (arg === '--quiet') payload.quiet = true;
  });
  return payload;
}

function writeLog(event = {}, quiet = false) {
  if (quiet) return;
  const prefix = event.referenceDate ? `[kaizen][${event.referenceDate}]` : '[kaizen]';
  console.log(`${prefix} ${event.message || 'Etapa registrada.'}`);
}

(async () => {
  const options = parseArgs(process.argv.slice(2));
  const referenceDate = normalizeReferenceDate(options.referenceDate || options.endDate || options.startDate);
  const startDate = options.startDate ? normalizeReferenceDate(options.startDate) : referenceDate;
  const endDate = options.endDate ? normalizeReferenceDate(options.endDate) : referenceDate;
  let client;

  try {
    if (!isDatabaseConfigured()) {
      throw new Error('Defina DATABASE_URL ou POSTGRES_URL para persistir o histórico do Kaizen.');
    }

    client = await pool.connect();
    await ensureDatabaseSchema(client);

    if (startDate !== endDate) {
      const result = await syncKaizenRange(client, {
        startDate,
        endDate,
        headless: options.headless !== false,
        source: 'siga-script',
        onLog(event = {}) {
          writeLog(event, options.quiet);
        },
      });

      console.log(JSON.stringify({
        ok: result.failedDates === 0,
        startDate,
        endDate,
        recordsCount: result.recordsCount,
        syncedDates: result.syncedDates,
        failedDates: result.failedDates,
        failures: result.failures,
      }, null, 2));
    } else {
      const saved = await syncKaizenDate(client, {
        referenceDate,
        headless: options.headless !== false,
        source: 'siga-script',
        onLog(event = {}) {
          writeLog(event, options.quiet);
        },
      });

      console.log(JSON.stringify({
        ok: true,
        referenceDate,
        recordsCount: saved.recordsCount,
        runId: saved.runId,
      }, null, 2));
    }
  } catch (error) {
    console.error('Kaizen Bot failed:', error.message || error);
    process.exitCode = 1;
  } finally {
    if (client) client.release();
    await pool.end();
  }
})();
