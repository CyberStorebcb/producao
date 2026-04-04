let htmlToImageModulePromise;
let jsPdfModulePromise;
let xlsxModulePromise;

async function getHtmlToImageModule() {
  if (!htmlToImageModulePromise) {
    htmlToImageModulePromise = import('html-to-image');
  }
  return htmlToImageModulePromise;
}

async function getJsPdfModule() {
  if (!jsPdfModulePromise) {
    jsPdfModulePromise = import('jspdf');
  }
  return jsPdfModulePromise;
}

async function getXlsxModule() {
  if (!xlsxModulePromise) {
    xlsxModulePromise = import('xlsx');
  }
  return xlsxModulePromise;
}

export async function captureElementAsPng(target, options = {}) {
  const { toPng } = await getHtmlToImageModule();
  return toPng(target, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: '#0f172a',
    ...options,
  });
}

export async function saveChartPdf({ dataUrl, filename, title, subtitle, infoLine }) {
  const { jsPDF } = await getJsPdfModule();
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const titleY = 16;
  const subtitleY = 24;
  const infoY = 31;
  const chartY = 38;
  const renderWidth = pageWidth - margin * 2;
  const renderHeight = pageHeight - chartY - margin;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(title, margin, titleY);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(subtitle, margin, subtitleY);
  pdf.text(infoLine, margin, infoY);
  pdf.addImage(dataUrl, 'PNG', margin, chartY, renderWidth, renderHeight, undefined, 'FAST');
  pdf.save(filename);
}

export async function createExcelBuffer(rows, sheetName = 'Historico') {
  const XLSX = await getXlsxModule();
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  return XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
}