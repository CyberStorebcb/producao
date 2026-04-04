const XLSX = require('xlsx');

function normalizeDropboxUrl(url) {
  if (!url) return '';
  return /[?&]dl=/.test(url) ? url.replace(/([?&])dl=0/, '$1dl=1') : `${url}${url.includes('?') ? '&' : '?'}dl=1`;
}

function isHtmlResponse(response, buffer) {
  const contentType = String(response.headers.get('content-type') || '').toLowerCase();
  const bufferPreview = buffer.slice(0, 512).toString('utf8').toLowerCase();
  return contentType.includes('text/html') || bufferPreview.includes('<!doctype html') || bufferPreview.includes('<html');
}

async function fetchDropboxBinary(url) {
  const response = await fetch(normalizeDropboxUrl(url));
  if (!response.ok) {
    throw new Error(`Falha ao baixar arquivo do Dropbox (${response.status}).`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (isHtmlResponse(response, buffer)) {
    throw new Error('O Dropbox retornou HTML em vez do arquivo Excel.');
  }

  return buffer;
}

async function loadWorkbookFromDropbox(url) {
  const buffer = await fetchDropboxBinary(url);
  return XLSX.read(buffer, { type: 'buffer', cellDates: true });
}

module.exports = {
  normalizeDropboxUrl,
  fetchDropboxBinary,
  loadWorkbookFromDropbox,
};