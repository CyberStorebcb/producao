const crypto = require('node:crypto');

const { pool, ensureDatabaseSchema, isDatabaseConfigured } = require('./_db');
const { normalizeReferenceDate } = require('../shared/kaizenBot');
const { syncKaizenDate, syncKaizenRange } = require('../shared/kaizenSync');

const jobs = new Map();
const MAX_JOB_AGE_MS = 6 * 60 * 60 * 1000;
const MAX_JOB_LOGS = 120;

function coerceJobRow(row) {
  if (!row) return null;
  return {
    jobId: row.job_id,
    status: row.status,
    referenceDate: row.reference_date ? String(row.reference_date).slice(0, 10) : '',
    startDate: row.start_date ? String(row.start_date).slice(0, 10) : '',
    endDate: row.end_date ? String(row.end_date).slice(0, 10) : '',
    startedAt: row.started_at ? new Date(row.started_at).toISOString() : '',
    finishedAt: row.finished_at ? new Date(row.finished_at).toISOString() : '',
    progressPercentage: Number(row.progress_percentage || 0),
    processedDates: Number(row.processed_dates || 0),
    totalDates: Number(row.total_dates || 0),
    currentDate: row.current_date || '',
    currentMessage: row.current_message || '',
    warning: row.warning || '',
    error: row.error || '',
    result: row.result || null,
    logs: Array.isArray(row.logs) ? row.logs : [],
  };
}

async function persistJobSnapshot(job) {
  const snapshot = getJobSnapshot(job);
  await pool.query(`
    INSERT INTO kaizen_sync_jobs (
      job_id,
      status,
      reference_date,
      start_date,
      end_date,
      started_at,
      finished_at,
      progress_percentage,
      processed_dates,
      total_dates,
      "current_date",
      current_message,
      warning,
      error,
      result,
      logs,
      updated_at
    ) VALUES (
      $1::uuid,
      $2,
      $3::date,
      $4::date,
      $5::date,
      NULLIF($6, '')::timestamptz,
      NULLIF($7, '')::timestamptz,
      $8,
      $9,
      $10,
      NULLIF($11, ''),
      $12,
      $13,
      $14,
      $15::jsonb,
      $16::jsonb,
      NOW()
    )
    ON CONFLICT (job_id) DO UPDATE SET
      status = EXCLUDED.status,
      reference_date = EXCLUDED.reference_date,
      start_date = EXCLUDED.start_date,
      end_date = EXCLUDED.end_date,
      started_at = EXCLUDED.started_at,
      finished_at = EXCLUDED.finished_at,
      progress_percentage = EXCLUDED.progress_percentage,
      processed_dates = EXCLUDED.processed_dates,
      total_dates = EXCLUDED.total_dates,
      "current_date" = EXCLUDED."current_date",
      current_message = EXCLUDED.current_message,
      warning = EXCLUDED.warning,
      error = EXCLUDED.error,
      result = EXCLUDED.result,
      logs = EXCLUDED.logs,
      updated_at = NOW()
  `, [
    snapshot.jobId,
    snapshot.status,
    snapshot.referenceDate,
    snapshot.startDate,
    snapshot.endDate,
    snapshot.startedAt || '',
    snapshot.finishedAt || '',
    snapshot.progressPercentage,
    snapshot.processedDates,
    snapshot.totalDates,
    snapshot.currentDate || '',
    snapshot.currentMessage || '',
    snapshot.warning || '',
    snapshot.error || '',
    JSON.stringify(snapshot.result || null),
    JSON.stringify(snapshot.logs || []),
  ]);
}

async function loadPersistedJob(jobId) {
  const { rows } = await pool.query(`
    SELECT job_id, status, reference_date, start_date, end_date, started_at, finished_at,
           progress_percentage, processed_dates, total_dates, "current_date" AS current_date, current_message,
           warning, error, result, logs
      FROM kaizen_sync_jobs
     WHERE job_id = $1::uuid
     LIMIT 1
  `, [jobId]);
  return coerceJobRow(rows[0]);
}

function purgeExpiredJobs() {
  const now = Date.now();
  for (const [jobId, job] of jobs.entries()) {
    const finishedAt = job.finishedAt ? new Date(job.finishedAt).getTime() : 0;
    const startedAt = job.startedAt ? new Date(job.startedAt).getTime() : 0;
    const referenceTime = finishedAt || startedAt || now;
    if (now - referenceTime > MAX_JOB_AGE_MS) {
      jobs.delete(jobId);
    }
  }
}

