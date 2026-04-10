<template>
  <section class="obras-status-page obras-status-page--glass">
    <header class="page-header">
      <div class="page-head-main">
        <p class="page-kicker">Obras - Status</p>
        <h1>Painel gerencial de obras</h1>
        <p class="page-description">
          Indicadores executivos de carteira por etapa e base, com foco em risco, concentração de valor e priorização.
        </p>
      </div>
      <div class="page-head-actions">
        <p class="page-meta">{{ lastUpdatedLabel }}</p>
        <button type="button" class="refresh-btn" :disabled="carregando" @click="loadObrasStatus">
          {{ carregando ? 'Atualizando...' : 'Atualizar painel' }}
        </button>
        <button type="button" class="export-btn" :disabled="carregando || !resumo?.linhas?.length" @click="downloadCsv">
          Baixar CSV
        </button>
      </div>
    </header>

    <div class="page-content">
      <div class="hero-summary-strip glass-card" v-if="resumo">
        <article class="hero-summary__item">
          <span>Total de obras</span>
          <strong>{{ resumo.totalLinhas }}</strong>
          <small>{{ filteredItems.length }} itens no recorte</small>
        </article>
        <article class="hero-summary__item hero-summary__item--highlight">
          <span>Valor projetado</span>
          <strong class="hero-summary__value hero-summary__value--highlight">{{ formatCurrency(resumo.totalValue) }}</strong>
          <small>Ticket médio {{ formatCurrency(averageTicket) }}</small>
        </article>
        <article class="hero-summary__item">
          <span>Etapa mais intensa</span>
          <strong>{{ topStage.label }}</strong>
          <small>{{ topStageShare }}% da carteira</small>
        </article>
        <article class="hero-summary__item">
          <span>Base líder</span>
          <strong>{{ topBase.label }}</strong>
          <small>{{ topBaseShare }}% da carteira</small>
        </article>
      </div>

      <div class="dashboard-controls" v-if="resumo">
        <div class="dashboard-tabs">
          <button
            type="button"
            :class="{ active: selectedView === 'stages', 'tab-btn': true }"
            @click="selectedView = 'stages'; selecaoAtiva = null"
            aria-label="Visão por etapas"
          >
            <span class="tab-btn__icon">📊</span>
            Etapas
          </button>
          <button
            type="button"
            :class="{ active: selectedView === 'bases', 'tab-btn': true }"
            @click="selectedView = 'bases'; selecaoAtiva = null"
            aria-label="Visão por bases"
          >
            <span class="tab-btn__icon">🏢</span>
            Bases
          </button>
        </div>
        <div class="dashboard-search search-group">
          <label for="search-input">Buscar</label>
          <div class="search-input-wrapper">
            <span class="search-icon">🔍</span>
            <input
              id="search-input"
              type="search"
              v-model="termoBusca"
              placeholder="Filtrar etapa, base, PEP ou nota"
              @focus="$event.target.parentNode.classList.add('focused')"
              @blur="$event.target.parentNode.classList.remove('focused')"
            />
          </div>
        </div>
      </div>

      <div class="empty-state glass-card" v-if="resumo && !carregando && !error && filteredItems.length === 0">
        <h2 class="empty-state__title">Nenhum resultado encontrado</h2>
        <p class="empty-state__copy">Não há correspondência para “{{ termoBusca }}”. Tente outro termo ou limpe o filtro.</p>
      </div>

      <div class="main-dashboard-grid" v-if="resumo && filteredItems.length > 0">
        <article class="main-chart-card glass-card">
          <div class="card-head">
            <div>
              <p class="card-kicker">Visão de solicitação de intervenção</p>
              <h2>{{ selectedViewLabel }}</h2>
              <p class="card-copy">Painel com foco em gráficos para priorizar risco, valor e concentração por {{ selectedViewLabel.toLowerCase() }}.</p>
            </div>
            <div class="card-head-actions">
              <span class="card-pill">Seleção ativa: {{ activeLabel }}</span>
              <span class="card-pill">Exibindo {{ filteredItems.length }} itens</span>
            </div>
          </div>
          <ApexChart
            type="bar"
            height="360"
            :options="mainChartOptions"
            :series="mainChartSeries"
          />
        </article>

        <aside class="summary-panel glass-card">
          <article class="summary-card">
            <span>Risco alto</span>
            <strong>{{ highRiskCount }}</strong>
            <small>{{ highRiskShare }}% do valor total</small>
          </article>
          <article class="summary-card">
            <span>Maior concentração</span>
            <strong>{{ topShareLabel }}</strong>
            <small>{{ selectedViewLabel }}</small>
          </article>
          <article class="summary-card">
            <span>Mais relevante</span>
            <strong>{{ activeLabel }}</strong>
            <small>Foco de filtro atual</small>
          </article>
        </aside>
      </div>

      <section class="hybrid-list-panel glass-card" v-if="resumo && filteredItems.length > 0">
        <div class="section-header">
          <div>
            <h2>Principais {{ listItems.length }} {{ selectedViewLabel.toLowerCase() }} em risco e valor</h2>
            <p>Rankeamento híbrido por volume, risco e impacto financeiro.</p>
          </div>
          <span class="section-badge">Clique para destacar</span>
        </div>

        <div class="chart-list">
          <article
            class="chart-row"
            :class="{ 'is-active': normalizeLabel(selecaoAtiva) === normalizeLabel(item.label) }"
            v-for="item in listItems"
            :key="item.label"
            role="button"
            tabindex="0"
            :aria-pressed="normalizeLabel(selecaoAtiva) === normalizeLabel(item.label)"
            :aria-selected="normalizeLabel(selecaoAtiva) === normalizeLabel(item.label)"
            @click="setActiveSelection(item.label)"
            @keyup.enter="setActiveSelection(item.label)"
          >
            <div class="chart-row__meta">
              <span>{{ item.label }}</span>
              <strong>{{ formatCurrency(item.totalValue) }}</strong>
            </div>
            <div class="chart-bar">
              <div class="chart-bar__fill" :class="item.badge" :style="{ width: item.share + '%' }"></div>
            </div>
            <div class="chart-row__meta">
              <span>{{ item.risk }}</span>
              <span>{{ item.share }}%</span>
            </div>
          </article>
        </div>
      </section>

      <section class="risk-table-card glass-card" v-if="resumo && filteredItems.length > 0">
        <div class="section-header">
          <div>
            <h2>Foco de risco</h2>
            <p>Itens com maior impacto financeiro e alerta de risco.</p>
          </div>
          <span class="section-badge">Principais {{ riskTableRows.length }} itens</span>
        </div>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th class="align-right">Obras</th>
                <th class="align-right">Valor</th>
                <th class="align-right">Risco</th>
                <th class="align-right">Share</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in riskTableRows" :key="row.label">
                <td>{{ row.label }}</td>
                <td class="align-right">{{ row.count }}</td>
                <td class="align-right">{{ formatCurrency(row.value) }}</td>
                <td class="align-right">
                  <span class="card-badge" :class="row.badge">{{ row.risk }}</span>
                </td>
                <td class="align-right">{{ row.share }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <div class="loading-shell" v-if="carregando">
        <div class="loading-shell__head">
          <p class="loading-shell__kicker">Atualizando painel</p>
          <h2>Consolidando indicadores gerenciais</h2>
          <p>Preparando visão executiva de etapas e bases com os dados mais recentes.</p>
        </div>
        <div class="loading-shell__metrics">
          <div class="skeleton-card" v-for="n in 4" :key="`metric-${n}`">
            <span class="skeleton-line skeleton-line--short"></span>
            <span class="skeleton-line skeleton-line--long"></span>
            <span class="skeleton-line skeleton-line--mid"></span>
          </div>
        </div>
        <div class="loading-shell__charts">
          <div class="skeleton-chart"></div>
          <div class="skeleton-chart"></div>
        </div>
      </div>
      <div class="page-alert page-alert--error" v-else-if="error">Erro: {{ error }}</div>
    </div>
  </section>
</template>

<script>
import { defineAsyncComponent } from 'vue';

const RISK_RULES = [
  {
    label: 'Alto risco',
    class: 'badge-high',
    predicate: (name, share) => (name === 'NÃO INICIADA' || name === 'ENCE') && share > 5,
  },
  {
    label: 'Alto',
    class: 'badge-high',
    predicate: (_, share) => share >= 35,
  },
  {
    label: 'Médio',
    class: 'badge-medium',
    predicate: (_, share) => share >= 15,
  },
];

const MAIN_CHART_STATIC_OPTIONS = {
  chart: {
    type: 'bar',
    toolbar: { show: false },
    cursor: 'pointer',
    animations: { enabled: true, easing: 'easeinout', speed: 500 },
    foreColor: '#cbd5e1',
  },
  colors: ['#38bdf8', '#8b5cf6', '#f59e0b', '#ef4444', '#22c55e', '#06b6d4', '#c084fc', '#f97316'],
  plotOptions: {
    bar: {
      horizontal: true,
      barHeight: '42%',
      borderRadius: 8,
      distributed: true,
    },
  },
  stroke: {
    width: 0,
  },
  fill: {
    opacity: 0.95,
  },
  states: {
    active: {
      allowMultipleDataPointsSelection: false,
    },
    hover: {
      filter: {
        type: 'darken',
        value: 0.85,
      },
    },
  },
  legend: {
    show: false,
  },
  dataLabels: {
    enabled: true,
    style: { colors: ['#ffffff'], fontSize: '12px', fontWeight: '600' },
    position: 'top',
    background: {
      enabled: true,
      foreColor: '#f8fafc',
      padding: 6,
      borderRadius: 8,
      opacity: 0.85,
      backgroundColor: '#0f172a',
    },
    offsetX: 0,
    offsetY: -2,
  },
  xaxis: {
    labels: {
      rotate: 0,
      rotateAlways: false,
      hideOverlappingLabels: false,
      trim: false,
      style: { colors: '#cbd5e1', fontSize: '10px', fontFamily: 'inherit', fontWeight: 500 },
    },
  },
  yaxis: {
    labels: {
      style: { colors: '#cbd5e1', fontSize: '12px' },
    },
  },
  tooltip: {
    theme: 'dark',
    y: { formatter: (value) => value },
  },
  grid: {
    borderColor: 'rgba(148, 163, 184, 0.12)',
    strokeDashArray: 4,
  },
  responsive: [
    {
      breakpoint: 840,
      options: {
        plotOptions: { bar: { barHeight: '55%' } },
        xaxis: { labels: { rotate: 0 } },
      },
    },
  ],
};

export default {
  name: 'ObrasStatus',
  components: {
    ApexChart: defineAsyncComponent(() => import('vue3-apexcharts')),
  },
  data() {
    return {
      carregando: true,
      error: null,
      resumo: null,
      loadedAt: null,
      selectedView: 'stages',
      termoBusca: '',
      selecaoAtiva: null,
    };
  },
  mounted() {
    this.loadObrasStatus();
  },
  computed: {
    filteredStages() {
      const term = this.termoBusca.trim().toLowerCase();
      const total = Number(this.resumo?.totalValue) || 1;
      return (this.resumo?.stages || [])
        .filter((stage) => !term || stage.stage.toLowerCase().includes(term) || stage.bases.some((base) => base.label.toLowerCase().includes(term)))
        .map((stage) => ({
          ...stage,
          share: Math.round((Number(stage.totalValue) || 0) / total * 100),
        }))
        .sort((a, b) => Number(b.totalValue) - Number(a.totalValue));
    },
    filteredBases() {
      const term = this.termoBusca.trim().toLowerCase();
      const total = Number(this.resumo?.totalValue) || 1;
      return (this.resumo?.bases || [])
        .filter((base) => !term || base.label.toLowerCase().includes(term))
        .map((base) => ({
          ...base,
          share: Math.round((Number(base.totalValue) || 0) / total * 100),
        }))
        .sort((a, b) => Number(b.totalValue) - Number(a.totalValue));
    },
    selectedViewLabel() {
      return this.selectedView === 'bases' ? 'Bases' : 'Etapas';
    },
    filteredItems() {
      return this.selectedView === 'bases' ? this.filteredBases : this.filteredStages;
    },
    itensFiltradosProcessados() {
      return this.filteredItems.map((item) => {
        const label = item.stage || item.label || '—';
        const riskData = this.calculateRisk(item);
        return {
          ...item,
          label,
          risk: riskData.label,
          badge: riskData.class,
        };
      });
    },
    activeLabel() {
      if (this.selecaoAtiva) return this.selecaoAtiva;
      return this.selectedView === 'bases' ? this.topBase.label : this.topStage.label;
    },
    mainChartCategories() {
      return this.filteredItems.map((item) => {
        const label = item.stage || item.label || '—';
        return label.length > 28 ? label.slice(0, 25) + '…' : label;
      });
    },
    mainChartSeries() {
      return [
        {
          name: 'Projeção',
          data: this.filteredItems.map((item) => Number(item.totalValue) || 0),
        },
      ];
    },
    mainChartOptions() {
      return {
        ...MAIN_CHART_STATIC_OPTIONS,
        chart: {
          ...MAIN_CHART_STATIC_OPTIONS.chart,
          events: {
            dataPointSelection: (event, chartContext, config) => {
              const index = config.dataPointIndex;
              const label = this.mainChartCategories[index];
              if (label) {
                this.setActiveSelection(label);
              }
            },
          },
        },
        dataLabels: {
          ...MAIN_CHART_STATIC_OPTIONS.dataLabels,
          formatter: (val) => this.formatAxisCurrency(val),
        },
        xaxis: {
          ...MAIN_CHART_STATIC_OPTIONS.xaxis,
          type: 'category',
          categories: this.mainChartCategories,
          labels: {
            ...MAIN_CHART_STATIC_OPTIONS.xaxis.labels,
            formatter: (value) => String(value),
          },
          axisBorder: { show: true },
          axisTicks: { show: true },
        },
        yaxis: {
          ...MAIN_CHART_STATIC_OPTIONS.yaxis,
          labels: {
            ...MAIN_CHART_STATIC_OPTIONS.yaxis.labels,
            formatter: (value) => this.formatAxisCurrency(value),
          },
        },
        tooltip: {
          ...MAIN_CHART_STATIC_OPTIONS.tooltip,
          y: { formatter: (value) => this.formatCurrency(value) },
        },
      };
    },
    highRiskCount() {
      return this.itensFiltradosProcessados.filter((item) => item.badge === 'badge-high').length;
    },
    highRiskShare() {
      const total = Number(this.resumo?.totalValue) || 1;
      const riskValue = this.itensFiltradosProcessados
        .filter((item) => item.badge === 'badge-high')
        .reduce((sum, item) => sum + Number(item.totalValue || 0), 0);
      return Math.round((riskValue / total) * 100);
    },
    topShareLabel() {
      const item = this.itensFiltradosProcessados[0] || {};
      return item.label ? `${item.label} · ${item.share}%` : '—';
    },
    listItems() {
      return this.itensFiltradosProcessados.slice(0, 6).map((item) => ({
        label: item.label,
        count: item.count || 0,
        totalValue: item.totalValue || 0,
        share: item.share || 0,
        risk: item.risk,
        badge: item.badge,
      }));
    },
    linhasFiltradas() {
      const linhas = Array.isArray(this.resumo?.linhas) ? [...this.resumo.linhas] : [];
      const term = this.termoBusca.trim().toLowerCase();
      let filtered = linhas;
      const active = this.normalizeLabel(this.selecaoAtiva);

      if (active) {
        if (this.selectedView === 'bases') {
          filtered = filtered.filter((linha) => this.normalizeLabel(linha.districtLabel || linha.districtCode) === active);
        } else {
          filtered = filtered.filter((linha) => this.normalizeLabel(linha.stage) === active);
        }
      }

      if (term) {
        filtered = filtered.filter((linha) => [linha.pep, linha.note, linha.stage, linha.districtLabel].some((value) =>
          String(value || '').toLowerCase().includes(term),
        ));
      }

      return filtered.sort((a, b) => Number(b.total || 0) - Number(a.total || 0));
    },
    riskTableRows() {
      const total = Number(this.resumo?.totalValue) || 1;
      return this.linhasFiltradas.slice(0, 8).map((item) => {
        const share = Math.round((Number(item.total) || 0) / total * 100);
        const riskData = this.calculateRisk({ share, stage: item.stage });
        return {
          label: item.pep || item.note || item.code || `${item.stage || 'Sem etapa'} • ${item.districtLabel || item.districtCode || '—'}`,
          count: 1,
          value: item.total || 0,
          risk: riskData.label,
          badge: riskData.class,
          share,
        };
      });
    },
    topStage() {
      const stages = this.filteredStages.slice().sort((a, b) => Number(b.totalValue) - Number(a.totalValue));
      const best = stages[0] || { stage: '—', totalValue: 0, count: 0 };
      return {
        label: best.stage || '—',
        value: best.totalValue || 0,
        count: best.count || 0,
      };
    },
    topBase() {
      const bases = this.filteredBases.slice().sort((a, b) => Number(b.totalValue) - Number(a.totalValue));
      const best = bases[0] || { label: '—', totalValue: 0, count: 0 };
      return {
        label: best.label || '—',
        value: best.totalValue || 0,
        count: best.count || 0,
      };
    },
    averageTicket() {
      const linhas = Number(this.resumo?.totalLinhas) || 0;
      if (!linhas) return 0;
      return (Number(this.resumo?.totalValue) || 0) / linhas;
    },
    topStageShare() {
      const total = Number(this.resumo?.totalValue) || 0;
      if (!total) return 0;
      return Math.round(((Number(this.topStage?.value) || 0) / total) * 100);
    },
    topBaseShare() {
      const total = Number(this.resumo?.totalValue) || 0;
      if (!total) return 0;
      return Math.round(((Number(this.topBase?.value) || 0) / total) * 100);
    },
    lastUpdatedLabel() {
      if (!this.loadedAt) return 'Sem atualização carregada';
      return `Atualizado em ${new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(this.loadedAt)}`;
    },
  },
  watch: {
    selectedView() {
      this.selecaoAtiva = null;
    },
    termoBusca() {
      if (this.selecaoAtiva && !this.filteredItems.some((item) => (item.stage || item.label || '—') === this.selecaoAtiva)) {
        this.selecaoAtiva = null;
      }
    },
  },
  methods: {
    normalizeLabel(value) {
      return String(value || '').trim().toUpperCase();
    },
    calculateRisk(item) {
      const share = Number(item.share) || 0;
      const name = this.normalizeLabel(item.stage || item.label);
      const rule = RISK_RULES.find((candidate) => candidate.predicate(name, share));
      return rule ? { label: rule.label, class: rule.class } : { label: 'Baixo', class: 'badge-low' };
    },
    setActiveSelection(label) {
      this.selecaoAtiva = String(label || '').trim();
    },
    async loadObrasStatus() {
      this.carregando = true;
      this.error = null;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        let response;
        try {
          response = await fetch('/api/get-obras-status', { cache: 'no-store', signal: controller.signal });
        } finally {
          clearTimeout(timeout);
        }
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error || 'Falha ao carregar o painel de obras.');
        }
        const json = await response.json();
        this.resumo = {
          ...json.data,
          totalLinhas: Number(json.data.totalRows ?? (Array.isArray(json.data.rows) ? json.data.rows.length : 0)),
          linhas: json.data.rows,
        };
        this.loadedAt = new Date();
      } catch (err) {
        if (err?.name === 'AbortError') {
          this.error = 'A consulta excedeu 20s. Tente novamente.';
        } else {
          this.error = String(err.message || err);
        }
      } finally {
        this.carregando = false;
      }
    },
    formatCurrency(value) {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
      }).format(Number(value) || 0);
    },
    downloadCsv() {
      const linhas = this.linhasFiltradas;
      if (!linhas.length) return;

      const headers = ['PEP', 'Nota', 'Etapa', 'Base', 'Valor', 'Risco', 'Share'];
      const csvRows = linhas.map((item) => {
        const riskData = this.calculateRisk({ share: Math.round((Number(item.total) || 0) / (Number(this.resumo?.totalValue) || 1) * 100), stage: item.stage });
        return [
          item.pep || '',
          item.note || '',
          item.stage || '',
          item.districtLabel || item.districtCode || '',
          Number(item.total || 0).toFixed(2),
          riskData.label,
          Math.round((Number(item.total) || 0) / (Number(this.resumo?.totalValue) || 1) * 100),
        ].map((field) => `"${String(field).replace(/"/g, '""')}"`).join(';');
      });

      const csv = [headers.join(';'), ...csvRows].join('\r\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `obras-status-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    formatAxisCurrency(value) {
      const amount = Number(value) || 0;
      if (Math.abs(amount) >= 1000000) {
        return `R$ ${new Intl.NumberFormat('pt-BR', {
          maximumFractionDigits: 1,
        }).format(amount / 1000000)}M`;
      }
      if (Math.abs(amount) >= 1000) {
        return `R$ ${new Intl.NumberFormat('pt-BR', {
          maximumFractionDigits: 0,
        }).format(amount / 1000)}K`;
      }
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        maximumFractionDigits: 0,
      }).format(amount);
    },
  },
};
</script>

