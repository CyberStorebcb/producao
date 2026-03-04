const XLSX = require('xlsx');

const normalizeTeamCode = (code = '') => code.replace(/MA-BCB-O(\d{3}M)/, 'MA-BCB-0$1');

const excelSerialToDate = (value) => {
  if (typeof value !== 'number') return null;
  const parsed = XLSX.SSF.parse_date_code(value);
  if (!parsed) return null;
  return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
};

(async () => {
  const res = await fetch('https://www.dropbox.com/scl/fi/1kz6krn7c8l28fnrhzwy5/03.-PRODU-O-BCB.xlsm?rlkey=tqbxj8o4tpke64z823wk2ptj4&dl=1');
  if (!res.ok) {
    console.error('HTTP error', res.status);
    return;
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets['DIÁRIO'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const headerIndex = rows.findIndex((row) => {
    const cell = row && row[0] ? row[0].toString().trim().toUpperCase() : '';
    return cell === 'BASE';
  });
  const headerRow = rows[headerIndex];
  const availableDates = headerRow
    .map((value, idx) => ({ value, idx }))
    .filter((item) => typeof item.value === 'number')
    .map((item) => {
      const date = excelSerialToDate(item.value);
      return date ? { idx: item.idx, key: date.toISOString().slice(0, 10) } : null;
    })
    .filter(Boolean);

  const selected = availableDates.find((d) => d.key === '2026-03-02');
  console.log('selected column', selected);

  let currentTeam = '';
  const apontadoRows = new Map();
  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row) continue;
    if (row[2]) currentTeam = row[2].toString().trim();
    if (!currentTeam) continue;
    const itemCell = row[4] ? row[4].toString().toLowerCase() : '';
    if (itemCell.includes('apontado r$')) {
      const normalized = normalizeTeamCode(currentTeam);
      apontadoRows.set(normalized, row);
    }
  }

  const sample = apontadoRows.get('MA-BCB-0001M');
  console.log('row slice', sample.slice(4, 10));
  console.log('value idx', selected.idx, 'raw', sample[selected.idx]);
})();
