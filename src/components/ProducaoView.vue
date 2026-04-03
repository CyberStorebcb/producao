<template>
  <section class="producao-shell">
    <header class="producao-hero">
      <div class="hero-copy">
        <p class="eyebrow">Centro de produção · {{ activeSheetLabel }}</p>
        <h1>Leitura operacional com foco em período, equipes e ritmo diário</h1>
        <p class="subline">
          Origem: {{ originLabel }} · Atualizado {{ lastUpdatedLabel || 'há instantes' }}
        </p>
        <div class="hero-badges">
          <span class="hero-badge hero-badge--strong">{{ rankingMode === 'period' ? 'Visão de período' : 'Visão por data' }}</span>
          <span class="hero-badge">{{ availableDates.length }} datas válidas</span>
          <span class="hero-badge">{{ tabFilteredTeams.length }} equipes ativas</span>
          <span class="hero-badge">Janela {{ importDateRangeLabel }}</span>
          <span v-for="sheet in sourceSheetLabels" :key="sheet" class="hero-badge hero-badge--soft">{{ sheet }}</span>
        </div>
      </div>
      <aside class="hero-focus">
        <p class="hero-focus__eyebrow">Painel executivo</p>
        <div class="hero-focus__headline">
          <strong>{{ formatCurrency(periodTotal) }}</strong>
          <span>Total consolidado do período</span>
        </div>
        <div class="hero-focus__grid">
          <article>
            <span>Data em foco</span>
            <strong>{{ selectedDate?.label || 'sem data' }}</strong>
            <small>{{ selectedDateSummary ? formatCurrency(selectedDateSummary.total) : '—' }}</small>
          </article>
          <article>
            <span>Líder atual</span>
            <strong>{{ leadingTeam ? leadingTeam.display : 'Sem produção' }}</strong>
            <small>{{ leadingTeam ? formatCurrency(teamSortValue(leadingTeam)) : '—' }}</small>
          </article>
          <article>
            <span>Pico diário</span>
            <strong>{{ topDailySummary ? topDailySummary.label : '—' }}</strong>
            <small>{{ topDailySummary ? formatCurrency(topDailySummary.total) : '—' }}</small>
          </article>
        </div>
      </aside>
    </header>

    <section class="control-dock">
      <div class="header-actions">
        <label class="input-stack">
          <span>Visão</span>
          <select v-model="rankingMode">
            <option value="period">Período completo</option>
            <option value="date">Data selecionada</option>
          </select>
        </label>
        <label class="input-stack">
          <span>Data</span>
          <select v-model="selectedDateKey" @change="handleDateChange" :disabled="!availableDates.length">
            <option v-for="date in availableDates" :key="date.key" :value="date.key">
              {{ date.label }}
            </option>
          </select>
        </label>
        <label class="input-stack">
          <span>Buscar equipe</span>
          <input v-model.trim="searchQuery" type="text" placeholder="Prefixo, placa ou colaborador" />
        </label>
        <button type="button" class="pill" @click="fetchDropboxExcel" :disabled="loading">
          <span v-if="loading">Atualizando...</span>
          <span v-else>Atualizar dados</span>
        </button>
      </div>
      <div class="control-summary">
        <div class="control-summary__item">
          <span>Modo ativo</span>
          <strong>{{ rankingMode === 'period' ? 'Acumulado do período' : 'Desempenho da data' }}</strong>
        </div>
        <div class="control-summary__item">
          <span>Base exibida</span>
          <strong>{{ activeSheetLabel }}</strong>
        </div>
      </div>
    </section>

    <nav class="tab-strip" aria-label="Categorias de produção">
      <button
        v-for="tab in tabs"
        :key="tab"
        type="button"
        class="tab-btn"
        :class="{ active: activeTab === tab }"
        @click="activeTab = tab"
      >
        {{ tab }}
      </button>
    </nav>

    <div v-if="loading" class="state-panel">
      <div class="loader" aria-hidden="true"></div>
      <p>Buscando planilha no Dropbox…</p>
    </div>

    <div v-else-if="sampleRows" class="state-panel">
      <h2>Diagnóstico da planilha</h2>
      <p>O servidor não conseguiu normalizar automaticamente a planilha. Visualize abaixo e escolha a linha de cabeçalho.</p>
      <div style="max-height:240px; overflow:auto; margin: 12px 0;">
        <table style="width:100%; border-collapse:collapse;">
          <tbody>
            <tr v-for="(row, ri) in sampleRows" :key="ri" :style="{ background: ri === headerCandidate ? '#0f172a' : 'transparent' }">
              <td style="padding:6px; border-bottom:1px solid rgba(255,255,255,0.04); font-weight:600; width:64px;">{{ ri + 1 }}</td>
              <td style="padding:6px; border-bottom:1px solid rgba(255,255,255,0.04);">
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                  <span v-for="(cell, ci) in row" :key="ci" style="padding:4px 6px; background:rgba(255,255,255,0.03); border-radius:6px;">{{ cell }}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <label style="display:flex; gap:6px; align-items:center;"><span>Linha cabeçalho</span>
          <select v-model.number="headerCandidate">
            <option v-for="c in headerCandidates" :key="c.idx" :value="c.idx">{{ c.label }}</option>
          </select>
        </label>
        <label style="display:flex; gap:6px; align-items:center;"><span>Coluna data inicial</span>
          <input type="number" v-model.number="dataStartColumn" style="width:80px;" />
        </label>
        <button class="pill" @click="applyClientSampleParse">Carregar usando esta configuração</button>
      </div>
    </div>

    <div v-else-if="errorMessage" class="state-panel error">
      <h2>Ops!</h2>
      <p>{{ errorMessage }}</p>
      <button type="button" class="pill" @click="fetchDropboxExcel">Tentar novamente</button>
    </div>

    <div v-else-if="!teamRows.length" class="state-panel empty">
      <h2>Nenhuma equipe encontrada</h2>
      <p>Revise se a aba DIÁRIO contém itens "Apontado R$".</p>
    </div>

    <template v-else>
      <transition name="content-fade" mode="out-in" appear>
        <div :key="contentTransitionKey" class="panel-stack">
      <section class="overview-grid panel-appear panel-appear--1">
        <article class="overview-card overview-card--hero">
          <div class="overview-card__head">
            <div>
              <p class="overview-label">Resumo operacional</p>
              <h2>{{ operationalSummaryTitle }}</h2>
            </div>
            <span class="status-pill status-pill--ok">Em leitura</span>
          </div>
          <div class="overview-metrics">
            <div class="metric-tile">
              <span>Equipes com produção</span>
              <strong>{{ productiveTeamsCount }}</strong>
            </div>
            <div class="metric-tile">
              <span>Média por dia</span>
              <strong>{{ formatCurrency(averageDailyTotal) }}</strong>
            </div>
            <div class="metric-tile">
              <span>Base consolidada</span>
              <strong>{{ sourceSheetLabels.join(' + ') }}</strong>
            </div>
            <div class="metric-tile">
              <span>Melhor dia</span>
              <strong>{{ topDailySummary ? topDailySummary.label : '—' }}</strong>
            </div>
          </div>
          <p class="overview-footnote">
            {{ operationalFootnote }}
          </p>
        </article>

        <article class="overview-card">
          <p class="overview-label">Data em foco</p>
          <strong class="overview-value">{{ formatCurrency(selectedDateTotal) }}</strong>
          <p class="overview-footnote">{{ selectedDateActiveTeams }} equipes com lançamento em {{ selectedDate?.label || 'sem data' }}</p>
        </article>

        <article class="overview-card">
          <p class="overview-label">Acumulado disponível</p>
          <strong class="overview-value">{{ formatCurrency(periodTotal) }}</strong>
          <p class="overview-footnote">Soma de todas as datas válidas da aba atual</p>
        </article>

        <article class="overview-card">
          <p class="overview-label">Maior equipe da visão</p>
          <strong class="overview-value overview-value--compact">{{ leadingTeam ? leadingTeam.display : 'Sem produção' }}</strong>
          <p class="overview-footnote">{{ leadingTeam ? `${cardsPrimaryMetricLabel}: ${formatCurrency(teamSortValue(leadingTeam))}` : emptyStateLabel }}</p>
        </article>
      </section>

      <section class="trend-panel panel-appear panel-appear--2">
        <header>
          <div>
            <h2>{{ chartPanelTitle }}</h2>
            <p>{{ chartPanelDescription }}</p>
          </div>
          <div class="trend-panel__header-tools">
            <div class="chart-switcher" role="tablist" aria-label="Tipos de gráfico">
              <button
                v-for="option in chartTypeOptions"
                :key="option.value"
                type="button"
                class="chart-switcher__btn"
                :class="{ active: chartType === option.value }"
                @click="chartType = option.value"
              >
                {{ option.label }}
              </button>
            </div>
            <div class="trend-panel__summary">
              <span>{{ trendSummaryLabel }}</span>
              <strong>{{ trendSummaryValue }}</strong>
            </div>
          </div>
        </header>
        <div v-if="hasActiveChart" class="trend-chart-card">
          <svg v-if="chartType === 'line' || chartType === 'area'" viewBox="0 0 100 42" class="trend-chart" role="img" aria-label="Gráfico de evolução por data">
            <defs>
              <linearGradient id="trendArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="rgba(251, 191, 36, 0.36)" />
                <stop offset="100%" stop-color="rgba(251, 191, 36, 0.02)" />
              </linearGradient>
            </defs>
            <path v-if="chartType === 'area'" :d="trendChart.areaPath" fill="url(#trendArea)" />
            <path :d="trendChart.path" class="trend-chart__line" />
            <line
              v-if="trendChart.selectedPoint"
              :x1="trendChart.selectedPoint.x"
              :x2="trendChart.selectedPoint.x"
              y1="4"
              y2="36"
              class="trend-chart__guide"
            />
            <g v-for="point in trendChart.points" :key="point.key">
              <circle
                :cx="point.x"
                :cy="point.y"
                :r="point.key === selectedDateKey ? 1.9 : 1.3"
                :class="['trend-chart__point', { 'is-active': point.key === selectedDateKey }]"
                @click="selectSummaryDate(point.key)"
              />
            </g>
          </svg>
          <svg v-else-if="chartType === 'bar'" viewBox="0 0 100 42" class="trend-chart" role="img" aria-label="Gráfico de barras por data">
            <g v-for="bar in barChart.bars" :key="bar.key">
              <rect
                :x="bar.x"
                :y="bar.y"
                :width="bar.width"
                :height="bar.height"
                rx="1.2"
                class="trend-chart__bar"
                :class="{ 'is-active': bar.isActive }"
                @click="selectSummaryDate(bar.key)"
              />
            </g>
          </svg>
          <div v-else class="composition-chart">
            <article v-for="row in compositionChart.rows" :key="row.code" class="composition-row">
              <div class="composition-row__head">
                <div>
                  <strong>{{ row.display }}</strong>
                  <small>{{ row.plate }}</small>
                </div>
                <div class="composition-row__value">
                  <strong>{{ row.valueLabel }}</strong>
                  <small>{{ row.percentOfTotal.toFixed(1).replace('.', ',') }}% da leitura</small>
                </div>
              </div>
              <div class="composition-row__bar">
                <span :style="{ width: `${row.percentOfLeader}%` }"></span>
              </div>
            </article>
          </div>
          <div class="trend-chart__footer" v-if="chartType !== 'composition'">
            <span>{{ trendChart.firstLabel }}</span>
            <span>{{ trendChart.lastLabel }}</span>
          </div>
          <div class="trend-insights">
            <article v-if="chartType === 'composition'">
              <span>Equipe líder</span>
              <strong>{{ compositionChart.leaderLabel }}</strong>
              <small>{{ compositionChart.leaderValue }}</small>
            </article>
            <article v-else>
              <span>Data em foco</span>
              <strong>{{ chartType === 'bar' ? barChart.selectedLabel : trendChart.selectedLabel }}</strong>
              <small>{{ chartType === 'bar' ? barChart.selectedValue : trendChart.selectedValue }}</small>
            </article>
            <article>
              <span>{{ chartType === 'composition' ? 'Recorte total' : 'Melhor dia' }}</span>
              <strong>{{ chartType === 'composition' ? compositionChart.total : chartType === 'bar' ? barChart.maxLabel : trendChart.bestLabel }}</strong>
              <small>{{ chartType === 'composition' ? `${compositionChart.rows.length} equipes comparadas` : chartType === 'bar' ? barChart.maxValue : trendChart.bestValue }}</small>
            </article>
            <article>
              <span>{{ chartType === 'composition' ? 'Modo de leitura' : 'Média diária' }}</span>
              <strong>{{ chartType === 'composition' ? cardsPrimaryMetricLabel : trendChart.averageValue }}</strong>
              <small>{{ chartType === 'composition' ? `${compositionChart.rows.length} equipes líderes` : `${trendChart.points.length} datas no período` }}</small>
            </article>
          </div>
        </div>
        <div v-else class="trend-empty">
          <p>Não há dados suficientes para montar este gráfico.</p>
        </div>
      </section>

      <section class="dates-panel panel-appear panel-appear--3">
        <header>
          <div>
            <h2>Todas as datas do período</h2>
            <p>{{ dateSummaries.length }} datas consolidadas · clique para focar no dia</p>
          </div>
          <p class="cards-total">Pico diário: {{ topDailySummary ? `${topDailySummary.label} · ${formatCurrency(topDailySummary.total)}` : '—' }}</p>
        </header>
        <div class="date-summary-grid">
          <button
            v-for="date in dateSummaries"
            :key="date.key"
            type="button"
            class="date-summary-card"
            :class="{ active: date.key === selectedDateKey }"
            @click="selectSummaryDate(date.key)"
          >
            <span class="date-summary-card__label">{{ date.label }}</span>
            <strong>{{ formatCurrency(date.total) }}</strong>
            <small>{{ date.activeTeams }} equipes com lançamento</small>
          </button>
        </div>
      </section>

      <section class="cards-section panel-appear panel-appear--4">
        <header>
          <div>
            <h2>{{ cardsTitle }}</h2>
            <p>{{ tabFilteredTeams.length }} equipes listadas · {{ cardsDescription }}</p>
          </div>
          <p class="cards-total">{{ formatCurrency(cardsTotalValue) }} {{ cardsTotalSuffix }}</p>
        </header>
        <div v-if="leadingTeam" class="leader-spotlight">
          <div class="leader-spotlight__copy">
            <span class="leader-spotlight__label">Equipe em destaque</span>
            <strong>{{ leadingTeam.display }}</strong>
            <small>{{ leadingTeam.plate || 'Sem placa' }} · {{ leadingTeam.type || 'Sem categoria' }}</small>
          </div>
          <div class="leader-spotlight__stats">
            <article>
              <span>{{ cardsPrimaryMetricLabel }}</span>
              <strong>{{ formatCurrency(teamSortValue(leadingTeam)) }}</strong>
            </article>
            <article>
              <span>{{ cardsSecondaryMetricLabel }}</span>
              <strong>{{ formatCurrency(cardsSecondaryMetricValue(leadingTeam)) }}</strong>
            </article>
            <article>
              <span>Participação</span>
              <strong>{{ teamShareLabel(leadingTeam) }}</strong>
            </article>
          </div>
        </div>
        <div class="cards-grid">
          <article
            v-for="(team, index) in cardsTeams"
            :key="team.code"
            class="team-card"
            :class="valueBadgeClass(teamSortValue(team))"
          >
            <span class="team-rank">#{{ index + 1 }}</span>
            <button
              class="pin-button"
              :aria-pressed="isPinned(team.code)"
              @click="togglePin(team.code)"
              title="Fixar equipe"
            >
              <i :class="isPinned(team.code) ? 'bi bi-star-fill' : 'bi bi-star'" aria-hidden="true"></i>
            </button>
            <div class="team-card__meta">
              <span class="team-code">{{ team.display }}</span>
              <span class="team-plate">{{ team.plate || '—' }}</span>
            </div>
            <div class="team-card__details">
              <div>
                <span>{{ cardsPrimaryMetricLabel }}</span>
                <strong>{{ formatCurrency(teamSortValue(team)) }}</strong>
              </div>
              <div>
                <span>{{ cardsSecondaryMetricLabel }}</span>
                <strong>{{ formatCurrency(cardsSecondaryMetricValue(team)) }}</strong>
              </div>
            </div>
            <div class="team-card__value">
              {{ teamShareLabel(team) }}
            </div>
            <div class="team-card__bar">
              <span :style="{ width: `${teamSharePercent(team)}%` }"></span>
            </div>
          </article>
        </div>
      </section>

            <section class="history-panel panel-appear panel-appear--5">
              <header>
                <div>
                  <h2>Histórico resumido</h2>
                  <p>Últimas {{ historyColumns.length }} datas</p>
                </div>
                <div class="history-nav">
                  <button type="button" @click="shiftHistory(-1)" :disabled="!canShiftPrev">
                    ‹
                  </button>
                  <button type="button" @click="shiftHistory(1)" :disabled="!canShiftNext">
                    ›
                  </button>
                </div>
              </header>

              <HistoryTable
                :teams="tabFilteredTeams"
                :dates="historyColumns"
                :value-getter="valueFor"
                :format-short="formatShort"
                :badge-class="valueBadgeClass"
                :pinned-checker="isPinned"
              />
            </section>
        </div>
      </transition>
    </template>
  </section>