<style scoped>
.obras-status-page {
  min-height: 100%;
  padding: 32px 24px;
  background:
    linear-gradient(160deg, rgba(9, 18, 34, 0.98), rgba(12, 30, 48, 0.96)),
    radial-gradient(circle at top left, rgba(56, 189, 248, 0.12), transparent 32%);
}
.obras-status-page--glass {
  backdrop-filter: blur(6px) saturate(1.2);
}
.glass-card {
  background: rgba(17, 25, 40, 0.72);
  box-shadow: 0 6px 32px 0 rgba(56, 189, 248, 0.08), 0 1.5px 8px 0 rgba(0,0,0,0.10);
  border: 1.5px solid rgba(56, 189, 248, 0.13);
  animation: fadeInUp 0.7s cubic-bezier(.23,1.02,.32,1) both;
}
.glass-chip {
  background: rgba(17, 25, 40, 0.62);
  box-shadow: 0 2px 12px 0 rgba(56, 189, 248, 0.07);
  border: 1.2px solid rgba(56, 189, 248, 0.10);
  animation: fadeInUp 0.7s cubic-bezier(.23,1.02,.32,1) both;
}
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
}
.fade-up-enter-active, .fade-up-leave-active {
  transition: all 0.5s cubic-bezier(.23,1.02,.32,1);
}
.fade-up-enter-from, .fade-up-leave-to {
  opacity: 0;
  transform: translateY(24px);
}
.fade-up-enter-to, .fade-up-leave-from {
  opacity: 1;
  transform: translateY(0);
}
.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5em;
  font-weight: 600;
  font-size: 1.02rem;
  letter-spacing: 0.01em;
  padding: 0.75rem 1rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.88);
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;
}
.tab-btn:hover {
  background: rgba(56, 189, 248, 0.12);
}
.tab-btn.active {
  background: rgba(56, 189, 248, 0.2);
  color: #fff;
  box-shadow: 0 0 0 1px rgba(56, 189, 248, 0.25);
}
.tab-btn__icon {
  font-size: 1.2em;
  opacity: 0.82;
}
.empty-state {
  padding: 1.4rem;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.16);
  color: rgba(226, 232, 240, 0.92);
}
.empty-state__title {
  margin: 0 0 0.6rem;
  font-size: 1.2rem;
  color: #ffffff;
}
.empty-state__copy {
  margin: 0;
  color: rgba(203, 213, 225, 0.78);
}
.search-group {
  width: 100%;
}
.search-input-wrapper {
  display: flex;
  align-items: center;
  background: rgba(15, 23, 42, 0.88);
  border-radius: 999px;
  border: 1.5px solid rgba(56, 189, 248, 0.13);
  padding: 0.1rem 0.7rem 0.1rem 0.5rem;
  transition: border 0.2s, box-shadow 0.2s;
}
.search-input-wrapper.focused {
  border-color: #38bdf8;
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.18);
}
.search-icon {
  font-size: 1.3em;
  color: #38bdf8;
  margin-right: 0.3em;
  opacity: 0.7;
}
.search-input-wrapper input {
  flex: 1;
  background: transparent;
  border: none;
  color: #fff;
  padding: 0.8rem 0.2rem;
  font-size: 1rem;
  outline: none;
}


