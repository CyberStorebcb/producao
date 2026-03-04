const XLSX = require('xlsx');

const normalize = (code = '') => code.replace(/MA-BCB-O(\d{3}M)/, 'MA-BCB-0$1');
const excelSerialToDate = (value) => {
  if (typeof value !== 'number') return null;
  const parsed = XLSX.SSF.parse_date_code(value);
  return parsed ? new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d)) : null;
};

const pickDefaultDate = (columns) => {
  const todayKey = new Date().toISOString().slice(0, 10);
  let column = columns.find((col) => col.key === todayKey);
  if (!column) {
    const previous = columns.filter((col) => col.key <= todayKey);
    column = previous.length ? previous[previous.length - 1] : columns[columns.length - 1];
  }
  return column;
};

(async () => {
  const res = await fetch('https://www.dropbox.com/scl/fi/1kz6krn7c8l28fnrhzwy5/03.-PRODU-O-BCB.xlsm?rlkey=tqbxj8o4tpke64z823wk2ptj4&dl=1');
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets['DIÁRIO'];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  const headerIndex = rows.findIndex((row) => ((row?.[0] || '').toString().trim().toUpperCase() === 'BASE'));
  const headerRow = rows[headerIndex];
  const dateColumns = headerRow
    .map((value, idx) => ({ value, idx }))
    .filter((item) => typeof item.value === 'number')
    .map((item) => {
      const date = excelSerialToDate(item.value);
      return date
        ? {
            idx: item.idx,
            key: date.toISOString().slice(0, 10),
            label: date.toISOString().slice(0, 10),
          }
        : null;
    })
    .filter(Boolean);

  console.log('Total date columns', dateColumns.length);
  const initial = pickDefaultDate(dateColumns);
  console.log('Initial column', initial);

  const teams = [];
  let currentTeam = '';
  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row) continue;
    if (row[2]) currentTeam = row[2].toString().trim();
    if (!currentTeam) continue;
    const itemCell = (row[4] || '').toString().toLowerCase();
    if (itemCell.includes('apontado r$')) {
      teams.push({ code: normalize(currentTeam), display: currentTeam, row });
    }
  }

  const valueFor = (team, idx) => {
    const raw = team.row[idx];
    if (typeof raw === 'number') return raw;
    if (typeof raw === 'string') {
      const normalized = raw
        .replace(/\s+/g, '')
        .replace(/\./g, '')
        .replace(',', '.')
        .replace(/[^0-9.+-]/g, '');
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return 0;
  };

  const firstTeam = teams[0];
  console.log('Team', firstTeam.display);
  console.log('Row sample', firstTeam.row.slice(4, 10));
  console.log('Value on initial column', valueFor(firstTeam, initial.idx));
  const march2 = dateColumns.find((c) => c.key === '2026-03-02');
  console.log('March 2 column', march2);
  console.log('Value on March 2', valueFor(firstTeam, march2.idx));
})();
