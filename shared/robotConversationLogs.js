// Opt-in conversation logging helpers (client-side session storage)
const LOG_KEY = 'robot-conversation-logs-v1';

function _read() {
  try {
    const raw = window.sessionStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function _write(arr) {
  try {
    window.sessionStorage.setItem(LOG_KEY, JSON.stringify(arr));
  } catch {
    // ignore
  }
}

function addEntry(entry, optIn = true) {
  if (!optIn) return false;
  const logs = _read();
  const record = Object.assign({ ts: new Date().toISOString() }, entry);
  logs.push(record);
  _write(logs);
  return true;
}

function getLogs() {
  return _read();
}

function clearLogs() {
  _write([]);
}

function downloadLogs() {
  const data = JSON.stringify(_read(), null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'robot-conversation-logs.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

module.exports = { addEntry, getLogs, clearLogs, downloadLogs };