.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.2rem;
  margin-bottom: 28px;
}

.page-head-main {
  display: grid;
  gap: 0.6rem;
}

.page-head-actions {
  display: grid;
  justify-items: end;
  gap: 0.55rem;
}
.export-btn {
  border: 1px solid rgba(56, 189, 248, 0.3);
  background: rgba(15, 23, 42, 0.82);
  color: #cfe9ff;
  border-radius: 10px;
  padding: 0.6rem 0.9rem;
  font-size: 0.86rem;
  cursor: pointer;
}
.export-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.refresh-btn {
  border: 1px solid rgba(148, 163, 184, 0.26);
  background: rgba(15, 23, 42, 0.82);
  color: #f8fafc;
  border-radius: 10px;
  padding: 0.6rem 0.9rem;
  font-size: 0.86rem;
  cursor: pointer;
}

.refresh-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.page-kicker {
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.24em;
  color: rgba(56, 189, 248, 0.8);
  font-size: 0.8rem;
}

.page-header h1 {
  margin: 0;
  font-size: clamp(1.7rem, 2.2vw, 2.5rem);
  line-height: 1.15;
}

.page-description {
  margin: 0;
  max-width: 800px;
  color: rgba(226, 232, 240, 0.82);
  font-size: 0.98rem;
}

