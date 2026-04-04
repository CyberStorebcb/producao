const LOG_KEY = 'robot-conversation-logs-v1';

function readLogs() {
  try {
    const raw = window.sessionStorage.getItem(LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLogs(entries) {
  try {
    window.sessionStorage.setItem(LOG_KEY, JSON.stringify(entries));
  } catch {
  }
}

function addEntry(entry, optIn = true) {
  if (!optIn) return false;
  const logs = readLogs();
  logs.push({ ts: new Date().toISOString(), ...entry });
  writeLogs(logs);
  return true;
}

function getLogs() {
  return readLogs();
}

function clearLogs() {
  writeLogs([]);
}

function downloadLogs() {
  const data = JSON.stringify(readLogs(), null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'robot-conversation-logs.json';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export { addEntry, getLogs, clearLogs, downloadLogs };
