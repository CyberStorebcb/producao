<template>
  <div>
    <h1>Produção</h1>
    <p>Bem-vindo à área de produção!</p>
    <div class="mt-4">
      <label class="form-label fw-bold">Importar arquivo Excel:</label>
      <input type="file" class="form-control" accept=".xlsx,.xls" @change="handleFileUpload" />
      <div v-if="excelData.length" class="mt-4">
        <div class="d-flex align-items-center mb-2 gap-2">
          <h5 class="mb-0">Prévia dos dados importados</h5>
          <span class="badge bg-primary">{{ excelData.length - 1 }} linhas</span>
        </div>
        <div class="table-responsive excel-table-wrapper">
          <table class="table table-hover table-bordered align-middle mb-0 excel-table">
            <thead class="table-primary sticky-top">
              <tr>
                <th v-for="(col, idx) in excelData[0]" :key="'col'+idx" class="text-nowrap">{{ col }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rIdx) in excelData.slice(1, 21)" :key="'row'+rIdx" :class="{'table-light': rIdx % 2 === 0}">
                <td v-for="(cell, cIdx) in row" :key="'cell'+cIdx" class="text-nowrap">{{ cell }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="excelData.length > 21" class="text-muted small mt-1">Exibindo as 20 primeiras linhas de {{ excelData.length - 1 }}...</div>
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
</style>
