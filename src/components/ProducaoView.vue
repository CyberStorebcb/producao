<template>
  <div class="dev-page">
    <div class="dev-hero">
      <div class="dev-topbar"></div>
      <div class="dev-content text-center">
        <h1 class="display-4 fw-bold">EM DESENVOLVIMENTO</h1>
        <p class="lead mt-2">Área de Produção em desenvolvimento. Voltaremos em breve com funcionalidades completas.</p>
        <div class="pulse mt-4" aria-hidden="true"></div>
      </div>
    </div>
  </div>
</template>

<script>
import * as XLSX from 'xlsx';

export default {
  name: 'ProducaoView',
  data() {
    return {
      excelData: [],
    };
  },
  methods: {
    handleFileUpload(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        this.excelData = json;
      };
      reader.readAsArrayBuffer(file);
    },
  },
};
</script>

<style scoped>
.excel-table-wrapper {
  max-height: 350px;
  overflow-y: auto;
  border-radius: 1rem;
  box-shadow: 0 2px 16px rgba(0,0,0,0.07);
  background: var(--card-bg);
}
.excel-table {
  border-radius: 1rem;
  overflow: hidden;
}
.excel-table th, .excel-table td {
  vertical-align: middle;
  font-size: 1rem;
  padding: 0.5rem 0.75rem;
}
.excel-table thead th {
  position: sticky;
  top: 0;
  background: linear-gradient(90deg, var(--primary-1) 0%, var(--primary-2) 100%);
  color: var(--card-bg);
  z-index: 2;
}
.excel-table tbody tr.table-light {
  background: rgba(0,0,0,0.03);
}
.badge.bg-primary {
  background: linear-gradient(90deg, var(--primary-1) 0%, var(--primary-2) 100%) !important;
  font-size: 1rem;
  padding: 0.5em 1em;
  border-radius: 1em;
}

.excel-table, .excel-table td, .excel-table th {
  color: var(--text);
}

/* Dev banner styles */
.dev-hero { max-width:980px; margin:40px auto; border-radius:14px; overflow:hidden; box-shadow: 0 18px 40px rgba(2,6,23,0.18); }
.dev-topbar { height:8px; background: linear-gradient(90deg,var(--primary-1),var(--primary-2)); position:relative; }
.dev-topbar::after { content: ''; position:absolute; left:-40%; top:0; width:40%; height:100%; background:linear-gradient(90deg, rgba(255,255,255,0.15), rgba(255,255,255,0.02)); transform: skewX(-18deg); animation: sweep 2.2s linear infinite; opacity:0.6 }
@keyframes sweep { 0% { left:-40% } 100% { left:140% } }
.dev-content { padding:44px 28px; background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); }
.pulse { width:80px; height:8px; margin:0 auto; border-radius:8px; background: linear-gradient(90deg, rgba(62,198,224,0.9), rgba(6,78,209,0.9)); box-shadow: 0 8px 20px rgba(6,78,209,0.12); animation: pulse 1.6s ease-in-out infinite; }
@keyframes pulse { 0% { transform: scaleX(0.92); opacity:0.9 } 50% { transform: scaleX(1.06); opacity:1 } 100% { transform: scaleX(0.92); opacity:0.9 } }
</style>