function appendJobLog(job, message, extra = {}) {
  const details = Object.entries(extra)
    .filter(([key, value]) => !['level', 'referenceDate', 'stage'].includes(key) && value !== '' && value !== null && typeof value !== 'undefined')
    .reduce((accumulator, [key, value]) => {
      accumulator[key] = value;
      return accumulator;
    }, {});

  const entry = {
    timestamp: new Date().toISOString(),
    level: extra.level || 'info',
    message,
    referenceDate: extra.referenceDate || '',
    stage: extra.stage || '',
    details,
  };

  job.logs.push(entry);
  if (job.logs.length > MAX_JOB_LOGS) {
    job.logs.splice(0, job.logs.length - MAX_JOB_LOGS);
  }
}

function resolveProgressPercentage(job, event = {}) {
  if (Number.isFinite(Number(event.percentage))) {
    return Math.max(0, Math.min(100, Number(event.percentage)));
  }

  const totalDates = Math.max(Number(event.totalDates || job.totalDates || 1), 1);
  const processedDates = Math.max(Number(event.processedDates ?? job.processedDates ?? 0), 0);
  const dayProgress = Math.max(0, Math.min(1, Number(event.dayProgress || 0)));
  return Math.max(0, Math.min(100, Math.round(((processedDates + dayProgress) / totalDates) * 100)));
}

function getJobSnapshot(job) {
  return {
    jobId: job.jobId,
    status: job.status,
    referenceDate: job.referenceDate,
    startDate: job.startDate,
    endDate: job.endDate,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    progressPercentage: job.progressPercentage,
    processedDates: job.processedDates,
    totalDates: job.totalDates,
    currentDate: job.currentDate,
    currentMessage: job.currentMessage,
    warning: job.warning,
    error: job.error,
    result: job.result,
    preview: job.preview || null,
    logs: job.logs.slice(-40),
  };
}

async function createKaizenSyncJob(options = {}) {
  purgeExpiredJobs();

  const referenceDate = normalizeReferenceDate(options.referenceDate || options.endDate || options.startDate);
  const startDate = options.startDate ? normalizeReferenceDate(options.startDate) : referenceDate;
  const endDate = options.endDate ? normalizeReferenceDate(options.endDate) : referenceDate;
  const jobId = crypto.randomUUID();
  const totalDates = startDate === endDate
    ? 1
    : Math.round((new Date(`${endDate}T12:00:00Z`) - new Date(`${startDate}T12:00:00Z`)) / 86400000) + 1;
  const hasDatabase = isDatabaseConfigured();

  const job = {
    jobId,
    status: 'queued',
    referenceDate,
    startDate,
    endDate,
    startedAt: '',
    finishedAt: '',
    progressPercentage: 0,
    processedDates: 0,
    totalDates,
    currentDate: startDate,
    currentMessage: 'Aguardando início da sincronização.',
    warning: '',
    error: '',
    result: null,
    preview: null,
    logs: [],
  };

  appendJobLog(job, `Job ${jobId} criado para ${startDate} até ${endDate}.`, {
    stage: 'job-created',
    referenceDate,
  });
  jobs.set(jobId, job);
  if (hasDatabase) {
    await persistJobSnapshot(job);
  }
  return getJobSnapshot(job);
}

