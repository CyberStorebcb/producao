const crypto = require('node:crypto');

const { pool, ensureDatabaseSchema } = require('./_db');
const { normalizeReferenceDate } = require('../shared/kaizenBot');
const { syncKaizenDate, syncKaizenRange } = require('../shared/kaizenSync');

const jobs = new Map();
const MAX_JOB_AGE_MS = 6 * 60 * 60 * 1000;
const MAX_JOB_LOGS = 120;

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
  const entry = {
    timestamp: new Date().toISOString(),
    level: extra.level || 'info',
    message,
    referenceDate: extra.referenceDate || '',
    stage: extra.stage || '',
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
    logs: job.logs.slice(-20),
  };
}

function createKaizenSyncJob(options = {}) {
  purgeExpiredJobs();

  const referenceDate = normalizeReferenceDate(options.referenceDate || options.endDate || options.startDate);
  const startDate = options.startDate ? normalizeReferenceDate(options.startDate) : referenceDate;
  const endDate = options.endDate ? normalizeReferenceDate(options.endDate) : referenceDate;
  const jobId = crypto.randomUUID();
  const totalDates = startDate === endDate
    ? 1
    : Math.round((new Date(`${endDate}T12:00:00Z`) - new Date(`${startDate}T12:00:00Z`)) / 86400000) + 1;

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
    logs: [],
  };

  appendJobLog(job, `Job ${jobId} criado para ${startDate} até ${endDate}.`, {
    stage: 'job-created',
    referenceDate,
  });
  jobs.set(jobId, job);
  return getJobSnapshot(job);
}

async function runKaizenSyncJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) {
    throw new Error('Job de sincronização Kaizen não encontrado.');
  }

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

  if (!process.env.DATABASE_URL) {
    job.status = 'completed';
    job.finishedAt = new Date().toISOString();
    job.progressPercentage = 100;
    job.processedDates = job.totalDates;
    job.warning = 'DATABASE_URL não configurada. A exportação foi executada sem persistir histórico no Neon.';
    job.result = {
      ok: true,
      persisted: false,
      referenceDate: job.referenceDate,
      warning: job.warning,
    };
    job.currentMessage = job.warning;
    appendJobLog(job, job.warning, {
      stage: 'job-warning',
      level: 'warning',
      referenceDate: job.referenceDate,
    });
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
      },
      onProgress(event = {}) {
        job.progressPercentage = resolveProgressPercentage(job, event);
        job.processedDates = Math.max(job.processedDates, Number(event.processedDates || 0));
        job.totalDates = Math.max(Number(event.totalDates || job.totalDates || 1), 1);
        job.currentDate = event.referenceDate || job.currentDate;
        job.currentMessage = event.message || job.currentMessage;
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
    }

    job.status = 'completed';
    job.finishedAt = new Date().toISOString();
    job.progressPercentage = 100;
    job.processedDates = job.totalDates;
    job.currentDate = job.endDate;
    job.currentMessage = 'Sincronização concluída.';
    appendJobLog(job, 'Sincronização concluída com sucesso.', {
      stage: 'job-completed',
      referenceDate: job.endDate,
    });
    console.info('[kaizen-sync] job completed', {
      jobId: job.jobId,
      recordsCount: job.result?.recordsCount || 0,
      warning: job.warning,
    });
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
  } finally {
    if (client) client.release();
  }

  return getJobSnapshot(job);
}

function getKaizenSyncJob(jobId) {
  purgeExpiredJobs();
  const job = jobs.get(jobId);
  return job ? getJobSnapshot(job) : null;
}

module.exports = {
  createKaizenSyncJob,
  runKaizenSyncJob,
  getKaizenSyncJob,
};