</template>

<script>
import HistoryTable from './HistoryTable.vue';
const PIN_STORAGE_KEY = 'producao_pinned_teams_v1';
const LAST_DATE_STORAGE_KEY = 'producao_last_date_key_v1';
const CHART_TYPE_STORAGE_KEY = 'producao_chart_type_v1';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  timeZone: 'UTC',
});

const timestampFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

const buildTrendGeometry = (items = [], selectedKey = '', formatCurrency = (value) => value) => {
  if (!items.length) {
    return {
      hasData: false,
      points: [],
      path: '',
      areaPath: '',
      firstLabel: '—',
      lastLabel: '—',
      selectedLabel: '—',
      selectedValue: '—',
      bestLabel: '—',
      bestValue: '—',
      averageValue: '—',
      selectedPoint: null,
    };
  }

  const values = items.map((item) => Number(item.total) || 0);
  const maxValue = Math.max(...values, 0);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;
  const step = items.length > 1 ? 88 / (items.length - 1) : 0;

  const points = items.map((item, index) => {
    const x = 6 + (step * index);
    const normalized = (item.total - minValue) / range;
    const y = 34 - (normalized * 24);
    return {
      ...item,
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
    };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} 36 L ${points[0].x} 36 Z`;
  const selectedPoint = points.find((point) => point.key === selectedKey) || points[points.length - 1];
  const bestPoint = points.reduce((best, current) => (current.total > best.total ? current : best), points[0]);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;

  return {
    hasData: true,
    points,
    path: linePath,
    areaPath,
    firstLabel: points[0].label,
    lastLabel: points[points.length - 1].label,
    selectedLabel: selectedPoint.label,
    selectedValue: formatCurrency(selectedPoint.total),
    bestLabel: bestPoint.label,
    bestValue: formatCurrency(bestPoint.total),
    averageValue: formatCurrency(average),
    selectedPoint,
  };
};

const buildBarGeometry = (items = [], selectedKey = '', formatCurrency = (value) => value) => {
  if (!items.length) {
    return {
      hasData: false,
      bars: [],
      selectedLabel: '—',
      selectedValue: '—',
      maxLabel: '—',
      maxValue: '—',
    };
  }

  const maxTotal = Math.max(...items.map((item) => Number(item.total) || 0), 1);
  const gap = 2;
  const width = items.length > 0 ? (88 - gap * (items.length - 1)) / items.length : 0;
  const bars = items.map((item, index) => {
    const total = Number(item.total) || 0;
    const height = maxTotal ? Math.max(2, (total / maxTotal) * 26) : 2;
    return {
      ...item,
      x: Number((6 + index * (width + gap)).toFixed(2)),
      y: Number((34 - height).toFixed(2)),
      width: Number(width.toFixed(2)),
      height: Number(height.toFixed(2)),
      isActive: item.key === selectedKey,
    };
  });

  const selectedBar = bars.find((bar) => bar.key === selectedKey) || bars[bars.length - 1];
  const maxBar = bars.reduce((best, current) => (current.total > best.total ? current : best), bars[0]);

  return {
    hasData: true,
    bars,
    selectedLabel: selectedBar.label,
    selectedValue: formatCurrency(selectedBar.total),
    maxLabel: maxBar.label,
    maxValue: formatCurrency(maxBar.total),
  };
};

const buildCompositionData = (teams = [], metricGetter = (team) => team, formatCurrency = (value) => value) => {
  const rows = teams
    .map((team) => ({
      code: team.code,
      display: team.display,
      plate: team.plate || '—',
      value: Number(metricGetter(team)) || 0,
    }))
    .filter((team) => team.value > 0)
    .sort((left, right) => right.value - left.value)
    .slice(0, 6);

  if (!rows.length) {
    return {
      hasData: false,
      rows: [],
      total: '—',
      leaderLabel: '—',
      leaderValue: '—',
    };
  }

  const total = rows.reduce((sum, row) => sum + row.value, 0);
  const maxValue = rows[0].value || 1;

  return {
    hasData: true,
    rows: rows.map((row) => ({
      ...row,
      percentOfLeader: Math.max(6, (row.value / maxValue) * 100),
      percentOfTotal: total ? (row.value / total) * 100 : 0,
      valueLabel: formatCurrency(row.value),
    })),
    total: formatCurrency(total),
    leaderLabel: rows[0].display,
    leaderValue: formatCurrency(rows[0].value),
  };
};

export default {
  name: 'ProducaoView',
  components: {
    HistoryTable,
  },
  data() {
    return {
      teamRows: [],
      // diagnostic sample returned when server couldn't normalize
      sampleRows: null,
      headerCandidate: null,
      headerCandidates: [],
      dataStartColumn: 6,
      tabs: ['GERAL', 'OBRAS', 'EME', 'CUSTEIO'],
      activeTab: 'GERAL',
      loadedTab: 'GERAL',
      loading: true,
      errorMessage: '',
      importSummary: {},
      availableDates: [],
      selectedDateKey: '',
      rankingMode: 'period',
      chartType: this.loadChartType(),
      lastUpdatedLabel: '',
      originLabel: '—',
      searchQuery: '',
      pinnedTeams: this.loadPinnedTeams(),
      lastDateKey: this.loadLastDateKey(),
      historyWindowStart: 0,
      historyWindowSize: 8,
    };
  },
  computed: {
    activeSheetLabel() {
      return this.activeTab === 'GERAL' ? 'OBRAS + EME + CUSTEIO' : this.activeTab;
    },
    selectedDate() {
      return this.availableDates.find((c) => c.key === this.selectedDateKey) || null;
    },
    selectedDateSummary() {
      return this.dateSummaries.find((date) => date.key === this.selectedDateKey) || null;
    },
    sourceSheetLabels() {
      const summarySheets = Array.isArray(this.importSummary.sourceSheets) ? this.importSummary.sourceSheets : [];
      if (summarySheets.length) return summarySheets;
      if (this.activeTab === 'GERAL') return ['OBRAS', 'EME', 'CUSTEIO'];
      return this.activeTab ? [this.activeTab] : [];
    },
    chartTypeOptions() {
      return [
        { value: 'line', label: 'Linha' },
        { value: 'area', label: 'Área' },
        { value: 'bar', label: 'Barras' },
        { value: 'composition', label: 'Composição' },
      ];
    },
    filteredTeams() {
      if (!this.teamRows.length) return [];
      const term = this.searchQuery.toLowerCase();
      const matches = this.teamRows.filter((team) => {
        if (!term) return true;
        return (
          team.display.toLowerCase().includes(term) ||
          (team.plate || '').toLowerCase().includes(term)
        );
      });
      const pinnedSet = new Set(this.pinnedTeams);
      const pinned = matches.filter((team) => pinnedSet.has(team.code));
      const others = matches.filter((team) => !pinnedSet.has(team.code));
      return [...pinned, ...others];
    },
    cardsTeams() {
      const sorted = [...this.tabFilteredTeams].sort((left, right) => {
        const leftPinned = this.isPinned(left.code) ? 1 : 0;
        const rightPinned = this.isPinned(right.code) ? 1 : 0;
        if (leftPinned !== rightPinned) return rightPinned - leftPinned;

        const leftValue = this.teamSortValue(left);
        const rightValue = this.teamSortValue(right);
        if (leftValue !== rightValue) return rightValue - leftValue;

        return left.display.localeCompare(right.display);
      });
      return sorted.slice(0, 12);
    },
    tabFilteredTeams() {
      if (this.activeTab === 'GERAL') return this.filteredTeams;
      if (this.loadedTab === this.activeTab) return this.filteredTeams;
      return this.filteredTeams.filter((team) => this.matchesTab(team, this.activeTab));
    },
    historyColumns() {
      if (!this.availableDates.length) return [];
      const end = Math.min(this.availableDates.length, this.historyWindowStart + this.historyWindowSize);
      return this.availableDates.slice(this.historyWindowStart, end);
    },
    canShiftPrev() {
      return this.historyWindowStart > 0;
    },
    canShiftNext() {
      return this.historyWindowStart + this.historyWindowSize < this.availableDates.length;
    },
    selectedDateTotal() {
      return this.tabFilteredTeams.reduce((total, team) => total + this.valueFor(team, this.selectedDateKey), 0);
    },
    selectedDateActiveTeams() {
      return this.tabFilteredTeams.filter((team) => this.valueFor(team, this.selectedDateKey) > 0).length;
    },
    dateSummaries() {
      return this.availableDates.map((date) => {
        const total = this.tabFilteredTeams.reduce((sum, team) => sum + this.valueFor(team, date.key), 0);
        const activeTeams = this.tabFilteredTeams.filter((team) => this.valueFor(team, date.key) > 0).length;
        return {
          ...date,
          total,
          activeTeams,
        };
      });
    },
    periodTotal() {
      return this.tabFilteredTeams.reduce((total, team) => total + this.teamTotal(team), 0);
    },
    productiveTeamsCount() {
      return this.tabFilteredTeams.filter((team) => this.teamTotal(team) > 0).length;
    },
    averageDailyTotal() {
      if (!this.dateSummaries.length) return 0;
      return this.dateSummaries.reduce((sum, date) => sum + date.total, 0) / this.dateSummaries.length;
    },
    topDailySummary() {
      return this.dateSummaries.reduce((top, current) => {
        if (!top) return current;
        return current.total > top.total ? current : top;
      }, null);
    },
    operationalSummaryTitle() {
      if (this.activeTab === 'GERAL') {
        return 'Consolidado operacional das frentes ativas';
      }
      return `Desempenho operacional de ${this.activeSheetLabel}`;
    },
    operationalFootnote() {
      if (!this.topDailySummary) {
        return `Cobertura atual: ${this.importDateRangeLabel}`;
      }
      return `Janela ${this.importDateRangeLabel} · pico em ${this.topDailySummary.label} com ${this.formatCurrency(this.topDailySummary.total)}`;
    },
    contentTransitionKey() {
      return `${this.activeTab}:${this.loadedTab}:${this.importSummary.layout || 'default'}`;
    },
    trendChart() {
      return buildTrendGeometry(this.dateSummaries, this.selectedDateKey, this.formatCurrency);
    },
    barChart() {
      return buildBarGeometry(this.dateSummaries, this.selectedDateKey, this.formatCurrency);
    },
    compositionChart() {
      return buildCompositionData(this.tabFilteredTeams, (team) => this.teamSortValue(team), this.formatCurrency);
    },
    hasActiveChart() {
      if (this.chartType === 'composition') return this.compositionChart.hasData;
      if (this.chartType === 'bar') return this.barChart.hasData;
      return this.trendChart.hasData;
    },
    chartPanelTitle() {
      if (this.chartType === 'line') return 'Curva de evolução diária';
      if (this.chartType === 'area') return 'Área acumulada por data';
      if (this.chartType === 'bar') return 'Comparativo diário em barras';
      return 'Composição das equipes líderes';
    },
    chartPanelDescription() {
      if (this.chartType === 'line') return 'Leitura contínua da variação de produção ao longo do período';
      if (this.chartType === 'area') return 'Ênfase visual no volume acumulado de cada dia';
      if (this.chartType === 'bar') return 'Comparação direta entre os totais de cada data';
      return 'Distribuição das equipes com maior impacto na visão ativa';
    },
    trendSummaryLabel() {
      if (this.chartType === 'composition') {
        return this.rankingMode === 'period' ? 'Participação das equipes no período' : 'Participação das equipes na data';
      }
      return this.rankingMode === 'period' ? 'Total consolidado do período' : 'Total da data em foco';
    },
    trendSummaryValue() {
      if (this.chartType === 'composition') return this.compositionChart.total;
      return this.formatCurrency(this.rankingMode === 'period' ? this.periodTotal : this.selectedDateTotal);
    },
    cardsTitle() {
      return this.rankingMode === 'period'
        ? `Visão rápida do período (${this.importDateRangeLabel})`
        : `Visão rápida (${this.selectedDate?.label || 'sem data'})`;
    },
    cardsDescription() {
      return this.rankingMode === 'period'
        ? 'cards ordenados pelo acumulado do período carregado'
        : 'cards ordenados pelo valor da data selecionada';
    },
    cardsTotalValue() {
      return this.rankingMode === 'period' ? this.periodTotal : this.selectedDateTotal;
    },
    cardsTotalSuffix() {
      return this.rankingMode === 'period' ? 'no período' : 'no dia';
    },
    cardsPrimaryMetricLabel() {
      return this.rankingMode === 'period' ? 'Valor do período' : 'Valor da data';
    },
    cardsSecondaryMetricLabel() {
      return this.rankingMode === 'period' ? 'Melhor dia' : 'Acumulado';
    },
    leadingTeam() {
      return this.tabFilteredTeams.reduce((leader, team) => {
        if (this.teamSortValue(team) <= 0) return leader;
        if (!leader) return team;
        const leaderValue = this.teamSortValue(leader);
        const currentValue = this.teamSortValue(team);
        if (currentValue !== leaderValue) return currentValue > leaderValue ? team : leader;
        return team.display.localeCompare(leader.display) < 0 ? team : leader;
      }, null);
    },
    emptyStateLabel() {
      return this.rankingMode === 'period' ? 'Nenhuma produção encontrada no período carregado' : 'Nenhum valor lançado na data selecionada';
    },
    importStatusText() {
      return (this.importSummary.skippedRows || 0) > 0 ? 'Atenção' : 'Conferido';
    },
    importStatusClass() {
      return (this.importSummary.skippedRows || 0) > 0 ? 'status-pill--warn' : 'status-pill--ok';
    },
    importStatusTitle() {
      if (this.importSummary.layout === 'combined-service') {
        return 'Consolidado de OBRAS, EME e CUSTEIO';
      }
      return (this.importSummary.layout || 'summary') === 'service'
        ? 'Arquivo consolidado por serviços e datas'
        : 'Arquivo consolidado por resumo diário';
    },
    importDateRangeLabel() {
      if (!this.importSummary.firstDateKey || !this.importSummary.lastDateKey) return 'intervalo não identificado';
      return `${this.formatDateKey(this.importSummary.firstDateKey)} até ${this.formatDateKey(this.importSummary.lastDateKey)}`;
    },
  },
  watch: {
    activeTab(newTab, oldTab) {
      if (newTab === oldTab) return;
      this.fetchDropboxExcel();
    },
    chartType(newType) {
      this.persistChartType(newType);
    },
  },
  methods: {
    loadChartType() {
      try {
        return localStorage.getItem(CHART_TYPE_STORAGE_KEY) || 'line';
      } catch (err) {
        return 'line';
      }
    },
    persistChartType(value) {
      try {
        if (value) localStorage.setItem(CHART_TYPE_STORAGE_KEY, value);
      } catch (err) {
        console.warn('Falha ao persistir tipo de gráfico', err);
      }
    },
    loadPinnedTeams() {
      try {
        const raw = localStorage.getItem(PIN_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      } catch (err) {
        console.warn('Falha ao carregar favoritos', err);
        return [];
      }
    },
    savePinnedTeams(list) {
      try {
        localStorage.setItem(PIN_STORAGE_KEY, JSON.stringify(list));
      } catch (err) {
        console.warn('Falha ao salvar favoritos', err);
      }
    },
    loadLastDateKey() {
      try {
        return localStorage.getItem(LAST_DATE_STORAGE_KEY) || '';
      } catch (err) {
        return '';
      }
    },
    persistLastDateKey(key) {
      try {
        if (key) {
          localStorage.setItem(LAST_DATE_STORAGE_KEY, key);
        }
      } catch (err) {
        console.warn('Falha ao persistir data selecionada', err);
      }
    },
    pickDefaultDate(columns) {
      const todayKey = new Date().toISOString().slice(0, 10);
      let column = columns.find((col) => col.key === todayKey);
      if (!column) {
        const previous = columns.filter((col) => col.key <= todayKey);
        column = previous.length ? previous[previous.length - 1] : columns[columns.length - 1];
      }
      return column;
    },
    valueFor(team, dateKey) {
      if (!team || !dateKey) return 0;
      if (!team.valuesByDate) return 0;
      return Object.prototype.hasOwnProperty.call(team.valuesByDate, dateKey)
        ? team.valuesByDate[dateKey]
        : 0;
    },
    formatCurrency(value) {
      return currencyFormatter.format(Number(value) || 0);
    },
    formatShort(value) {
      const num = Number(value) || 0;
      if (!num) return '—';
      return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    formatDateKey(dateKey) {
      if (!dateKey) return '—';
      const date = new Date(`${dateKey}T00:00:00Z`);
      if (Number.isNaN(date.getTime())) return dateKey;
      return dateFormatter.format(date);
    },
    teamTotal(team) {
      return Object.values(team?.valuesByDate || {}).reduce((total, value) => total + (Number(value) || 0), 0);
    },
    bestDayValue(team) {
      return Object.values(team?.valuesByDate || {}).reduce((best, value) => Math.max(best, Number(value) || 0), 0);
    },
    teamSortValue(team) {
      return this.rankingMode === 'period' ? this.teamTotal(team) : this.valueFor(team, this.selectedDateKey);
    },
    cardsSecondaryMetricValue(team) {
      return this.rankingMode === 'period' ? this.bestDayValue(team) : this.teamTotal(team);
    },
    teamSharePercent(team) {
      const currentValue = this.teamSortValue(team);
      const totalBase = this.cardsTotalValue;
      if (!currentValue || !totalBase) return 0;
      return Math.min(100, (currentValue / totalBase) * 100);
    },
    teamShareLabel(team) {
      const percent = this.teamSharePercent(team);
      if (percent <= 0) {
        return this.rankingMode === 'period' ? 'Sem produção no período' : 'Sem produção na data';
      }
      return `${percent.toFixed(1).replace('.', ',')}% ${this.rankingMode === 'period' ? 'do período' : 'do dia'}`;
    },
    valueBadgeClass(value) {
      if (value >= 50000) return 'badge-high';
      if (value > 0) return 'badge-mid';
      return 'badge-low';
    },
    handleDateChange() {
      const column = this.availableDates.find((col) => col.key === this.selectedDateKey);
      if (!column && this.availableDates.length) {
        this.selectedDateKey = this.availableDates[0].key;
      }
      this.persistLastDateKey(this.selectedDateKey);
      this.lastDateKey = this.selectedDateKey;
    },
    selectSummaryDate(dateKey) {
      this.selectedDateKey = dateKey;
      this.rankingMode = 'date';
      this.handleDateChange();
    },
    togglePin(code) {
      const pinned = new Set(this.pinnedTeams);
      if (pinned.has(code)) {
        pinned.delete(code);
      } else {
        pinned.add(code);
      }
      this.pinnedTeams = Array.from(pinned);
      this.savePinnedTeams(this.pinnedTeams);
    },
    isPinned(code) {
      return this.pinnedTeams.includes(code);
    },
    shiftHistory(direction) {
      if (direction < 0 && this.canShiftPrev) {
        this.historyWindowStart = Math.max(0, this.historyWindowStart - 1);
      }
      if (direction > 0 && this.canShiftNext) {
        this.historyWindowStart = Math.min(
          this.availableDates.length - this.historyWindowSize,
          this.historyWindowStart + 1
        );
      }
    },
    matchesTab(team, tab) {
      const type = String(team?.type || '').toUpperCase();
      // build a fallback searchable string from other source columns
      const altFields = [team?.display, team?.code, team?.plate, team?.colD, team?.colL, team?.colAH]
        .filter((v) => v != null)
        .join(' ')
        .toString()
        .toUpperCase();

      if (tab === 'OBRAS') {
        if (!type && !altFields) return true;
        return type.includes('OBRA') || type.includes('CONST') || altFields.includes('OBRA') || altFields.includes('CONST');
      }
      if (tab === 'EME') {
        return type.includes('EME') || altFields.includes('EME');
      }
      if (tab === 'CUSTEIO') {
        return type.includes('CUSTEIO') || altFields.includes('CUSTEIO');
      }
      return true;
    },
    buildEndpointCandidates(primary, sheetName) {
      const query = sheetName ? `?sheet=${encodeURIComponent(sheetName)}` : '';
      const endpoints = [`${primary}${query}`];
      if (primary.startsWith('http')) {
        endpoints.push(`/api/dropbox-diario${query}`);
      }
      return endpoints;
    },
    async requestNormalizedSheet(primary, sheetName) {
      const endpoints = this.buildEndpointCandidates(primary, sheetName);
      let response = null;
      let lastError = null;

      for (const endpoint of endpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          response = await fetch(endpoint, { cache: 'no-store', signal: controller.signal });
          clearTimeout(timeoutId);
          break;
        } catch (error) {
          lastError = error;
          console.warn('fetch failed for', endpoint, error);
        }
      }

      if (!response) {
        throw lastError || new Error(`Falha ao contatar o servidor para a aba ${sheetName}`);
      }

      let payload;
      try {
        payload = await response.json();
      } catch (error) {
        throw new Error(`Resposta inválida do servidor (${response.url}): ${error.message || error}`);
      }

      if (!response.ok) {
        const detail = payload?.detail || payload?.error || `Falha ao buscar dados da aba ${sheetName}`;
        const error = new Error(detail);
        error.payload = payload;
        error.sheetName = sheetName;
        throw error;
      }

      const normalized = payload?.data || {};
      if (!Array.isArray(normalized.dates) || !Array.isArray(normalized.teams)) {
        throw new Error(`Formato inesperado recebido do servidor para a aba ${sheetName}.`);
      }

      return {
        sheetName,
        payload,
        normalized,
      };
    },
    mergeNormalizedSheets(results) {
      const dateMap = new Map();
      const teamMap = new Map();
      const sourceSheets = [];
      const totals = {
        rowCount: 0,
        processedRows: 0,
        skippedRows: 0,
        missingTeamRows: 0,
        missingDateRows: 0,
        zeroValueRows: 0,
        totalImportedValue: 0,
      };

      results.forEach(({ sheetName, normalized }) => {
        sourceSheets.push(sheetName);

        (normalized.dates || []).forEach((date) => {
          if (!dateMap.has(date.key)) {
            dateMap.set(date.key, { ...date });
          }
        });

        (normalized.teams || []).forEach((team) => {
          const existing = teamMap.get(team.code) || {
            code: team.code,
            display: team.display || team.code,
            type: 'GERAL',
            plate: team.plate || '',
            valuesByDate: {},
            sourceSheets: [],
            colD: team.colD ?? null,
            colL: team.colL ?? null,
            colAH: team.colAH ?? null,
          };

          if (!existing.plate && team.plate) existing.plate = team.plate;
          if (existing.colD == null && team.colD != null) existing.colD = team.colD;
          if (existing.colL == null && team.colL != null) existing.colL = team.colL;
          if (existing.colAH == null && team.colAH != null) existing.colAH = team.colAH;
          if (!existing.sourceSheets.includes(sheetName)) existing.sourceSheets.push(sheetName);

          Object.entries(team.valuesByDate || {}).forEach(([dateKey, value]) => {
            existing.valuesByDate[dateKey] = Number(((Number(existing.valuesByDate[dateKey]) || 0) + (Number(value) || 0)).toFixed(2));
          });

          teamMap.set(team.code, existing);
        });

        const summary = normalized.summary || {};
        totals.rowCount += Number(summary.rowCount) || 0;
        totals.processedRows += Number(summary.processedRows) || 0;
        totals.skippedRows += Number(summary.skippedRows) || 0;
        totals.missingTeamRows += Number(summary.missingTeamRows) || 0;
        totals.missingDateRows += Number(summary.missingDateRows) || 0;
        totals.zeroValueRows += Number(summary.zeroValueRows) || 0;
        totals.totalImportedValue = Number((totals.totalImportedValue + (Number(summary.totalImportedValue) || 0)).toFixed(2));
      });

      const dates = Array.from(dateMap.values()).sort((left, right) => left.key.localeCompare(right.key));
      const teams = Array.from(teamMap.values())
        .map((team) => ({
          ...team,
          sourceSheets: [...team.sourceSheets].sort(),
          type: team.sourceSheets.length ? team.sourceSheets.join(' + ') : 'GERAL',
        }))
        .sort((left, right) => left.display.localeCompare(right.display));

      const nonZeroTeams = teams.filter((team) => Object.values(team.valuesByDate || {}).some((value) => Number(value) > 0)).length;

      return {
        dates,
        teams,
        summary: {
          layout: 'combined-service',
          sheetName: 'GERAL',
          sourceSheets,
          rowCount: totals.rowCount,
          processedRows: totals.processedRows,
          skippedRows: totals.skippedRows,
          missingTeamRows: totals.missingTeamRows,
          missingDateRows: totals.missingDateRows,
          zeroValueRows: totals.zeroValueRows,
          totalImportedValue: totals.totalImportedValue,
          teamCount: teams.length,
          dateCount: dates.length,
          nonZeroTeams,
          firstDateKey: dates.length ? dates[0].key : '',
          lastDateKey: dates.length ? dates[dates.length - 1].key : '',
        },
      };
    },
    async fetchDropboxExcel() {
      const requestedTab = this.activeTab;
      this.loading = true;
      this.errorMessage = '';
      this.sampleRows = null;
      try {
        const primary = import.meta.env.DEV ? 'http://localhost:5176/dropbox-diario' : '/api/dropbox-diario';
        const tabToSheet = { OBRAS: 'OBRAS', EME: 'EME', CUSTEIO: 'CUSTEIO' };
        let normalized;
        let origin;
        let generatedAt;

        if (requestedTab === 'GERAL') {
          const generalSheets = ['OBRAS', 'EME', 'CUSTEIO'];
          const results = await Promise.all(generalSheets.map((sheet) => this.requestNormalizedSheet(primary, sheet)));
          const merged = this.mergeNormalizedSheets(results);
          normalized = merged;
          const origins = Array.from(new Set(results.map((result) => result.payload.origin || 'desconhecida')));
          origin = origins.length === 1 ? origins[0] : 'mixed';
          generatedAt = results
            .map((result) => result.payload.generatedAt)
            .filter(Boolean)
            .sort()
            .pop();
        } else {
          const sheetName = tabToSheet[requestedTab];
          const result = await this.requestNormalizedSheet(primary, sheetName);
          normalized = result.normalized;
          origin = result.payload.origin;
          generatedAt = result.payload.generatedAt;
        }

        this.availableDates = normalized.dates || [];
        this.importSummary = normalized.summary || {};
        const teams = (normalized.teams || [])
          .map((team) => ({
            ...team,
            type: team.type || '',
            valuesByDate: team.valuesByDate || {},
          }))
          .sort((a, b) => a.display.localeCompare(b.display));
        this.teamRows = teams;
        this.loadedTab = requestedTab;
        // debug: log distinct types and counts to help investigate empty EME tab
        try {
          const counts = {};
          this.teamRows.forEach((t) => {
            const k = (t.type || '').toString().trim() || '(empty)';
            counts[k] = (counts[k] || 0) + 1;
          });
          // eslint-disable-next-line no-console
          console.debug('DEBUG: team types counts', counts);
        } catch (e) {
          // ignore
        }

        const storedDate = this.availableDates.find((col) => col.key === this.lastDateKey);
        const initialColumn = storedDate || this.pickDefaultDate(this.availableDates);
        this.selectedDateKey = initialColumn ? initialColumn.key : '';
        if (this.selectedDateKey) {
          this.persistLastDateKey(this.selectedDateKey);
          this.lastDateKey = this.selectedDateKey;
        }
        this.historyWindowStart = Math.max(0, this.availableDates.length - this.historyWindowSize);

        this.originLabel = origin === 'remote' ? 'Dropbox' : origin === 'local' ? 'Arquivo local' : origin === 'mixed' ? 'múltiplas origens' : 'desconhecida';
        const updatedAt = generatedAt ? new Date(generatedAt) : new Date();
        this.lastUpdatedLabel = timestampFormatter.format(updatedAt);
      } catch (err) {
        console.error('Erro ao buscar arquivo do Dropbox:', err);
        if (err?.payload?.sampleRows) {
          this.sampleRows = err.payload.sampleRows;
          this.headerCandidates = this.sampleRows.map((row, index) => ({ idx: index, label: `Linha ${index + 1}` }));
          this.headerCandidate = this.headerCandidates.length ? this.headerCandidates[0].idx : null;
          this.loading = false;
          return;
        }
        // Provide more actionable message for common network errors
        if (err && err.name === 'AbortError') {
          this.errorMessage = 'A requisição expirou. Verifique se o servidor está em execução e tente novamente.';
        } else if (err && err.message && err.message.includes('Failed to fetch')) {
          this.errorMessage = 'Falha na conexão: verifique se o servidor está em execução ou problemas de CORS.';
        } else {
          this.errorMessage = err.message || 'Erro desconhecido ao carregar dados.';
        }
        this.importSummary = {};
        this.teamRows = [];
      } finally {
        this.loading = false;
      }
    },

    // lightweight client-side parse fallback for sampleRows
    parseRowsClientSide(rows, headerIndexOverride = null, dataStartCol = 6) {
      const parseHeaderDateLocal = (cellValue) => {
        if (typeof cellValue === 'number') return null;
        if (typeof cellValue !== 'string') return null;
        const trimmed = cellValue.trim();
        if (!trimmed) return null;
        const isoMatch = trimmed.match(/\d{4}-\d{2}-\d{2}/);
        if (isoMatch) return new Date(`${isoMatch[0]}T00:00:00Z`);
        const slashMatch = trimmed.match(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/);
        if (slashMatch) {
          const [dayStr, monthStr, yearStr] = slashMatch[0].split('/');
          let year = yearStr ? Number(yearStr) : new Date().getFullYear();
          if (year < 100) year += 2000;
          return new Date(Date.UTC(year, Number(monthStr) - 1, Number(dayStr)));
        }
        return null;
      };

      const buildDateCols = (headerRow) =>
        headerRow
          .map((v, i) => ({ v, i }))
          .map((item) => {
            const d = parseHeaderDateLocal(item.v);
            if (!d) return null;
            return { idx: item.i, date: d, key: d.toISOString().slice(0, 10), label: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(d) };
          })
          .filter(Boolean);

      const headerIndex = headerIndexOverride != null ? headerIndexOverride : rows.findIndex((r) => Array.isArray(r) && r.some((c) => String(c || '').toUpperCase().includes('BASE')));
      if (headerIndex === -1) throw new Error('Cabeçalho não encontrado no cliente');
      const headerRow = rows[headerIndex];
      const dateCols = buildDateCols(headerRow).filter((c) => c.idx >= dataStartCol || true);
      if (!dateCols.length) throw new Error('Nenhuma coluna de data detectada no cliente');

      const teams = [];
      for (let r = headerIndex + 1; r < rows.length; r += 1) {
        const row = rows[r] || [];
        const maybeCode = row[2] ? String(row[2]).trim() : null;
        if (!maybeCode) continue;
        const hasApontado = row.some((c) => c != null && String(c).toLowerCase().includes('apontado r$'));
        if (!hasApontado) continue;
        const valuesByDate = {};
        dateCols.forEach((c) => {
          const v = row[c.idx];
          const num = typeof v === 'number' ? v : Number(String(v || '').replace(/[^0-9,.-]/g, '').replace(',', '.')) || 0;
          valuesByDate[c.key] = num;
        });
        const safeGet = (r, i) => (Array.isArray(r) && i >= 0 && i < r.length ? r[i] : null);
        const colD = safeGet(row, 3);
        const colL = safeGet(row, 11);
        const colAH = safeGet(row, 33);
        teams.push({ code: maybeCode, display: maybeCode, type: row[1] || '', plate: row[3] || '', valuesByDate, colD, colL, colAH });
      }

      const dates = dateCols.map((c) => ({ key: c.key, label: c.label }));
      return { dates, teams };
    },

    applyClientSampleParse() {
      try {
        if (!this.sampleRows) return;
        const parsed = this.parseRowsClientSide(this.sampleRows, this.headerCandidate, this.dataStartColumn);
        this.availableDates = parsed.dates;
        this.teamRows = parsed.teams.sort((a, b) => a.display.localeCompare(b.display));
        this.importSummary = {
          layout: 'summary',
          sheetName: this.activeSheetLabel,
          rowCount: this.sampleRows.length,
          headerRowIndex: this.headerCandidate,
          dateCount: parsed.dates.length,
          teamCount: parsed.teams.length,
          processedRows: parsed.teams.length,
          skippedRows: 0,
        };
        this.loadedTab = this.activeTab;
        this.selectedDateKey = this.availableDates.length ? this.availableDates[0].key : '';
        this.originLabel = 'arquivo (cliente)';
        this.lastUpdatedLabel = '';
        this.sampleRows = null;
      } catch (e) {
        this.errorMessage = e.message || 'Falha ao parsear amostra no cliente.';
      }
    },
  },
  mounted() {
    this.fetchDropboxExcel();
  },
};
</script>

<style scoped>
.producao-shell {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2.5rem 1.5rem 3rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  position: relative;
}

.producao-shell::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 460px;
  background:
    radial-gradient(circle at top left, rgba(249, 115, 22, 0.18), transparent 32%),
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.14), transparent 36%);
  pointer-events: none;
  z-index: 0;
}

.producao-shell > * {
  position: relative;
  z-index: 1;
}

.producao-hero {
  display: flex;
  justify-content: space-between;
  gap: 1.25rem;
  flex-wrap: wrap;
  align-items: stretch;
  padding: 1.6rem;
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(15, 23, 42, 0.76)),
    radial-gradient(circle at top right, rgba(251, 191, 36, 0.16), transparent 30%);
  box-shadow: 0 24px 60px rgba(2, 6, 23, 0.24);
}

.hero-copy {
  flex: 1 1 620px;
  min-width: 280px;
}

.eyebrow {
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.65);
}

.producao-hero h1 {
  margin: 0.35rem 0 0.45rem;
  font-size: clamp(2rem, 4.3vw, 3.25rem);
  line-height: 1.02;
  max-width: 14ch;
}

.subline {
  margin: 0;
  color: rgba(255, 255, 255, 0.75);
}

.hero-badges {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.hero-badge {
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.84rem;
  backdrop-filter: blur(10px);
}

.hero-badge--strong {
  background: linear-gradient(120deg, rgba(249, 115, 22, 0.22), rgba(251, 191, 36, 0.2));
  border-color: rgba(251, 191, 36, 0.3);
  color: #fff4d4;
}

.hero-badge--soft {
  color: #c7d2fe;
}

.hero-focus {
  width: min(360px, 100%);
  padding: 1.15rem;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(15, 23, 42, 0.2));
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
}

.hero-focus__eyebrow {
  margin: 0;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.56);
}

.hero-focus__headline {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.hero-focus__headline strong {
  font-size: clamp(1.6rem, 3vw, 2.25rem);
  line-height: 1;
}

.hero-focus__headline span {
  color: rgba(255, 255, 255, 0.7);
}

.hero-focus__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

.hero-focus__grid article {
  padding: 0.8rem 0.9rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.hero-focus__grid span {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.56);
}

.hero-focus__grid strong {
  font-size: 1rem;
}

.hero-focus__grid small {
  color: rgba(255, 255, 255, 0.68);
}

.control-dock {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
  padding: 1rem 1.15rem;
  border-radius: 22px;
  background: rgba(15, 23, 42, 0.52);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(14px);
}

.panel-stack {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
  flex: 1 1 720px;
}

.control-summary {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.control-summary__item {
  min-width: 180px;
  padding: 0.8rem 0.95rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.control-summary__item span {
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: rgba(255, 255, 255, 0.56);
}

.control-summary__item strong {
  font-size: 0.96rem;
}

.tab-strip {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  padding: 0.2rem 0;
}

.tab-btn {
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(15, 23, 42, 0.65);
  color: rgba(255, 255, 255, 0.84);
  border-radius: 999px;
  padding: 0.5rem 1rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  cursor: pointer;
  transition: transform 0.16s ease, background 0.16s ease, border-color 0.16s ease;
  position: relative;
  overflow: hidden;
}

.tab-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(251, 191, 36, 0.32);
}

.tab-btn::after {
  content: '';
  position: absolute;
  inset: auto 14px 7px;
  height: 2px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 0.18s ease;
}

.tab-btn.active {
  color: #0f172a;
  border-color: transparent;
  background: linear-gradient(120deg, #f97316, #fbbf24);
}

.tab-btn.active::after {
  transform: scaleX(1);
  background: rgba(15, 23, 42, 0.8);
}

.input-stack {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  padding: 0.35rem;
  border-radius: 18px;
  transition: background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.input-stack:hover {
  background: rgba(255, 255, 255, 0.03);
}

.input-stack:focus-within {
  background: rgba(255, 255, 255, 0.04);
  box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.26);
  transform: translateY(-1px);
}

.input-stack span {
  transition: color 0.18s ease, transform 0.18s ease;
}

.input-stack:focus-within span {
  color: #fde68a;
  transform: translateX(2px);
}

.input-stack select,
.input-stack input {
  min-width: 190px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(15, 23, 42, 0.8);
  color: #fff;
  padding: 0.6rem 1rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
  outline: none;
}

.input-stack select:hover,
.input-stack input:hover {
  border-color: rgba(251, 191, 36, 0.24);
}

.input-stack select:focus,
.input-stack input:focus {
  border-color: rgba(251, 191, 36, 0.54);
  background: rgba(15, 23, 42, 0.94);
  box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.1);
}

.pill {
  border: none;
  border-radius: 999px;
  padding: 0.8rem 1.6rem;
  font-weight: 600;
  color: #0f172a;
  background: linear-gradient(120deg, #f97316, #fbbf24);
  cursor: pointer;
  box-shadow: 0 14px 24px rgba(249, 115, 22, 0.24);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.pill:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 18px 30px rgba(249, 115, 22, 0.3);
}

.pill:active:not(:disabled),
.tab-btn:active,
.date-summary-card:active,
.team-card:active {
  transform: translateY(0) scale(0.99);
}

.pill:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.state-panel {
  border-radius: 20px;
  padding: 2.5rem;
  background: rgba(15, 23, 42, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.07);
  text-align: center;
}

.state-panel.error {
  border-color: rgba(248, 113, 113, 0.4);
}

.loader {
  width: 60px;
  height: 60px;
  margin: 0 auto 1rem;
  border-radius: 50%;
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-top-color: #fff;
  animation: spin 0.9s linear infinite;
}

.cards-section,
.history-panel,
.dates-panel,
.trend-panel {
  background: rgba(15, 23, 42, 0.55);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.overview-card {
  padding: 1.2rem 1.25rem;
  border-radius: 20px;
  background:
    radial-gradient(circle at top right, rgba(251, 191, 36, 0.12), transparent 42%),
    rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.08);
  min-height: 158px;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  box-shadow: 0 14px 30px rgba(2, 6, 23, 0.12);
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
}

.overview-card:hover {
  transform: translateY(-2px);
  border-color: rgba(251, 191, 36, 0.18);
  box-shadow: 0 18px 36px rgba(2, 6, 23, 0.16);
}

.overview-card--hero {
  grid-column: span 2;
}

.overview-card__head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.overview-card h2 {
  margin: 0.15rem 0 0;
  font-size: 1.25rem;
}

.overview-label {
  margin: 0;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.58);
}

.overview-value {
  font-size: 1.8rem;
  font-weight: 800;
  line-height: 1.1;
}

.overview-value--compact {
  font-size: 1.2rem;
}

.overview-footnote {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.92rem;
}

.overview-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.metric-tile {
  padding: 0.75rem 0.85rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.metric-tile span {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.58);
}

.metric-tile strong {
  font-size: 1.25rem;
}

.status-pill {
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.status-pill--ok {
  background: rgba(34, 197, 94, 0.14);
  color: #86efac;
}

.status-pill--warn {
  background: rgba(251, 191, 36, 0.14);
  color: #fde68a;
}

.cards-section header,
.history-panel header,
.dates-panel header,
.trend-panel header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.trend-panel__summary {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.trend-panel__header-tools {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  flex-wrap: wrap;
}

.chart-switcher {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  padding: 0.35rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.chart-switcher__btn {
  border: none;
  border-radius: 999px;
  padding: 0.5rem 0.85rem;
  background: transparent;
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.chart-switcher__btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}

.chart-switcher__btn.active {
  color: #0f172a;
  background: linear-gradient(120deg, #f97316, #fbbf24);
}

.trend-panel__summary span {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: rgba(255, 255, 255, 0.58);
}

.trend-panel__summary strong {
  font-size: 1.05rem;
}

.trend-chart-card {
  border-radius: 18px;
  padding: 1rem 1rem 1.15rem;
  background:
    radial-gradient(circle at top right, rgba(249, 115, 22, 0.12), transparent 28%),
    rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.trend-chart {
  width: 100%;
  height: 220px;
  overflow: visible;
}

.trend-chart__line {
  fill: none;
  stroke: #fbbf24;
  stroke-width: 1.15;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.trend-chart__guide {
  stroke: rgba(255, 255, 255, 0.16);
  stroke-dasharray: 1.5 1.5;
}

.trend-chart__point {
  fill: #f8fafc;
  stroke: #f97316;
  stroke-width: 0.5;
  cursor: pointer;
  transition: transform 0.18s ease, fill 0.18s ease;
}

.trend-chart__point:hover {
  fill: #fff4d4;
}

.trend-chart__point.is-active {
  fill: #fbbf24;
}

.trend-chart__bar {
  fill: rgba(251, 191, 36, 0.5);
  cursor: pointer;
  transition: fill 0.18s ease, transform 0.18s ease;
}

.trend-chart__bar:hover {
  fill: rgba(251, 191, 36, 0.72);
}

.trend-chart__bar.is-active {
  fill: rgba(249, 115, 22, 0.92);
}

.composition-chart {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.composition-row {
  padding: 0.9rem 0.95rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.composition-row__head {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: baseline;
  flex-wrap: wrap;
}

.composition-row__head strong {
  display: block;
  font-size: 0.98rem;
}

.composition-row__head small {
  color: rgba(255, 255, 255, 0.64);
}

.composition-row__value {
  text-align: right;
}

.composition-row__bar {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.composition-row__bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #f97316, #fbbf24);
  transition: width 0.25s ease;
}

.trend-chart__footer {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.5rem;
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.82rem;
}

.trend-insights {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
  margin-top: 1rem;
}

.trend-insights article {
  padding: 0.85rem 0.9rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.trend-insights span {
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.56);
}

.trend-insights strong {
  font-size: 1rem;
}

.trend-insights small,
.trend-empty p {
  color: rgba(255, 255, 255, 0.68);
}

.trend-empty {
  padding: 1rem 0;
}

.cards-total {
  font-weight: 700;
  color: #f8fafc;
  font-size: 0.96rem;
}

.leader-spotlight {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 1rem 1.1rem;
  border-radius: 20px;
  background:
    linear-gradient(135deg, rgba(249, 115, 22, 0.16), rgba(15, 23, 42, 0.3)),
    rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.18);
}

.leader-spotlight__copy {
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
}

.leader-spotlight__label {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.58);
}

.leader-spotlight__copy strong {
  font-size: 1.15rem;
}

.leader-spotlight__copy small {
  color: rgba(255, 255, 255, 0.68);
}

.leader-spotlight__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  flex: 1 1 460px;
}

.leader-spotlight__stats article {
  padding: 0.8rem 0.9rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.leader-spotlight__stats span {
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.56);
}

.leader-spotlight__stats strong {
  font-size: 0.94rem;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}

.date-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.9rem;
}

.date-summary-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  padding: 1rem;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
  position: relative;
  overflow: hidden;
}

.date-summary-card:hover {
  transform: translateY(-1px);
  border-color: rgba(251, 191, 36, 0.35);
}

.date-summary-card::after {
  content: '';
  position: absolute;
  inset: auto 0 0;
  height: 3px;
  background: linear-gradient(90deg, rgba(249, 115, 22, 0), rgba(251, 191, 36, 0.95), rgba(249, 115, 22, 0));
  transform: scaleX(0.15);
  opacity: 0;
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.date-summary-card:hover::after,
.date-summary-card.active::after {
  transform: scaleX(1);
  opacity: 1;
}

.date-summary-card.active {
  border-color: rgba(251, 191, 36, 0.9);
  background: linear-gradient(180deg, rgba(249, 115, 22, 0.18), rgba(15, 23, 42, 0.9));
}

.date-summary-card__label {
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.62);
}

.date-summary-card strong {
  font-size: 1rem;
}

.date-summary-card small {
  color: rgba(255, 255, 255, 0.68);
}

.team-card {
  position: relative;
  border-radius: 18px;
  padding: 1rem 1.2rem 1.1rem;
  background:
    linear-gradient(180deg, rgba(30, 41, 59, 0.78), rgba(15, 23, 42, 0.86)),
    rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  min-height: 180px;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  overflow: hidden;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.team-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 34px rgba(2, 6, 23, 0.2);
}

.team-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top right, rgba(251, 191, 36, 0.14), transparent 34%);
  opacity: 0;
  transition: opacity 0.18s ease;
  pointer-events: none;
}

.team-card:hover::before {
  opacity: 1;
}

.team-card.badge-high {
  border-color: rgba(34, 197, 94, 0.6);
  box-shadow: 0 10px 30px rgba(34, 197, 94, 0.25);
}

.team-card.badge-mid {
  border-color: rgba(251, 191, 36, 0.6);
}

.team-card.badge-low {
  border-color: rgba(248, 113, 113, 0.5);
}

.pin-button {
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  border: none;
  background: transparent;
  color: #fcd34d;
  cursor: pointer;
  font-size: 1.1rem;
}

.team-rank {
  position: absolute;
  top: 0.75rem;
  left: 0.85rem;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.16);
  color: rgba(255, 255, 255, 0.76);
  font-size: 0.72rem;
  font-weight: 700;
}

.team-card__meta {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding-top: 1.3rem;
}

.team-code {
  font-weight: 600;
  font-size: 1rem;
}

.team-plate {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.65);
}

.team-card__details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.team-card__details div {
  padding: 0.75rem 0.8rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.team-card__details span {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.56);
  margin-bottom: 0.3rem;
}

.team-card__details strong {
  font-size: 0.95rem;
}

.team-card__value {
  font-size: 1rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.88);
}

.team-card__bar {
  width: 100%;
  height: 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.team-card__bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #f97316, #fbbf24);
  transition: width 0.28s ease;
}

.panel-appear {
  animation: panelRise 0.5s ease both;
}

.panel-appear--1 { animation-delay: 0.04s; }
.panel-appear--2 { animation-delay: 0.09s; }
.panel-appear--3 { animation-delay: 0.14s; }
.panel-appear--4 { animation-delay: 0.19s; }
.panel-appear--5 { animation-delay: 0.24s; }

.content-fade-enter-active,
.content-fade-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.content-fade-enter-from,
.content-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@keyframes panelRise {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.history-panel .history-nav button {
  border: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 1.1rem;
  cursor: pointer;
}

.history-panel .history-nav button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.table-wrapper {
  overflow-x: auto;
}

.history-panel table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.history-panel th,
.history-panel td {
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.6rem 0.8rem;
  text-align: center;
}

.team-cell {
  text-align: left;
  min-width: 200px;
}

.team-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.2);
  font-weight: 600;
}

.team-tag.pinned {
  background: rgba(250, 204, 21, 0.25);
  color: #facc15;
}

.value-cell {
  min-width: 120px;
  font-weight: 600;
}

.value-cell.badge-low {
  color: #f87171;
}

.value-cell.badge-mid {
  color: #fde68a;
}

.value-cell.badge-high {
  color: #86efac;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }
  .overview-card--hero {
    grid-column: span 1;
  }
  .producao-hero {
    padding: 1.2rem;
  }
  .producao-hero h1 {
    max-width: none;
  }
  .control-dock {
    padding: 0.95rem;
  }
  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }
  .control-summary {
    width: 100%;
    flex-direction: column;
  }
  .trend-panel__header-tools {
    width: 100%;
    justify-content: stretch;
  }
  .chart-switcher {
    width: 100%;
    justify-content: space-between;
  }
  .trend-panel__summary {
    align-items: flex-start;
  }
  .leader-spotlight__stats {
    grid-template-columns: 1fr;
  }
  .team-card__details {
    grid-template-columns: 1fr;
  }
  .trend-insights {
    grid-template-columns: 1fr;
  }
  .history-panel table {
    font-size: 0.8rem;
  }
}
</style>
