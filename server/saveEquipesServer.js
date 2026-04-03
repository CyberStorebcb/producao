const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const XLSX = require('xlsx');
const { normalizeDiarioRows } = require('../shared/diarioParser');

const app = express();

// Custom CORS + Private Network Access handling to satisfy upcoming browser
// restrictions (preflight will include "Access-Control-Request-Private-Network").
app.use((req, res, next) => {
  const origin = req.get('Origin') || '*';
  res.header('Vary', 'Origin');
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');

  // If the browser is asking about private-network access during preflight,
  // explicitly allow it so secure contexts can reach this local server.
  if (req.headers['access-control-request-private-network']) {
    res.header('Access-Control-Allow-Private-Network', 'true');
  }

  // Quick response for preflight
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '5mb' }));

const DATA_FILE = path.join(__dirname, '..', 'src', 'data', 'equipes.js');
const DEFAULT_DROPBOX_URL = 'https://www.dropbox.com/scl/fi/1kz6krn7c8l28fnrhzwy5/03.-PRODU-O-BCB.xlsm?rlkey=tqbxj8o4tpke64z823wk2ptj4&st=hryu8b13&dl=1';
const DROPBOX_URL = process.env.DIARIO_DROPBOX_URL || DEFAULT_DROPBOX_URL;
const DEFAULT_LOCAL_PATH = path.join(
  'C:\\Users\\Italo\\Dropbox\\OBRAS\\MEDIÇÃO\\03. MARÇO - 26\\BCB',
  '03.-PRODU-O-BCB.xlsm'
);
const DROPBOX_LOCAL_PATH = process.env.DIARIO_LOCAL_PATH || DEFAULT_LOCAL_PATH;

const ensureDlParam = (url) => (/[?&]dl=/.test(url) ? url : `${url}${url.includes('?') ? '&' : '?'}dl=1`);

app.post('/save-equipes', (req, res) => {
  const { equipes } = req.body;
  if (!Array.isArray(equipes)) return res.status(400).json({ error: 'Payload must be an array' });

  const fileContent = `// Fonte de dados local para equipes\nexport default ${JSON.stringify(equipes, null, 2)};\n`;

  fs.writeFile(DATA_FILE, fileContent, 'utf8', (err) => {
    if (err) {
      console.error('Erro ao gravar arquivo:', err);
      return res.status(500).json({ error: 'Failed to write data file' });
    }
    console.log('Dados salvos em', DATA_FILE);
    return res.json({ ok: true });
  });
});

// Attempt to read a workbook from an explicit local path or by searching a folder.
const DEFAULT_LOCAL_SEARCH_DIR = path.join('C:\\Users\\ytalo\\OneDrive', 'Área de Trabalho', 'PRODUÇÃO BACABAL');

const findLocalXlsFile = (dir) => {
  try {
    if (!fs.existsSync(dir)) return null;
    const entries = fs.readdirSync(dir);
    const candidates = entries
      // Ignore temporary Excel lock files (e.g. "~$PRODUCAO.xlsm")
      .filter((n) => /\.(xlsm?|xlsx)$/i.test(n) && !/^~\$/i.test(n))
      .map((n) => {
        const full = path.join(dir, n);
        const stats = fs.statSync(full);
        return {
          name: n,
          full,
          isFile: stats.isFile(),
          mtime: stats.mtimeMs,
        };
      })
      .filter((item) => item.isFile)
      .sort((a, b) => b.mtime - a.mtime);
    return candidates.length ? candidates[0].full : null;
  } catch (err) {
    console.error('Erro ao procurar arquivos locais:', err.message);
    return null;
  }
};