.page-content {
  display: grid;
  gap: 1.5rem;
  max-width: 1380px;
  margin: 0 auto;
}

.hero-summary-strip {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
  padding: 1.15rem;
}

.hero-summary__item {
  background: rgba(10, 24, 41, 0.95);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 16px;
  padding: 1.1rem 1.1rem;
  display: grid;
  gap: 0.55rem;
}

.hero-summary__item span {
  color: rgba(148, 163, 184, 0.86);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.8rem;
}

.hero-summary__item strong {
  color: #ffffff;
  font-size: 1.6rem;
}
.hero-summary__item--highlight {
  background: rgba(56, 189, 248, 0.08);
}
.hero-summary__value--highlight {
  color: #a5f3fc;
  font-size: 1.9rem;
}

.hero-summary__item small {
  color: rgba(226, 232, 240, 0.7);
}

.dashboard-controls {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
}

.dashboard-tabs {
  display: flex;
  gap: 0.75rem;
}

.dashboard-search {
  min-width: 280px;
  flex: 1;
}

.main-dashboard-grid {
  display: grid;
  grid-template-columns: minmax(0, 2.2fr) minmax(280px, 1fr);
  gap: 1rem;
  align-items: start;
}

.main-chart-card {
  min-height: 480px;
  display: flex;
  flex-direction: column;
}

