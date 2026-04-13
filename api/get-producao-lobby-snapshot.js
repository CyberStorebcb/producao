const XLSX = require('xlsx');
const { pool, ensureDatabaseSchema, isDatabaseConfigured } = require('./_db');
const { loadWorkbookFromDropbox } = require('../shared/dropboxWorkbook');
const { normalizeDiarioRows } = require('../shared/diarioParser');
const { loadNormalizedSheetFromDb } = require('../shared/producaoDb');
const { getDropboxUrlCandidatesForBase, normalizeBaseKey } = require('../shared/producaoBases');
const { mergeLobbyNormalizedResults } = require('../shared/lobbyProductionMerge');

const SOURCE_SHEETS = ['OBRAS', 'EME', 'CUSTEIO'];
const DEFAULT_LOBBY_BASES = ['BCB', 'ITM', 'STI'];
const CACHE_TTL_MS = 90 * 1000;
const snapshotCache = new Map();

function cacheGet(key) {
  const entry = snapshotCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    snapshotCache.delete(key);
    return null;
  }
  return entry.payload;
}

function cacheSet(key, payload) {
  snapshotCache.set(key, { payload, expires: Date.now() + CACHE_TTL_MS });
}

async function loadNormalizedSheetFromDropbox(sheetName, baseName) {
  const candidates = getDropboxUrlCandidatesForBase(baseName);
  let lastError = null;

  for (const candidate of candidates) {
    try {
      const workbook = await loadWorkbookFromDropbox(candidate);
      const diarioSheet = workbook.Sheets[sheetName] || workbook.Sheets['DIÁRIO'];

      if (!diarioSheet) {
        throw new Error(`Não foi possível localizar a aba ${sheetName} na planilha`);
      }

      const rows = XLSX.utils.sheet_to_json(diarioSheet, { header: 1, raw: true });
      return normalizeDiarioRows(rows, { sheetName });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error(`Não foi possível carregar a base ${baseName} a partir do Dropbox.`);
}

function parseBases(query) {
  const raw = query && query.bases ? String(query.bases).trim() : '';
  if (raw) {
    return raw
      .split(',')
      .map((s) => normalizeBaseKey(s.trim()))
      .filter(Boolean);
  }
  if (query && query.base) {
    return [normalizeBaseKey(String(query.base))];
  }
  return [...DEFAULT_LOBBY_BASES];
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const baseKeys = parseBases(req.query);
  if (!baseKeys.length) {
    return res.status(400).json({ error: 'Nenhuma base válida em bases= ou base=' });
  }

  const cacheKey = `lobby:${baseKeys.slice().sort().join(',')}:${SOURCE_SHEETS.join(',')}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    res.setHeader('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');
    res.setHeader('X-Lobby-Snapshot-Cache', 'HIT');
    return res.status(200).json(cached);
  }

  let client;
  try {
    const combos = baseKeys.flatMap((base) => SOURCE_SHEETS.map((sheetName) => ({ sheetName, baseName: base })));

    if (!isDatabaseConfigured()) {
      const settled = await Promise.allSettled(
        combos.map(({ sheetName, baseName }) =>
          loadNormalizedSheetFromDropbox(sheetName, baseName).then((normalized) => ({
            sheetName,
            baseName,
            normalized,
            origin: 'remote',
            generatedAt: new Date().toISOString(),
          }))
        )
      );

      const fulfilled = settled.filter((r) => r.status === 'fulfilled').map((r) => r.value);
      if (!fulfilled.length) {
        const err = settled.find((r) => r.status === 'rejected');
        throw err ? err.reason : new Error('Falha ao carregar dados do Dropbox.');
      }

      const forMerge = fulfilled.map(({ sheetName, normalized }) => ({ sheetName, normalized }));
      const merged = mergeLobbyNormalizedResults(forMerge, baseKeys);
      const generatedAt = fulfilled.map((f) => f.generatedAt).sort().pop() || new Date().toISOString();

      const origins = Array.from(new Set(fulfilled.map((f) => f.origin)));
      const payload = {
        data: merged,
        origin: origins.length === 1 ? origins[0] : 'remote',
        generatedAt,
        parts: fulfilled.map((f) => ({
          sheet: f.sheetName,
          base: f.baseName,
          origin: f.origin,
          generatedAt: f.generatedAt,
        })),
      };

      cacheSet(cacheKey, payload);
      res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
      res.setHeader('X-Lobby-Snapshot-Cache', 'MISS');
      return res.status(200).json(payload);
    }

    client = await pool.connect();
    await ensureDatabaseSchema(client);

    const settled = await Promise.allSettled(
      combos.map(async ({ sheetName, baseName }) => {
        const { rows, normalized } = await loadNormalizedSheetFromDb(client, sheetName, baseName);
        const generatedAt =
          rows
            .map((row) => row.created_at)
            .filter(Boolean)
            .sort()
            .pop() || new Date().toISOString();
        const origin = rows.length === 0 ? 'database-empty' : 'database';
        return {
          sheetName,
          baseName,
          rows,
          normalized,
          origin,
          generatedAt,
        };
      })
    );

    const fulfilled = settled.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    if (!fulfilled.length) {
      const err = settled.find((r) => r.status === 'rejected');
      throw err ? err.reason : new Error('Nenhuma planilha carregou com sucesso.');
    }

    const forMerge = fulfilled.map(({ sheetName, normalized }) => ({ sheetName, normalized }));
    const merged = mergeLobbyNormalizedResults(forMerge, baseKeys);

    const generatedAt = fulfilled
      .map((f) => f.generatedAt)
      .filter(Boolean)
      .sort()
      .pop();

    const origins = Array.from(new Set(fulfilled.map((f) => f.origin)));
    const productionOrigin = origins.every((o) => o === 'database-empty')
      ? 'database-empty'
      : origins.includes('database')
        ? 'database'
        : 'database';

    const payload = {
      data: merged,
      base: baseKeys.join(','),
      origin: productionOrigin,
      generatedAt: generatedAt || new Date().toISOString(),
      parts: fulfilled.map((f) => ({
        sheet: f.sheetName,
        base: f.baseName,
        origin: f.origin,
        rowCount: f.rows?.length || 0,
        generatedAt: f.generatedAt,
      })),
    };

    cacheSet(cacheKey, payload);
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    res.setHeader('X-Lobby-Snapshot-Cache', 'MISS');
    return res.status(200).json(payload);
  } catch (err) {
    console.error('get-producao-lobby-snapshot error', err);
    return res.status(500).json({
      error: 'Erro ao montar snapshot do lobby',
      detail: err.message,
    });
  } finally {
    if (client) client.release();
  }
};
