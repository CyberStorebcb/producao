const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { loadWorkbookFromDropbox } = require('../shared/dropboxWorkbook');
const {
  DEFAULT_DISTRICT_FILTERS,
  DEFAULT_STATUS_FILTERS,
  buildFilteredTopOpportunities,
} = require('../shared/oportunidadesRobot');

const DEFAULT_DROPBOX_URL = 'https://www.dropbox.com/scl/fi/wu9hl40m1xrncgdx9gjpv/ACOM-OBRAS-2025.xlsx?rlkey=sfuyra3tijrl46qqw6app4u0k&st=y1qvlicx&dl=0';
const SOURCE_SHEET_NAME = 'OBRAS';

function loadLocalEnv() {
  const envPath = path.resolve('.env');
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf8');
  content.split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) return;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^['"]|['"]$/g, '');
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  });
}

function readArg(name, fallback) {
  const prefix = `--${name}=`;
  const match = process.argv.find((arg) => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : fallback;
}

async function main() {
  loadLocalEnv();

  const topN = Number(readArg('topN', '10')) > 0 ? Number(readArg('topN', '10')) : 10;
  const districts = String(readArg('districts', DEFAULT_DISTRICT_FILTERS.join(',')))
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const statuses = String(readArg('statuses', DEFAULT_STATUS_FILTERS.join(',')))
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const workbook = await loadWorkbookFromDropbox(process.env.OPORTUNIDADES_DROPBOX_URL || DEFAULT_DROPBOX_URL);
  const sourceSheet = workbook.Sheets[SOURCE_SHEET_NAME];
  if (!sourceSheet) {
    throw new Error(`Não foi possível localizar a aba ${SOURCE_SHEET_NAME} na planilha.`);
  }

  const rows = XLSX.utils.sheet_to_json(sourceSheet, { header: 1, raw: false });
  const payload = buildFilteredTopOpportunities(rows, { topN, districtFilters: districts, statusFilters: statuses });
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

main().catch((error) => {
  console.error('oportunidadesRobot error:', error.message);
  process.exitCode = 1;
});