.vue-apexcharts {
  flex-grow: 1;
}

.main-chart-card,
.summary-panel,
.hybrid-list-panel,
.risk-table-card {
  padding: 1.4rem;
  border-radius: 16px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.16);
}

.card-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.2rem;
}

.card-kicker {
  margin: 0 0 0.5rem;
  color: rgba(56, 189, 248, 0.85);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.card-copy {
  margin: 0.25rem 0 0;
  color: rgba(226, 232, 240, 0.75);
}

.card-head-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  align-items: center;
}

.card-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  border-radius: 999px;
  background: rgba(56, 189, 248, 0.12);
  color: #cfe9ff;
  padding: 0.65rem 0.95rem;
  font-size: 0.84rem;
}

.summary-panel {
  display: grid;
  gap: 1rem;
}

.summary-card {
  padding: 1rem;
  border-radius: 16px;
  background: rgba(10, 24, 41, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.18);
  display: grid;
  gap: 0.5rem;
}

.summary-card span {
  color: rgba(148, 163, 184, 0.88);
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.summary-card strong {
  color: #ffffff;
  font-size: 1.75rem;
}

.summary-card small {
  color: rgba(226, 232, 240, 0.72);
}

.hybrid-list-panel .section-header,
.risk-table-card .section-header {
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
}

.chart-list {
  display: grid;
  gap: 0.9rem;
}

.chart-row {
  display: grid;
  gap: 0.55rem;
  padding: 1rem;
  border-radius: 14px;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(15, 23, 42, 0.88);
  cursor: pointer;
  transition: transform 0.18s ease, background 0.18s ease;
}

.chart-row:hover {
  transform: translateY(-1px);
  background: rgba(15, 23, 42, 0.96);
}

.chart-row.is-active {
  border-color: #38bdf8;
  background: rgba(56, 189, 248, 0.1);
}

.chart-row__meta {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  color: rgba(226, 232, 240, 0.88);
  font-size: 0.95rem;
}

.chart-bar {
  width: 100%;
  height: 12px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.chart-bar__fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #38bdf8, #8b5cf6);
}

.risk-table-card {
  overflow: hidden;
}

.risk-table-card table {
  min-width: 0;
}

.loading-shell {
  border-radius: 14px;
  background:
    linear-gradient(145deg, rgba(12, 28, 48, 0.96), rgba(8, 20, 36, 0.98));
  padding: 1.2rem;
  display: grid;
  gap: 1rem;
}

.loading-shell__head {
  display: grid;
  gap: 0.35rem;
}

.loading-shell__kicker {
  margin: 0;
  font-size: 0.74rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(56, 189, 248, 0.88);
}

.loading-shell__head h2 {
  margin: 0;
  font-size: 1.2rem;
  color: #f8fafc;
}

.loading-shell__head p {
  margin: 0;
  color: rgba(203, 213, 225, 0.78);
  font-size: 0.93rem;
}

.loading-shell__metrics {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.skeleton-card {
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(15, 23, 42, 0.72);
  padding: 0.8rem;
  display: grid;
  gap: 0.5rem;
}

.loading-shell__charts {
  display: grid;
  gap: 0.75rem;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
}

.skeleton-chart {
  height: 180px;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.14);
  background: rgba(15, 23, 42, 0.7);
  position: relative;
  overflow: hidden;
}

.skeleton-line {
  height: 10px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.18);
  position: relative;
  overflow: hidden;
}

