const { parseKaizenTxt } = require('./kaizenParser');
const { exportTxtFromSiga, normalizeReferenceDate } = require('./kaizenBot');
const { saveKaizenSnapshot } = require('./kaizenDb');

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
  const sourceText = options.sourceText ? String(options.sourceText) : '';

  if (sourceText) {
    const rawFilename = options.rawFilename || `kaizen-manual-${referenceDate}.txt`;
    const parsed = parseKaizenTxt(sourceText, { referenceDate, rawFilename });
    return {
      referenceDate,
      source: 'manual-text',
      rawText: sourceText,
      rawFilename,
      parsed,
      metadata: {
        trigger: 'manual-text',
      },
    };
  }

  const exported = await exportTxtFromSiga({
    referenceDate,
    headless: options.headless !== false,
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
  const loaded = await loadKaizenSourceForDate(options);
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

  for (const referenceDate of dates) {
    try {
      const item = await syncKaizenDate(client, {
        ...options,
        referenceDate,
        sourceText: '',
        rawFilename: '',
      });
      items.push(item);
    } catch (error) {
      failures.push({
        referenceDate,
        error: error.message || String(error),
      });
    }
  }

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