const readLocalWorkbook = () => {
  try {
    // If an explicit path is provided via env, prefer it
    if (DROPBOX_LOCAL_PATH && fs.existsSync(DROPBOX_LOCAL_PATH)) {
      const workbook = XLSX.readFile(DROPBOX_LOCAL_PATH, { cellDates: true });
      console.log('Loaded planilha from explicit local path:', DROPBOX_LOCAL_PATH);
      return workbook;
    }

    // Otherwise try environment-specified directory
    const envDir = process.env.DIARIO_LOCAL_DIR;
    let candidate = null;
    if (envDir) candidate = findLocalXlsFile(envDir);

    // If not found, search the default folder used by the user
    if (!candidate) candidate = findLocalXlsFile(DEFAULT_LOCAL_SEARCH_DIR);

    if (!candidate) {
      console.warn('Local Dropbox file not found at', DROPBOX_LOCAL_PATH || DEFAULT_LOCAL_SEARCH_DIR);
      return null;
    }

    const workbook = XLSX.readFile(candidate, { cellDates: true });
    console.log('Loaded planilha from local candidate:', candidate);
    return workbook;
  } catch (err) {
    console.error('Erro ao carregar planilha local:', err.message);
    return null;
  }
};

const fetchDropboxWorkbook = async () => {
  const response = await fetch(ensureDlParam(DROPBOX_URL));
  if (!response.ok) {
    throw new Error(`Falha HTTP ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  return XLSX.read(buffer, { type: 'buffer', cellDates: true });
};

// Try to extract a sheet by name, case-insensitive. Defaults to 'DIÁRIO'.
const extractSheetByName = (workbook, requestedName = 'DIÁRIO') => {
  if (!workbook || !workbook.Sheets) return null;
  const sheets = Object.keys(workbook.Sheets || {});
  // try exact key first
  if (workbook.Sheets[requestedName]) return workbook.Sheets[requestedName];
  // case-insensitive match
  const upper = requestedName.toString().toUpperCase();
  const found = sheets.find((s) => s.toString().toUpperCase() === upper);
  if (found) return workbook.Sheets[found];
  // fallback: try common names
  const common = ['DIÁRIO', 'DIARIO', 'OBRAS', 'EME', 'CUSTEIO'];
  for (const name of common) {
    const f = sheets.find((s) => s.toString().toUpperCase() === name);
    if (f) return workbook.Sheets[f];
  }
  return null;
};

app.get('/dropbox-diario', async (_req, res) => {
  try {
    let origin = '';
    let workbook = null;
    let remoteError = null;

    try {
      workbook = await fetchDropboxWorkbook();
      origin = 'remote';
      console.log('Loaded planilha from Dropbox URL');
    } catch (err) {
      remoteError = err;
      console.error('Falha ao baixar do Dropbox:', err.message);
    }

    if (!workbook) {
      workbook = readLocalWorkbook();
      origin = workbook ? 'local' : origin;
    }

    if (!workbook) {
      return res.status(500).json({
        error: 'Não foi possível abrir a planilha pelo Dropbox nem localmente.',
        detail: remoteError ? remoteError.message : 'Sem detalhes adicionais.',
      });
    }

    // allow caller to request a specific sheet name (e.g. ?sheet=OBRAS)
    const requestedSheet = (_req.query && _req.query.sheet) ? String(_req.query.sheet) : 'DIÁRIO';
    const diarioSheet = extractSheetByName(workbook, requestedSheet);

    if (!diarioSheet) {
      return res.status(500).json({ error: `Não foi possível localizar a aba ${requestedSheet} na planilha` });
    }

    const rows = XLSX.utils.sheet_to_json(diarioSheet, { header: 1, raw: true });
    try {
      const normalized = normalizeDiarioRows(rows, { sheetName: requestedSheet });
      res.setHeader('Cache-Control', 'no-store');
      return res.json({
        data: normalized,
        origin,
        generatedAt: new Date().toISOString(),
      });
    } catch (normErr) {
      console.error('normalizeDiarioRows error:', normErr.message);
      // return some diagnostic info to help debugging the sheet structure
      const sample = rows.slice(0, 12);
      return res.status(500).json({
        error: 'Falha ao normalizar a planilha',
        detail: normErr.message,
        sampleRows: sample,
        origin,
      });
    }
  } catch (err) {
    console.error('Erro ao buscar planilha do Dropbox:', err);
    return res.status(500).json({ error: 'Erro ao processar planilha', detail: err.message });
  }
});

const port = process.env.PORT || 5176;
app.listen(port, () => console.log(`saveEquipesServer listening on http://localhost:${port}`));
