<template>
  <section class="dashboard-novo dark-theme">
    <header class="dashboard-header">
      <div class="header-left">
        <div class="dashboard-top-label">Visão de Solicitação de intervenção</div>
        <h1 class="dashboard-title">CGB ENERGIA</h1>
        <p class="dashboard-desc">Comparativo de desempenho de pontualidade em entregas e evolução de prazo.</p>
      </div>
      <div class="header-filters">
        <div class="control-field compact">
          <label>Período</label>
          <select v-model="filters.month">
            <option value="">Últimos 30 dias</option>
            <option v-for="month in allMonths" :key="month" :value="month">{{ month }}</option>
          </select>
        </div>
        <div class="control-field compact">
          <label>Região</label>
          <select v-model="filters.base">
            <option value="">Todas</option>
            <option v-for="base in allBases" :key="base" :value="base">{{ base }}</option>
          </select>
        </div>
      </div>
    </header>

    <div class="top-cards">
      <div class="metric-card">
        <span class="metric-label">Índice de Pontualidade Geral (CGB ENERGIA)</span>
        <strong class="metric-value">{{ kpiCGB }}%</strong>
        <span class="metric-note">+{{ marketAdvantage }} pontos vs mercado</span>
      </div>
      <div class="metric-card">
        <span class="metric-label">Índice de Pontualidade do Mercado (Média)</span>
        <strong class="metric-value">{{ marketLatest }}%</strong>
        <span class="metric-note">Referência do setor</span>
      </div>
      <div class="gauge-card">
        <div class="gauge-header">Performance CGB</div>
        <ApexCharts
          type="radialBar"
          :series="gaugeSeries"
          :options="gaugeOptions"
          height="240"
          class="gauge-chart"
        />
      </div>
    </div>

    <div class="charts-grid">
      <div class="chart-block">
        <div class="chart-block-header">
          <div>
            <h2>Comparação de Entregas No Prazo por Concorrente</h2>
            <p>Comparativo entre CGB, concorrentes e média do mercado.</p>
          </div>
        </div>
        <ApexCharts
          type="bar"
          :options="barChartOptions"
          :series="barChartSeries"
          height="380"
          class="chart-canvas"
        />
      </div>

      <div class="chart-block">
        <div class="chart-block-header">
          <div>
            <h2>Evolução Semanal de Pontualidade</h2>
            <p>Sua empresa x mercado ao longo do tempo.</p>
          </div>
        </div>
        <ApexCharts
          type="line"
          :options="lineChartOptions"
          :series="lineChartSeries"
          height="380"
          class="chart-canvas"
        />
      </div>
    </div>

    <div class="table-card">
      <div class="table-header-row">
        <h2>Status de Entrega Recentes</h2>
        <span>{{ totalRecords }} registros</span>
      </div>
      <div class="table-responsive">
        <table class="dashboard-table">
          <thead>
            <tr>
              <th>ID Pedido</th>
              <th>Fornecedor</th>
              <th>Base</th>
              <th>Prazo</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in recentRows" :key="item.solicitacao + item.base + item.fornecedor">
              <td>{{ item.solicitacao }}</td>
              <td>{{ item.fornecedor }}</td>
              <td>{{ item.base }}</td>
              <td>{{ item.mes }}</td>
              <td :class="item.prazo === 'NO_PRAZO' ? 'status-ok' : 'status-late'">
                {{ item.prazo === 'NO_PRAZO' ? 'No Prazo' : 'Fora do Prazo' }}
              </td>
            </tr>
            <tr v-if="!recentRows.length">
              <td colspan="5" class="empty-state">Nenhum registro encontrado.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>
</template>

<script>
import ApexCharts from 'vue3-apexcharts';