async function runKaizenSyncJob(jobId) {
  const job = jobs.get(jobId) || await loadPersistedJob(jobId);
  if (!job) {
    throw new Error('Job de sincronização Kaizen não encontrado.');
  }

  jobs.set(jobId, job);
  const hasDatabase = isDatabaseConfigured();

  let persistQueue = Promise.resolve();
  const queuePersist = () => {
    if (!hasDatabase) {
      return Promise.resolve();
    }
    persistQueue = persistQueue
      .then(() => persistJobSnapshot(job))
      .catch((error) => {
        console.error('[kaizen-sync] persist job error', {
          jobId: job.jobId,
          error: error.message || String(error),
        });
      });
    return persistQueue;
  };

  if (job.status === 'running' || job.status === 'completed' || job.status === 'failed') {
    return getJobSnapshot(job);
  }

  job.status = 'running';
  job.startedAt = new Date().toISOString();
  job.currentMessage = 'Sincronização iniciada.';
  appendJobLog(job, `Sincronização iniciada para ${job.startDate} até ${job.endDate}.`, {
    stage: 'job-started',
    referenceDate: job.referenceDate,
  });
  console.info('[kaizen-sync] job started', {
    jobId: job.jobId,
    startDate: job.startDate,
    endDate: job.endDate,
  });
  await queuePersist();

  if (!isDatabaseConfigured()) {
    const msg =
      'URL do Postgres não configurada (DATABASE_URL ou POSTGRES_URL). O robô precisa do Neon para gravar turnos após exportar do SIGA. ' +
      'Na Vercel, POSTGRES_URL do Neon costuma bastar.';
    job.status = 'failed';
    job.finishedAt = new Date().toISOString();
    job.progressPercentage = 0;
    job.error = msg;
    job.result = {
      ok: false,
      persisted: false,
      referenceDate: job.referenceDate,
      error: msg,
    };
    job.currentMessage = msg;
    appendJobLog(job, msg, {
      stage: 'job-blocked-no-database',
      level: 'error',
      referenceDate: job.referenceDate,
    });
    await queuePersist();
    return getJobSnapshot(job);
  }

  let client;
  try {
    client = await pool.connect();
    await ensureDatabaseSchema(client);

    const syncOptions = {
      headless: true,
      onLog(event = {}) {
        appendJobLog(job, event.message || 'Etapa registrada.', event);
        void queuePersist();
      },
      onPreview(event = {}) {
        job.preview = {
          timestamp: event.timestamp || new Date().toISOString(),
          stage: event.stage || '',
          message: event.message || '',
          referenceDate: event.referenceDate || job.currentDate || job.referenceDate,
          imageDataUrl: event.imageDataUrl || '',
          details: event.details || {
            currentHeaderDate: event.currentHeaderDate || '',
            rawFilename: event.rawFilename || '',
            step: event.step,
            totalSteps: event.totalSteps,
          },
        };
      },
      onProgress(event = {}) {
        job.progressPercentage = resolveProgressPercentage(job, event);
        job.processedDates = Math.max(job.processedDates, Number(event.processedDates || 0));
        job.totalDates = Math.max(Number(event.totalDates || job.totalDates || 1), 1);
        job.currentDate = event.referenceDate || job.currentDate;
        job.currentMessage = event.message || job.currentMessage;
        void queuePersist();
      },
    };

    if (job.startDate !== job.endDate) {
      const result = await syncKaizenRange(client, {
        ...syncOptions,
        startDate: job.startDate,
        endDate: job.endDate,
      });

      job.result = {
        ok: result.failedDates === 0,
        persisted: true,
        referenceDate: job.endDate,
        startDate: job.startDate,
        endDate: job.endDate,
        recordsCount: result.recordsCount,
        range: result,
        warning: result.failedDates
          ? `Sincronização parcial: ${result.syncedDates} datas concluídas e ${result.failedDates} falharam.`
          : '',
      };
      job.warning = job.result.warning || '';

      if (result.failedDates >= result.totalDates) {
        const firstFailure = result.failures && result.failures.length ? result.failures[0] : null;
        job.status = 'failed';
        job.error = firstFailure?.error
          || `Nenhuma data foi sincronizada no lote de ${job.startDate} até ${job.endDate}.`;
        job.currentMessage = job.error;
      } else {
        job.status = 'completed';
      }
    } else {
      const saved = await syncKaizenDate(client, {
        ...syncOptions,
        referenceDate: job.referenceDate,
        totalDates: 1,
        processedDates: 0,
      });

      job.result = {
        ok: true,
        persisted: true,
        referenceDate: job.referenceDate,
        recordsCount: saved.recordsCount,
        runId: saved.runId,
        rawFilename: saved.rawFilename,
        summary: saved.summary,
        retentionCutoffDate: saved.retentionCutoffDate,
      };

      job.status = 'completed';
    }

    job.finishedAt = new Date().toISOString();
    job.progressPercentage = 100;
    job.processedDates = job.totalDates;
    job.currentDate = job.endDate;
    if (job.status === 'failed') {
      appendJobLog(job, `Sincronização encerrada com falha: ${job.error}`, {
        stage: 'job-failed',
        level: 'error',
        referenceDate: job.endDate,
      });
      console.error('[kaizen-sync] job failed', {
        jobId: job.jobId,
        error: job.error,
      });
    } else {
      job.currentMessage = job.warning ? 'Sincronização concluída com falhas.' : 'Sincronização concluída.';
      appendJobLog(job, job.warning || 'Sincronização concluída com sucesso.', {
        stage: 'job-completed',
        level: job.warning ? 'warning' : 'info',
        referenceDate: job.endDate,
      });
      console.info('[kaizen-sync] job completed', {
        jobId: job.jobId,
        recordsCount: job.result?.recordsCount || 0,
        warning: job.warning,
      });
    }
    await queuePersist();
  } catch (error) {
    job.status = 'failed';
    job.finishedAt = new Date().toISOString();
    job.error = error.message || String(error);
    job.currentMessage = job.error;
    appendJobLog(job, `Falha na sincronização: ${job.error}`, {
      stage: 'job-failed',
      level: 'error',
      referenceDate: job.currentDate || job.referenceDate,
    });
    console.error('[kaizen-sync] job failed', {
      jobId: job.jobId,
      error: job.error,
    });
    await queuePersist();
  } finally {
    if (client) client.release();
  }

  return getJobSnapshot(job);
}

async function getKaizenSyncJob(jobId) {
  purgeExpiredJobs();
  const job = jobs.get(jobId);
  if (job) return getJobSnapshot(job);
  return loadPersistedJob(jobId);
}

module.exports = {
  createKaizenSyncJob,
  runKaizenSyncJob,
  getKaizenSyncJob,
};