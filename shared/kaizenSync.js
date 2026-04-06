const { exportTxtFromSiga, openSigaSession, exportDateFromSession, closeSigaSession, normalizeReferenceDate } = require('./kaizenBot');
const { saveKaizenSnapshot, cleanupRetention } = require('./kaizenDb');

function emitLog(options, message, extra = {}) {
  if (typeof options.onLog === 'function') {
    options.onLog({
      message,
      ...extra,
    });
  }
}

function emitProgress(options, payload = {}) {
  if (typeof options.onProgress === 'function') {
    options.onProgress(payload);
  }
}

function buildReferenceDateRange(startDate, endDate) {
  const normalizedStart = normalizeReferenceDate(startDate);
  const normalizedEnd = normalizeReferenceDate(endDate || startDate);

  if (normalizedStart > normalizedEnd) {
    throw new Error('A data inicial do Kaizen deve ser menor ou igual à data final.');
  }

  const dates = [];
  const cursor = new Date(`${normalizedStart}T12:00:00Z`);
  const limit = new Date(`${normalizedEnd}T12:00:00Z`);

  while (cursor <= limit) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

async function loadKaizenSourceForDate(options = {}) {
  const referenceDate = normalizeReferenceDate(options.referenceDate);

  emitLog(options, `Iniciando exportação no SIGA para ${referenceDate}.`, {
    referenceDate,
    stage: 'export-started',
  });
  emitProgress(options, {
    referenceDate,
    stage: 'export-started',
    dayProgress: 0.1,
    message: `Iniciando exportação do SIGA para ${referenceDate}.`,
  });
  const exported = await exportTxtFromSiga({
    referenceDate,
    headless: options.headless !== false,
  });

  emitLog(options, `Exportação do SIGA concluída para ${referenceDate}.`, {
    referenceDate,
    stage: 'export-finished',
    rawFilename: exported.rawFilename,
    recordsCount: exported.parsed?.records?.length || 0,
  });
  emitProgress(options, {
    referenceDate,
    stage: 'export-finished',
    dayProgress: 0.55,
    rawFilename: exported.rawFilename,
    recordsCount: exported.parsed?.records?.length || 0,
    message: `Exportação concluída para ${referenceDate}.`,
  });

  return {
    referenceDate,
    source: options.source || 'siga',
    rawText: exported.rawText,
    rawFilename: exported.rawFilename,
    parsed: exported.parsed,
    metadata: exported.metadata || {},
  };
}

async function syncKaizenDate(client, options = {}) {
  const referenceDate = normalizeReferenceDate(options.referenceDate);
  const totalDates = Math.max(Number(options.totalDates || 1), 1);
  const processedDates = Math.max(Number(options.processedDates || 0), 0);

  function reportDayProgress(dayProgress, payload = {}) {
    emitProgress(options, {
      referenceDate,
      totalDates,
      processedDates,
      dayProgress,
      percentage: Math.max(0, Math.min(100, Math.round(((processedDates + dayProgress) / totalDates) * 100))),
      ...payload,
    });
  }

  emitLog(options, `Preparando sincronização da data ${referenceDate}.`, {
    referenceDate,
    stage: 'date-started',
    processedDates,
    totalDates,
  });
  reportDayProgress(0.02, {
    stage: 'date-started',
    message: `Preparando sincronização da data ${referenceDate}.`,
  });

  const loaded = await loadKaizenSourceForDate(options);
  reportDayProgress(0.72, {
    stage: 'saving-started',
    rawFilename: loaded.rawFilename,
    message: `Persistindo ${referenceDate} no Neon.`,
  });
  emitLog(options, `Persistindo ${referenceDate} no Neon.`, {
    referenceDate,
    stage: 'saving-started',
    rawFilename: loaded.rawFilename,
  });
  const saved = await saveKaizenSnapshot(client, {
    referenceDate: loaded.referenceDate,
    source: loaded.source,
    rawText: loaded.rawText,
    rawFilename: loaded.rawFilename,
    records: loaded.parsed.records,
    metadata: {
      ...loaded.metadata,
      parserSummary: loaded.parsed.summary,
    },
  });

  emitLog(options, `Data ${referenceDate} concluída com ${saved.recordsCount} equipes.`, {
    referenceDate,
    stage: 'date-completed',
    recordsCount: saved.recordsCount,
    runId: saved.runId,
  });
  reportDayProgress(1, {
    stage: 'date-completed',
    processedDates: processedDates + 1,
    recordsCount: saved.recordsCount,
    runId: saved.runId,
    message: `Data ${referenceDate} concluída.`,
  });

  return {
    referenceDate: loaded.referenceDate,
    recordsCount: saved.recordsCount,
    runId: saved.runId,
    rawFilename: loaded.rawFilename,
    summary: loaded.parsed.summary,
    retentionCutoffDate: saved.retentionCutoffDate,
  };
}

async function syncKaizenRange(client, options = {}) {
  const dates = buildReferenceDateRange(options.startDate, options.endDate);
  const items = [];
  const failures = [];

  emitLog(options, `Sincronização em lote iniciada para ${dates.length} datas.`, {
    stage: 'range-started',
    totalDates: dates.length,
    startDate: dates[0],
    endDate: dates[dates.length - 1],
  });
  emitProgress(options, {
    stage: 'range-started',
    totalDates: dates.length,
    processedDates: 0,
    dayProgress: 0,
    percentage: 0,
    message: `Lote iniciado para ${dates.length} datas.`,
  });

  const session = await openSigaSession({
    headless: options.headless !== false,
    onLog: options.onLog,
  });

  try {
    for (const [index, referenceDate] of dates.entries()) {
      try {
        emitLog(options, `Processando ${referenceDate} (${index + 1}/${dates.length}).`, {
          referenceDate,
          stage: 'range-date-started',
          processedDates: index,
          totalDates: dates.length,
        });

        function reportDayProgress(dayProgress, payload = {}) {
          emitProgress(options, {
            referenceDate,
            totalDates: dates.length,
            processedDates: index,
            dayProgress,
            percentage: Math.max(0, Math.min(100, Math.round(((index + dayProgress) / dates.length) * 100))),
            ...payload,
          });
        }

        reportDayProgress(0.02, {
          stage: 'date-started',
          message: `Preparando sincronização da data ${referenceDate}.`,
        });

        emitLog(options, `Iniciando exportação no SIGA para ${referenceDate}.`, {
          referenceDate,
          stage: 'export-started',
        });
        reportDayProgress(0.1, {
          stage: 'export-started',
          message: `Iniciando exportação do SIGA para ${referenceDate}.`,
        });

        const exported = await exportDateFromSession(session, referenceDate, options);

        emitLog(options, `Exportação do SIGA concluída para ${referenceDate}.`, {
          referenceDate,
          stage: 'export-finished',
          rawFilename: exported.rawFilename,
          recordsCount: exported.parsed?.records?.length || 0,
        });
        reportDayProgress(0.55, {
          stage: 'export-finished',
          rawFilename: exported.rawFilename,
          recordsCount: exported.parsed?.records?.length || 0,
          message: `Exportação concluída para ${referenceDate}.`,
        });

        reportDayProgress(0.72, {
          stage: 'saving-started',
          rawFilename: exported.rawFilename,
          message: `Persistindo ${referenceDate} no Neon.`,
        });
        emitLog(options, `Persistindo ${referenceDate} no Neon.`, {
          referenceDate,
          stage: 'saving-started',
          rawFilename: exported.rawFilename,
        });

        const saved = await saveKaizenSnapshot(client, {
          referenceDate: exported.referenceDate,
          source: options.source || 'siga',
          rawText: exported.rawText,
          rawFilename: exported.rawFilename,
          records: exported.parsed.records,
          skipRetention: true,
          metadata: {
            ...exported.metadata,
            parserSummary: exported.parsed.summary,
          },
        });

        emitLog(options, `Data ${referenceDate} concluída com ${saved.recordsCount} equipes.`, {
          referenceDate,
          stage: 'date-completed',
          recordsCount: saved.recordsCount,
          runId: saved.runId,
        });
        reportDayProgress(1, {
          stage: 'date-completed',
          processedDates: index + 1,
          recordsCount: saved.recordsCount,
          runId: saved.runId,
          message: `Data ${referenceDate} concluída.`,
        });

        items.push({
          referenceDate: exported.referenceDate,
          recordsCount: saved.recordsCount,
          runId: saved.runId,
          rawFilename: exported.rawFilename,
          summary: exported.parsed.summary,
          retentionCutoffDate: saved.retentionCutoffDate,
        });
      } catch (error) {
        emitLog(options, `Falha na data ${referenceDate}: ${error.message || String(error)}`, {
          referenceDate,
          stage: 'range-date-failed',
          level: 'error',
          processedDates: index,
          totalDates: dates.length,
        });
        emitProgress(options, {
          referenceDate,
          stage: 'range-date-failed',
          totalDates: dates.length,
          processedDates: index + 1,
          dayProgress: 0,
          percentage: Math.max(0, Math.min(100, Math.round(((index + 1) / dates.length) * 100))),
          message: `Falha ao processar ${referenceDate}.`,
        });
        failures.push({
          referenceDate,
          error: error.message || String(error),
        });
      }
    }
  } finally {
    await closeSigaSession(session);
  }

  try {
    await cleanupRetention(client);
  } catch (error) {
    emitLog(options, `Falha ao limpar registros antigos: ${error.message || String(error)}`, {
      stage: 'retention-cleanup-failed',
      level: 'warning',
    });
  }

  emitLog(options, `Lote concluído: ${items.length} datas sincronizadas e ${failures.length} falhas.`, {
    stage: 'range-completed',
    totalDates: dates.length,
    syncedDates: items.length,
    failedDates: failures.length,
  });
  emitProgress(options, {
    stage: 'range-completed',
    totalDates: dates.length,
    processedDates: dates.length,
    dayProgress: 0,
    percentage: 100,
    message: 'Lote concluído.',
  });

  return {
    startDate: dates[0],
    endDate: dates[dates.length - 1],
    totalDates: dates.length,
    syncedDates: items.length,
    failedDates: failures.length,
    recordsCount: items.reduce((sum, item) => sum + Number(item.recordsCount || 0), 0),
    items,
    failures,
  };
}

module.exports = {
  buildReferenceDateRange,
  loadKaizenSourceForDate,
  syncKaizenDate,
  syncKaizenRange,
};