const MOCK_DESLIGAMENTOS = [
  { mes: 'JANEIRO', fornecedor: 'NÃO CGB', solicitacao: '91473', base: 'NÃO CGB', resp: 'NÃO CGB', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'CGB', solicitacao: '93648', base: 'STI', resp: 'EDIVAN', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'CGB', solicitacao: '92826', base: 'BCB', resp: 'MIKEIAS', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'CGB', solicitacao: '92155', base: 'STI', resp: 'EDIVAN', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'CGB', solicitacao: '91662', base: 'ITM', resp: 'CRISTOPHE', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'NÃO CGB', solicitacao: '93369', base: 'NÃO CGB', resp: 'NÃO CGB', prazo: 'FORA_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'NÃO CGB', solicitacao: '91707', base: 'NÃO CGB', resp: 'NÃO CGB', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'CGB', solicitacao: '92929', base: 'ITM', resp: 'CRISTOPHE', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'NÃO CGB', solicitacao: '91129', base: 'NÃO CGB', resp: 'NÃO CGB', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'CGB', solicitacao: '92475', base: 'ITM', resp: 'CRISTOPHE', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'NÃO CGB', solicitacao: '92194', base: 'NÃO CGB', resp: 'NÃO CGB', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'CGB', solicitacao: '94513', base: 'ITM', resp: 'CRISTOPHE', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'NÃO CGB', solicitacao: '92183', base: 'NÃO CGB', resp: 'NÃO CGB', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'NÃO CGB', solicitacao: '94221', base: 'NÃO CGB', resp: 'NÃO CGB', prazo: 'FORA_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'NÃO CGB', solicitacao: '94529', base: 'NÃO CGB', resp: 'NÃO CGB', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'CGB', solicitacao: '92946', base: 'ITM', resp: 'CRISTOPHE', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'CGB', solicitacao: '93624', base: 'BCB', resp: 'MIKEIAS', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'NÃO CGB', solicitacao: '91326', base: 'NÃO CGB', resp: 'NÃO CGB', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'NÃO CGB', solicitacao: '95098', base: 'NÃO CGB', resp: 'NÃO CGB', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'NÃO CGB', solicitacao: '92185', base: 'NÃO CGB', resp: 'NÃO CGB', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'CGB', solicitacao: '91593', base: 'STI', resp: 'EDIVAN', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'NÃO CGB', solicitacao: '93678', base: 'NÃO CGB', resp: 'NÃO CGB', prazo: 'FORA_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'CGB', solicitacao: '93585', base: 'BCB', resp: 'MIKEIAS', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'CGB', solicitacao: '94783', base: 'BCB', resp: 'MIKEIAS', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'NÃO CGB', solicitacao: '91263', base: 'NÃO CGB', resp: 'NÃO CGB', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'NÃO CGB', solicitacao: '91220', base: 'NÃO CGB', resp: 'NÃO CGB', prazo: 'FORA_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'CGB', solicitacao: '89978', base: 'PDT', resp: 'RAIMUNDO', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'NÃO CGB', solicitacao: '95344', base: 'NÃO CGB', resp: 'NÃO CGB', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'NÃO CGB', solicitacao: '91413', base: 'NÃO CGB', resp: 'NÃO CGB', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'CGB', solicitacao: '92716', base: 'BCB', resp: 'MIKEIAS', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'CGB', solicitacao: '91921', base: 'ITM', resp: 'CRISTOPHE', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'NÃO CGB', solicitacao: '91130', base: 'NÃO CGB', resp: 'NÃO CGB', prazo: 'FORA_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'NÃO CGB', solicitacao: '91141', base: 'NÃO CGB', resp: 'NÃO CGB', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'NÃO CGB', solicitacao: '95340', base: 'NÃO CGB', resp: 'NÃO CGB', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'CGB', solicitacao: '93616', base: 'STI', resp: 'EDIVAN', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'CGB', solicitacao: '92751', base: 'BCB', resp: 'MIKEIAS', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'CGB', solicitacao: '91870', base: 'BCB', resp: 'MIKEIAS', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'NÃO CGB', solicitacao: '91390', base: 'NÃO CGB', resp: 'NÃO CGB', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'CGB', solicitacao: '94785', base: 'BCB', resp: 'MIKEIAS', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'CGB', solicitacao: '92473', base: 'ITM', resp: 'CRISTOPHE', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'NÃO CGB', solicitacao: '94804', base: 'NÃO CGB', resp: 'NÃO CGB', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'NÃO CGB', solicitacao: '95332', base: 'NÃO CGB', resp: 'NÃO CGB', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'CGB', solicitacao: '92752', base: 'BCB', resp: 'MIKEIAS', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'CGB', solicitacao: '92471', base: 'ITM', resp: 'CRISTOPHE', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'CGB', solicitacao: '92158', base: 'STI', resp: 'EDIVAN', prazo: 'NO_PRAZO' },
  { mes: 'JANEIRO', fornecedor: 'CGB', solicitacao: '92271', base: 'BCB', resp: 'MIKEIAS', prazo: 'NO_PRAZO' },
];

const MONTH_ORDER = ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'];

function safePercent(value, total) {
  if (!total) return 0;
  return Math.round((value / total) * 100);
}

export default {
  name: 'DesligamentoAd',
  components: { ApexCharts },
  props: {
    desligamentos: {
      type: Array,
      default: () => MOCK_DESLIGAMENTOS,
    },
  },
  data() {
    return {
      selectedView: 'comparativo',
      filters: {
        month: '',
        base: '',
        fornecedor: '',
        status: '',
      },
    };
  },
  computed: {
    allMonths() {
      const months = [...new Set(this.desligamentos.map(item => item.mes))];
      return months.sort((a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b));
    },
    allBases() {
      const counts = {};
      this.desligamentos.forEach(item => {
        counts[item.base] = (counts[item.base] || 0) + 1;
      });
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([base]) => base);
    },
    allFornecedores() {
      return [...new Set(this.desligamentos.map(item => item.fornecedor))];
    },
    filteredDesligamentos() {
      return this.desligamentos.filter(item => {
        const matchMonth = !this.filters.month || item.mes === this.filters.month;
        const matchBase = !this.filters.base || item.base === this.filters.base;
        const matchFornecedor = !this.filters.fornecedor || item.fornecedor === this.filters.fornecedor;
        const matchStatus = !this.filters.status || item.prazo === this.filters.status;
        return matchMonth && matchBase && matchFornecedor && matchStatus;
      });
    },
    filteredBases() {
      const counts = {};
      this.filteredDesligamentos.forEach(item => {
        counts[item.base] = (counts[item.base] || 0) + 1;
      });
      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([base]) => base);
    },
    totalRecords() {
      return this.filteredDesligamentos.length;
    },
    totalOnTime() {
      return this.filteredDesligamentos.filter(item => item.prazo === 'NO_PRAZO').length;
    },
    totalLate() {
      return this.filteredDesligamentos.filter(item => item.prazo === 'FORA_PRAZO').length;
    },
    totalOnTimePercent() {
      return safePercent(this.totalOnTime, this.totalRecords);
    },
    totalLatePercent() {
      return safePercent(this.totalLate, this.totalRecords);
    },
    cgbItems() {
      return this.filteredDesligamentos.filter(item => item.fornecedor === 'CGB');
    },
    outrosItems() {
      return this.filteredDesligamentos.filter(item => item.fornecedor !== 'CGB');
    },
    cgbOnTime() {
      return this.cgbItems.filter(item => item.prazo === 'NO_PRAZO').length;
    },
    kpiCGB() {
      return safePercent(this.cgbOnTime, this.cgbItems.length);
    },
    marketAverage() {
      return this.totalRecords ? safePercent(this.totalOnTime, this.totalRecords) : 0;
    },
    trendMonths() {
      const months = [...new Set(this.filteredDesligamentos.map(item => item.mes))];
      return months.sort((a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b));
    },
    marketTrend() {
      return this.trendMonths.map(month => {
        const monthItems = this.filteredDesligamentos.filter(item => item.mes === month);
        const monthCGB = monthItems.filter(item => item.fornecedor === 'CGB');
        const cgbOnTime = monthCGB.filter(item => item.prazo === 'NO_PRAZO').length;
        const marketOnTime = monthItems.filter(item => item.prazo === 'NO_PRAZO').length;
        return {
          month,
          cgb: safePercent(cgbOnTime, monthCGB.length),
          mercado: safePercent(marketOnTime, monthItems.length),
        };
      });
    },
    marketLatest() {
      return this.marketTrend[this.marketTrend.length - 1]?.mercado || 0;
    },
    marketAdvantage() {
      return this.kpiCGB - this.marketLatest;
    },
    trendDirection() {
      const last = this.marketTrend[this.marketTrend.length - 1]?.mercado || 0;
      const previous = this.marketTrend[this.marketTrend.length - 2]?.mercado || 0;
      return last >= previous ? 'Estável / Crescente' : 'Leve queda';
    },
    topLateBase() {
      const counts = {};
      this.filteredDesligamentos
        .filter(item => item.prazo === 'FORA_PRAZO')
        .forEach(item => {
          counts[item.base] = (counts[item.base] || 0) + 1;
        });
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Sem dados';
    },
    bestSupplier() {
      const suppliers = ['CGB', 'NÃO CGB'];
      const results = suppliers.map(supplier => {
        const supplierItems = this.filteredDesligamentos.filter(item => item.fornecedor === supplier);
        const onTime = supplierItems.filter(item => item.prazo === 'NO_PRAZO').length;
        return { supplier, score: safePercent(onTime, supplierItems.length), count: supplierItems.length };
      });
      const best = results.sort((a, b) => b.score - a.score)[0];
      return best && best.count ? `${best.supplier} (${best.score}%)` : 'Sem dados';
    },
    recentRows() {
      return this.filteredDesligamentos.slice(0, 6);
    },
    gaugeSeries() {
      return [this.kpiCGB];
    },
    gaugeOptions() {
      return {
        chart: { toolbar: { show: false }, background: 'transparent' },
        plotOptions: {
          radialBar: {
            startAngle: -135,
            endAngle: 135,
            hollow: { size: '65%' },
            track: { background: '#0f172a', strokeWidth: '100%' },
            dataLabels: {
              name: { show: false },
              value: {
                color: '#f8fafc',
                fontSize: '2.8rem',
                fontWeight: 700,
                formatter: value => `${value}%`,
              },
              total: {
                show: true,
                label: 'Média mercado',
                color: '#94a3b8',
                formatter: () => `${this.marketAverage}%`,
              },
            },
          },
        },
        fill: {
          type: 'gradient',
          gradient: { shade: 'dark', type: 'horizontal', gradientToColors: ['#7c3aed'], stops: [0, 100] },
        },
        colors: ['#8b5cf6'],
        labels: ['Pontualidade'],
        tooltip: { theme: 'dark' },
        noData: {
          text: 'Sem dados para esta seleção.',
          align: 'center',
          verticalAlign: 'middle',
          style: { color: '#94a3b8', fontSize: '14px' },
        },
      };
    },
    chartModes() {
      return [
        { key: 'comparativo', label: 'CGB vs Mercado', title: 'Comparativo de pontualidade', description: 'CGB x Mercado por base' },
        { key: 'base', label: 'Por Base', title: 'Desempenho por base', description: 'No prazo vs Fora do prazo por base' },
        { key: 'fornecedor', label: 'Por Fornecedor', title: 'Desempenho por fornecedor', description: 'CGB e Outros no prazo' },
      ];
    },
    currentChart() {
      return this.chartModes.find(mode => mode.key === this.selectedView) || this.chartModes[0];
    },
    barCategories() {
      return this.filteredBases.slice(0, 4);
    },
    mainChartType() {
      return this.selectedView === 'fornecedor' ? 'donut' : 'bar';
    },
    mainChartSeries() {
      if (this.selectedView === 'comparativo') {
        return [
          {
            name: 'CGB',
            data: this.barCategories.map(base => {
              const items = this.filteredDesligamentos.filter(item => item.base === base && item.fornecedor === 'CGB');
              return safePercent(items.filter(item => item.prazo === 'NO_PRAZO').length, items.length);
            }),
          },
          {
            name: 'Mercado',
            data: this.barCategories.map(base => {
              const items = this.filteredDesligamentos.filter(item => item.base === base);
              return safePercent(items.filter(item => item.prazo === 'NO_PRAZO').length, items.length);
            }),
          },
        ];
      }

      if (this.selectedView === 'base') {
        return [
          {
            name: 'No Prazo',
            data: this.barCategories.map(base => {
              const items = this.filteredDesligamentos.filter(item => item.base === base);
              return safePercent(items.filter(item => item.prazo === 'NO_PRAZO').length, items.length);
            }),
          },
          {
            name: 'Fora do Prazo',
            data: this.barCategories.map(base => {
              const items = this.filteredDesligamentos.filter(item => item.base === base);
              return safePercent(items.filter(item => item.prazo === 'FORA_PRAZO').length, items.length);
            }),
          },
        ];
      }

      return [
        safePercent(this.cgbItems.filter(item => item.prazo === 'NO_PRAZO').length, this.cgbItems.length),
        safePercent(this.outrosItems.filter(item => item.prazo === 'NO_PRAZO').length, this.outrosItems.length),
      ];
    },
    mainChartOptions() {
      const baseOptions = {
        chart: { toolbar: { show: false }, background: 'transparent' },
        dataLabels: { enabled: false },
        legend: { labels: { colors: '#cbd5e1' }, itemMargin: { horizontal: 12, vertical: 10 } },
        tooltip: { theme: 'dark', y: { formatter: value => `${value}%` } },
        noData: {
          text: 'Sem dados para os filtros atuais.',
          align: 'center',
          verticalAlign: 'middle',
          style: { color: '#94a3b8', fontSize: '14px' },
        },
      };

      if (this.selectedView === 'fornecedor') {
        return {
          ...baseOptions,
          colors: ['#8b5cf6', '#64748b'],
          labels: ['CGB', 'Outros'],
          plotOptions: { pie: { donut: { size: '60%' } } },
          legend: { position: 'bottom', labels: { colors: '#cbd5e1' } },
        };
      }

      return {
        ...baseOptions,
        plotOptions: { bar: { horizontal: false, columnWidth: '40%', borderRadius: 10 } },
        colors: ['#8b5cf6', '#64748b'],
        xaxis: {
          categories: this.barCategories,
          labels: { style: { colors: '#cbd5e1' } },
          axisBorder: { show: false },
          axisTicks: { show: false },
        },
        yaxis: {
          min: 0,
          max: 100,
          labels: { formatter: val => `${val}%`, style: { colors: '#cbd5e1' } },
        },
        grid: { borderColor: 'rgba(148,163,184,0.16)', strokeDashArray: 4 },
      };
    },
    lineChartSeries() {
      return [
        { name: 'CGB', data: this.marketTrend.map(point => point.cgb) },
        { name: 'Mercado', data: this.marketTrend.map(point => point.mercado) },
      ];
    },
    lineChartOptions() {
      return {
        chart: { toolbar: { show: false }, background: 'transparent' },
        stroke: { curve: 'smooth', width: 3 },
        markers: { size: 4, hover: { size: 6 } },
        colors: ['#8b5cf6', '#64748b'],
        xaxis: {
          categories: this.marketTrend.map(point => point.month),
          labels: { style: { colors: '#cbd5e1' } },
          axisBorder: { show: false },
          axisTicks: { show: false },
        },
        yaxis: {
          min: 0,
          max: 100,
          labels: { formatter: val => `${val}%`, style: { colors: '#cbd5e1' } },
        },
        legend: { labels: { colors: '#cbd5e1' } },
        grid: { borderColor: 'rgba(148,163,184,0.16)', strokeDashArray: 4 },
        tooltip: { theme: 'dark', y: { formatter: value => `${value}%` } },
        noData: {
          text: 'Sem dados para os filtros atuais.',
          align: 'center',
          verticalAlign: 'middle',
          style: { color: '#94a3b8', fontSize: '14px' },
        },
      };
    },
  },
  methods: {
    setView(view) {
      this.selectedView = view;
    },
  },
};
</script>