.skeleton-line--short {
  width: 38%;
}

.skeleton-line--mid {
  width: 54%;
}

.skeleton-line--long {
  width: 82%;
}

.skeleton-line::after,
.skeleton-chart::after {
  content: '';
  position: absolute;
  top: 0;
  left: -150%;
  width: 120%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(226, 232, 240, 0.26), transparent);
  animation: shimmer 1.5s ease-in-out infinite;
}

@keyframes shimmer {
  100% {
    left: 140%;
  }
}

.charts-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.charts-title {
  margin: 0 0 0.35rem;
  font-size: 1.18rem;
  color: #fff;
}

.charts-subtitle {
  margin: 0;
  color: rgba(226, 232, 240, 0.75);
}

.chart-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
}

.chart-card {
  padding: 1.1rem;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.14);
}

.chart-card h3 {
  margin: 0 0 1rem;
  color: #ffffff;
  font-size: 1rem;
  letter-spacing: 0.01em;
}

.chart-list {
  display: grid;
  gap: 1rem;
}

.breakdown-block {
  background: rgba(10, 24, 41, 0.92);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 14px;
  padding: 1.4rem;
}

.breakdown-block h2 {
  margin: 0 0 0.65rem;
  color: #ffffff;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
}

.section-header p {
  margin: 0;
  color: rgba(226, 232, 240, 0.72);
}