<style scoped>
.dashboard-novo {
  background: #0f172a;
  min-height: 100vh;
  padding: 24px 24px 40px;
  color: #e2e8f0;
  font-family: 'Inter', Arial, sans-serif;
}
.dashboard-header {
  text-align: center;
  margin-bottom: 28px;
}
.dashboard-top-label {
  display: inline-flex;
  padding: 0.45rem 1rem;
  border-radius: 999px;
  background: rgba(168, 85, 247, 0.14);
  color: #d8b4fe;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 0.85rem;
}
.dashboard-title {
  font-size: clamp(2rem, 3.5vw, 3.2rem);
  font-weight: 800;
  color: #f8fafc;
  margin-bottom: 0.75rem;
}
.dashboard-desc {
  color: #cbd5e1;
  font-size: 1rem;
  max-width: 720px;
  margin: 0 auto;
}
.header-filters {
  display: grid;
  grid-template-columns: repeat(2, minmax(180px, 240px));
  gap: 16px;
  justify-content: end;
  align-items: center;
  margin-top: 24px;
}
.control-field {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.control-field label {
  color: #94a3b8;
  font-size: 0.85rem;
}
.control-field select {
  width: 100%;
  min-height: 46px;
  padding: 0.85rem 1rem;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: #111827;
  color: #e2e8f0;
}
.top-cards {
  display: grid;
  grid-template-columns: 1.1fr 1.1fr 0.9fr;
  gap: 20px;
  margin-bottom: 24px;
}
.metric-card,
.gauge-card,
.chart-block,
.table-card {
  background: #111827;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
}
.metric-card {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.metric-label {
  color: #94a3b8;
  font-size: 0.95rem;
  margin-bottom: 16px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.metric-value {
  font-size: clamp(2.2rem, 4vw, 3.5rem);
  font-weight: 900;
  color: #f8fafc;
}
.metric-note {
  color: #cbd5e1;
  margin-top: 8px;
}
.gauge-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding-top: 28px;
}
.gauge-header {
  color: #cbd5e1;
  font-weight: 700;
  margin-bottom: 18px;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.charts-grid {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: 24px;
  margin-bottom: 24px;
}
.chart-block-header {
  margin-bottom: 18px;
}
.chart-block-header h2 {
  font-size: 1rem;
  color: #f8fafc;
  margin-bottom: 6px;
}
.chart-block-header p {
  color: #94a3b8;
  font-size: 0.95rem;
}
.table-card {
  padding: 20px;
}
.table-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}
.dashboard-table {
  width: 100%;
  border-collapse: collapse;
}
.dashboard-table th,
.dashboard-table td {
  padding: 14px 16px;
  text-align: left;
  font-size: 0.95rem;
}
.dashboard-table th {
  color: #cbd5e1;
  background: rgba(255, 255, 255, 0.04);
}
.dashboard-table tr {
  border-bottom: 1px solid rgba(148, 163, 184, 0.08);
}
.status-ok {
  color: #22c55e;
  font-weight: 700;
}
.status-late {
  color: #f97316;
  font-weight: 700;
}
.dashboard-main {
  max-width: 1120px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 24px;
}
.view-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.view-button {
  padding: 0.9rem 1.2rem;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.18);
  background: rgba(15, 23, 42, 0.75);
  color: #cbd5e1;
  cursor: pointer;
  transition: all 0.2s ease;
}
.view-button.active,
.view-button:hover {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.18), rgba(71, 85, 105, 0.24));
  color: #f8fafc;
  border-color: rgba(139, 92, 246, 0.4);
}
.chart-subtitle {
  color: #94a3b8;
  font-size: 0.95rem;
  margin-bottom: 14px;
}
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-top: 16px;
}
.metric-box {
  padding: 18px 20px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(148, 163, 184, 0.08);
}
.metric-label {
  display: block;
  color: #94a3b8;
  font-size: 0.9rem;
  margin-bottom: 8px;
}
.metric-value {
  font-size: 1.3rem;
  font-weight: 700;
  color: #f8fafc;
}
.insight-group {
  display: grid;
  gap: 12px;
}
.insight-title {
  color: #cbd5e1;
  font-size: 0.95rem;
  font-weight: 700;
}
.insight-chip {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 14px 18px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(148, 163, 184, 0.08);
  color: #f8fafc;
  font-size: 0.95rem;
}
.dashboard-main {
  max-width: 1120px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 24px;
}
.dashboard-top-grid {
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 24px;
}
.kpi-card,
.summary-card,
.chart-block {
  background: #111827;
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 28px;
  padding: 24px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.18);
}
.kpi-card {
  grid-column: 1 / -1;
}
.kpi-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.3rem;
  gap: 16px;
}
.kpi-card-title {
  color: #cbd5e1;
  font-size: 1rem;
  font-weight: 700;
}
.kpi-card-chip {
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  background: rgba(168, 85, 247, 0.16);
  color: #d8b4fe;
  font-size: 0.85rem;
  font-weight: 700;
}
.kpi-card-content {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 24px;
  align-items: center;
}
.kpi-visual {
  display: flex;
  justify-content: center;
  align-items: center;
}
.gauge-chart {
  width: 100%;
  max-width: 320px;
}
.kpi-meta {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.kpi-value {
  font-size: clamp(3.5rem, 5vw, 5rem);
  font-weight: 900;
  color: #f8fafc;
  line-height: 1;
}
.kpi-note {
  color: #cbd5e1;
  font-size: 1rem;
}
.kpi-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.8rem 1rem;
  border-radius: 999px;
  background: rgba(99, 102, 241, 0.14);
  color: #c7d2fe;
  font-size: 0.95rem;
  font-weight: 600;
}
.summary-card {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.summary-title {
  color: #cbd5e1;
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}
.summary-list {
  display: grid;
  gap: 16px;
}
.summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 20px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.08);
}
.summary-label {
  color: #94a3b8;
  font-size: 0.95rem;
}
.summary-item strong {
  color: #f8fafc;
  font-size: 1rem;
}
.chart-block {
  grid-column: 1 / -1;
}
.chart-title {
  color: #cbd5e1;
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 20px;
  letter-spacing: 0.03em;
}
.chart-subtitle {
  color: #94a3b8;
  font-size: 0.95rem;
  margin-bottom: 14px;
}
.chart-canvas {
  width: 100%;
  max-width: 100%;
  border-radius: 22px;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(12px);
}
.fade-enter-to,
.fade-leave-from {
  opacity: 1;
  transform: translateY(0);
}
@media (max-width: 980px) {
  .dashboard-main,
  .dashboard-top-grid {
    grid-template-columns: 1fr;
  }
  .kpi-card-content {
    grid-template-columns: 1fr;
  }
}
</style>