.section-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 0.9rem;
  border-radius: 999px;
  background: rgba(56, 189, 248, 0.12);
  color: #cffafe;
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.breakdown-card__status,
.base-status {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.card-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.45rem 0.75rem;
  border-radius: 999px;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-weight: 700;
}

.badge-high {
  background: rgba(248, 113, 113, 0.16);
  color: #fecaca;
}

.badge-medium {
  background: rgba(251, 191, 36, 0.16);
  color: #fde68a;
}

.badge-low {
  background: rgba(34, 197, 94, 0.16);
  color: #bbf7d0;
}

.breakdown-card__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.breakdown-card__tag {
  display: inline-block;
  margin-bottom: 0.5rem;
  color: rgba(148, 163, 184, 0.9);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.breakdown-card__metrics {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin-bottom: 1rem;
}

.breakdown-card__metrics div small {
  display: block;
  color: rgba(148, 163, 184, 0.85);
  font-size: 0.82rem;
}

.breakdown-card__metrics div strong {
  display: block;
  margin-top: 0.35rem;
  font-size: 1.05rem;
}

.table-wrapper {
  overflow-x: auto;
  margin-top: 1rem;
}

table {
  width: 100%;
  border-collapse: collapse;
  min-width: 720px;
}

thead th {
  text-align: left;
  padding: 0.9rem 0.8rem;
  color: rgba(148, 163, 184, 0.9);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

tbody tr {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

tbody td {
  padding: 0.95rem 0.8rem;
  color: rgba(226, 232, 240, 0.84);
  font-size: 0.95rem;
}

.align-right {
  text-align: right;
}

.table-note {
  margin-top: 0.75rem;
  color: rgba(148, 163, 184, 0.78);
  font-size: 0.92rem;
}

.page-alert {
  padding: 1rem 1.2rem;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.9);
}

.page-alert--error {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #fecaca;
  border-radius: 12px;
  text-align: center;
}

@media (max-width: 1024px) {
  .main-dashboard-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 840px) {
  .page-header {
    flex-direction: column;
  }

  .page-head-actions {
    justify-items: start;
  }
}

@media (max-width: 640px) {
  .page-content {
    gap: 1.25rem;
  }

  .table-wrapper {
    min-width: 0;
  }
}
</style>
