<template>
  <section class="kaizen-page">
    <header class="page-header">
      <div>
        <p class="page-header__eyebrow">Kaizen Bot</p>
        <h1>Turnos SIGA</h1>
        <p>
          Extração diária do SIGA, leitura do TXT, separação dos horários de início e fim e persistência no Neon.
        </p>
      </div>
      <div class="page-header__actions">
        <label class="field-inline">
          <span>{{ historySelectorLabel }}</span>
          <input
            v-if="selectedPeriod === 'week'"
            v-model="selectedWeekDate"
            type="date"
            @input="handleHistoryReferenceChange"
          >
          <input
            v-else
            v-model="selectedMonth"
            type="month"
            @input="handleHistoryReferenceChange"
          >
        </label>
        <label class="field-inline">
          <span>Início do sync</span>
          <input v-model="syncStartDate" type="date">
        </label>
        <label class="field-inline">
          <span>Fim do sync</span>
          <input v-model="syncEndDate" type="date">
        </label>
        <div class="field-inline field-inline--period">
          <span>Exibição</span>
          <div class="segmented-control">
            <button
              v-for="option in periodOptions"
              :key="option.value"
              type="button"
              class="segment-btn"
              :class="{ 'segment-btn--active': selectedPeriod === option.value }"
              :disabled="loading"
              @click="changePeriod(option.value)"
            >
              {{ option.label }}
            </button>
          </div>
        </div>
        <button type="button" class="primary-btn" :disabled="syncing" @click="syncNow">
          {{ syncing ? 'Sincronizando...' : 'Sincronizar agora' }}
        </button>
        <div v-if="syncing" class="sync-status-panel" aria-live="polite">
          <span class="sync-status-panel__dot"></span>
          <div class="sync-status-panel__body">
            <strong>Carregando sincronização</strong>
            <p>
              Tempo decorrido: {{ syncElapsedLabel }}
              <span v-if="syncProgressSummary"> | {{ syncProgressSummary }}</span>
            </p>
            <div class="sync-progress" role="progressbar" :aria-valuenow="syncProgressPercentage" aria-valuemin="0" aria-valuemax="100">
              <div class="sync-progress__bar" :style="{ width: `${syncProgressPercentage}%` }"></div>
            </div>
            <small>{{ syncCurrentMessage }}</small>
          </div>
        </div>
      </div>
    </header>

    <section class="kaizen-grid">
      <article class="kaizen-card kaizen-card--hero">
        <span class="card-tag">Status</span>
        <h2>{{ latestRunLabel }}</h2>
        <p>{{ latestRunDescription }}</p>
        <div class="card-pills">
          <span class="pill">{{ filteredEntries.length }} equipes carregadas</span>
          <span class="pill">{{ runs.length }} execuções no histórico</span>
          <span class="pill">{{ rangeLabel }}</span>
          <span class="pill">Filtro: {{ selectedBaseLabel }}</span>
        </div>
      </article>

      <article class="kaizen-card kaizen-card--summary">
        <span class="card-tag">Bases</span>
        <h3>Equipes por base</h3>
        <div class="base-summary-grid">
          <div class="base-summary-item">
            <strong>Bacabal</strong>
            <span>{{ baseSummary.BCB }}</span>
          </div>
          <div class="base-summary-item">
            <strong>Itapecuru Mirim</strong>
            <span>{{ baseSummary.ITM }}</span>
          </div>
          <div class="base-summary-item">
            <strong>Santa Ines</strong>
            <span>{{ baseSummary.STI }}</span>
          </div>
        </div>
      </article>

      <article class="kaizen-card">
        <span class="card-tag">Automação</span>
        <h3>Fluxo configurado</h3>
        <ul class="kaizen-checklist">
          <li>Login automatizado no SIGA com Playwright</li>
          <li>Download do relatório TXT</li>
          <li>Parser dos IDs das equipes e horários</li>
          <li>Persistência no Neon para histórico rápido</li>
        </ul>
      </article>

      <article class="kaizen-card">
        <span class="card-tag">Observações</span>
        <h3>Configuração necessária</h3>
        <p>
          Defina <strong>DATABASE_URL</strong>, <strong>KAIZEN_SIGA_USERNAME</strong> e <strong>KAIZEN_SIGA_PASSWORD</strong>
          no ambiente do servidor ou na máquina que executará o sync diário.
        </p>
      </article>
    </section>

    <section class="kaizen-chart-grid">
      <article ref="weeklyChartCard" class="kaizen-card kaizen-card--chart kaizen-card--chart-spotlight">
        <div class="section-head section-head--chart">
          <div>
            <span class="card-tag">Gráfico semanal</span>
            <h3>Início de turno por equipe</h3>
            <p class="section-head__meta">{{ weeklyChartTitle }}</p>
          </div>
          <div class="chart-head-actions">
            <label class="field-inline field-inline--chart-filter">
              <span>Semana do gráfico</span>
              <input v-model="selectedWeekDate" type="date" :disabled="chartLoading || exportingChart === 'weekly'" @input="handleWeekChartDateChange">
            </label>
            <div class="chart-export-actions">
              <button type="button" class="chart-export-btn" :disabled="exportingChart === 'weekly'" @click="exportChartImage('weekly')">
                {{ exportingChart === 'weekly' ? 'Gerando...' : 'Imagem' }}
              </button>
              <button type="button" class="chart-export-btn chart-export-btn--secondary" :disabled="exportingChart === 'weekly'" @click="exportChartPdf('weekly')">
                PDF
              </button>
            </div>
          </div>
        </div>
        <div class="chart-stat-grid">
          <article v-for="item in weeklyChartStats" :key="`week-${item.label}`" class="chart-stat-card">
            <strong>{{ item.value }}</strong>
            <span>{{ item.label }}</span>
          </article>
        </div>
        <div class="chart-band-legend">
          <span class="chart-band chart-band--on-time">No horário</span>
          <span class="chart-band chart-band--late">Atrasado</span>
        </div>
        <div class="chart-shell">
          <apexchart
            type="heatmap"
            :height="weeklyChartHeight"
            :options="weeklyChartOptions"
            :series="weeklyStartChart.series"
          />
        </div>
      </article>

      <article ref="monthlyChartCard" class="kaizen-card kaizen-card--chart kaizen-card--chart-spotlight">
        <div class="section-head section-head--chart">
          <div>
            <span class="card-tag">Gráfico mensal</span>
            <h3>Início de turno por equipe</h3>
            <p class="section-head__meta">{{ monthlyChartTitle }}</p>
          </div>
          <div class="chart-head-actions">
            <label class="field-inline field-inline--chart-filter">
              <span>Mês do gráfico</span>
              <input v-model="selectedMonth" type="month" :disabled="chartLoading || exportingChart === 'monthly'" @input="handleMonthChartDateChange">
            </label>
            <div class="chart-export-actions">
              <button type="button" class="chart-export-btn" :disabled="exportingChart === 'monthly'" @click="exportChartImage('monthly')">
                {{ exportingChart === 'monthly' ? 'Gerando...' : 'Imagem' }}
              </button>
              <button type="button" class="chart-export-btn chart-export-btn--secondary" :disabled="exportingChart === 'monthly'" @click="exportChartPdf('monthly')">
                PDF
              </button>
            </div>
          </div>
        </div>
        <div class="chart-stat-grid">
          <article v-for="item in monthlyChartStats" :key="`month-${item.label}`" class="chart-stat-card">
            <strong>{{ item.value }}</strong>
            <span>{{ item.label }}</span>
          </article>
        </div>
        <div class="chart-band-legend">
          <span class="chart-band chart-band--on-time">No horário</span>
          <span class="chart-band chart-band--late">Atrasado</span>
        </div>
        <div class="chart-shell">
          <apexchart
            type="heatmap"
            :height="monthlyChartHeight"
            :options="monthlyChartOptions"
            :series="monthlyStartChart.series"
          />
        </div>
      </article>
    </section>

    <section class="kaizen-card kaizen-card--wide">
      <div class="section-head">
        <div>
          <span class="card-tag">Histórico</span>
          <h3>Turnos importados</h3>
          <p class="section-head__meta">{{ rangeLabel }}</p>
        </div>
        <div class="section-head__actions">
          <div class="field-inline field-inline--base-filter">
            <span>Base</span>
            <div class="segmented-control segmented-control--base-filter">
              <button
                v-for="option in baseFilterOptions"
                :key="option.value"
                type="button"
                class="segment-btn"
                :class="{ 'segment-btn--active': selectedBaseFilter === option.value }"
                :disabled="loading"
                @click="changeBaseFilter(option.value)"
              >
                {{ option.label }}
              </button>
            </div>
          </div>
          <button type="button" class="ghost-btn" :disabled="loading" @click="loadHistory">
            {{ loading ? 'Atualizando...' : 'Atualizar lista' }}
          </button>
        </div>
      </div>

      <p v-if="errorMessage" class="state-message state-message--error">{{ errorMessage }}</p>
      <p v-else-if="successMessage" class="state-message state-message--success">{{ successMessage }}</p>
      <p v-if="warningMessage" class="state-message state-message--warning">{{ warningMessage }}</p>

      <div v-if="syncLogs.length" class="sync-log-card">
        <div class="sync-log-card__head">
          <strong>Log da sincronização</strong>
          <span>{{ syncStatusLabel }}</span>
        </div>
        <ul class="sync-log-list">
          <li v-for="entry in syncLogs" :key="`${entry.timestamp}-${entry.message}`" :class="`sync-log-list__item sync-log-list__item--${entry.level || 'info'}`">
            <span>{{ formatTime(entry.timestamp) }}</span>
            <p>{{ entry.message }}</p>
          </li>
        </ul>
      </div>

      <div class="table-shell">
        <table class="kaizen-table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Equipe</th>
              <th>Início</th>
              <th>Fim</th>
              <th>Origem</th>
              <th>Sincronizado em</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="entry in filteredEntries" :key="`${entry.reference_date}-${entry.team_id}`">
              <td>{{ formatDate(entry.reference_date) }}</td>
              <td>{{ entry.team_label || entry.team_id }}</td>
              <td>{{ entry.shift_start || '' }}</td>
              <td>{{ entry.shift_end || '' }}</td>
              <td>{{ entry.source }}</td>
              <td>{{ formatDateTime(entry.synced_at) }}</td>
            </tr>
            <tr v-if="!loading && !filteredEntries.length">
              <td colspan="6" class="empty-state">{{ emptyStateLabel }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>

<script>
import { defineAsyncComponent } from 'vue';
import { captureElementAsPng, saveChartPdf } from '../utils/producaoExporters';

const ApexChart = defineAsyncComponent(() => import('vue3-apexcharts'));
const today = new Date().toISOString().slice(0, 10);
const baseFilterOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'BCB', label: 'Bacabal' },
  { value: 'ITM', label: 'Itapecuru Mirim' },
  { value: 'STI', label: 'Santa Ines' },
];

const CHART_COLORS = [
  '#1fd0ff', '#2f6df6', '#06d6a0', '#ffd166', '#ff7b72', '#9b8cff', '#4cc9f0', '#43aa8b',
  '#f8961e', '#f3722c', '#577590', '#90be6d', '#f94144', '#277da1', '#f9c74f',
];

function normalizeDateOnly(value) {
  if (!value) return today;
  return String(value).slice(0, 10);
}

function addDays(dateString, days) {
  const base = new Date(`${normalizeDateOnly(dateString)}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function buildDateRange(startDate, endDate) {
  const dates = [];
  let cursor = normalizeDateOnly(startDate);
  const limit = normalizeDateOnly(endDate);
  while (cursor <= limit) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

function timeToMinutes(value) {
  if (!value) return null;
  const [hours, minutes] = String(value).split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return (hours * 60) + minutes;
}

function formatMinutesToTimeLabel(value) {
  if (!Number.isFinite(value)) return '';
  const totalMinutes = Math.max(0, Math.round(value));
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function roundDownMinutes(value, step = 30) {
  return Math.floor(value / step) * step;
}

function roundUpMinutes(value, step = 30) {
  return Math.ceil(value / step) * step;
}

function resolveEntryBaseCode(entry) {
  const reference = String(entry?.team_id || entry?.team_label || '').toUpperCase();
  if (reference.includes('-BCB-') || reference.includes('_BCB_')) return 'BCB';
  if (reference.includes('-ITM-') || reference.includes('_ITM_')) return 'ITM';
  if (reference.includes('-STI-') || reference.includes('_STI_')) return 'STI';
  return 'OTHER';
}

function buildStartChartModel(entries = [], range = null, filter = 'all') {
  const filteredEntries = entries.filter((entry) => {
    if (!entry?.shift_start) return false;
    if (filter === 'all') return true;
    return resolveEntryBaseCode(entry) === filter;
  });

  const startDate = range?.startDate || today;
  const endDate = range?.endDate || startDate;
  const categories = buildDateRange(startDate, endDate);
  const teams = Array.from(new Set(filteredEntries.map((entry) => entry.team_label || entry.team_id))).sort((left, right) => left.localeCompare(right));
  const minuteValues = filteredEntries
    .map((entry) => timeToMinutes(entry.shift_start))
    .filter((value) => Number.isFinite(value));
  const entriesByTeamAndDate = new Map(
    filteredEntries.map((entry) => [
      `${entry.team_label || entry.team_id}:${normalizeDateOnly(entry.reference_date)}`,
      timeToMinutes(entry.shift_start),
    ])
  );

  const series = teams.map((teamLabel) => {
    const data = categories.map((date) => ({
      x: date,
      y: entriesByTeamAndDate.get(`${teamLabel}:${date}`) ?? null,
    }));
    return {
      name: teamLabel,
      data,
    };
  }).filter((seriesItem) => seriesItem.data.some((point) => Number.isFinite(point.y)));

  const datesWithRecords = new Set(filteredEntries.map((entry) => normalizeDateOnly(entry.reference_date))).size;

  return {
    categories,
    teams,
    series,
    teamsCount: teams.length,
    recordsCount: filteredEntries.length,
    datesWithRecords,
    averageMinutes: minuteValues.length
      ? minuteValues.reduce((sum, value) => sum + value, 0) / minuteValues.length
      : null,
    earliestMinutes: minuteValues.length ? Math.min(...minuteValues) : null,
    latestMinutes: minuteValues.length ? Math.max(...minuteValues) : null,
    yMin: minuteValues.length ? Math.max(0, roundDownMinutes(Math.min(...minuteValues) - 30, 30)) : 0,
    yMax: minuteValues.length ? Math.min(24 * 60, roundUpMinutes(Math.max(...minuteValues) + 30, 30)) : 24 * 60,
  };
}

export default {
  name: 'KaizenPage',
  components: {
    ApexChart,
    apexchart: ApexChart,
  },
  data() {
    return {
      selectedDate: today,
      selectedWeekDate: today,
      selectedMonth: today.slice(0, 7),
      syncStartDate: today,
      syncEndDate: today,
      selectedPeriod: 'week',
      selectedBaseFilter: 'all',
      periodOptions: [
        { value: 'week', label: 'Semana' },
        { value: 'month', label: 'Mês' },
      ],
      baseFilterOptions,
      entries: [],
      runs: [],
      range: null,
      weeklyChartEntries: [],
      weeklyChartRange: null,
      monthlyChartEntries: [],
      monthlyChartRange: null,
      loading: false,
      chartLoading: false,
      exportingChart: '',
      syncing: false,
      syncJobId: '',
      syncPollId: null,
      syncProgressPercentage: 0,
      syncProcessedDates: 0,
      syncTotalDates: 0,
      syncCurrentDate: '',
      syncCurrentMessage: 'Aguardando sincronização.',
      syncLogs: [],
      syncStatus: '',
      syncStartedAt: null,
      syncFinishedAt: null,
      syncElapsedSeconds: 0,
      syncTimerId: null,
      errorMessage: '',
      successMessage: '',
      warningMessage: '',
    };
  },
  computed: {
    filteredEntries() {
      if (this.selectedBaseFilter === 'all') return this.entries;
      return this.entries.filter((entry) => resolveEntryBaseCode(entry) === this.selectedBaseFilter);
    },
    latestRun() {
      return this.runs.length ? this.runs[0] : null;
    },
    latestRunLabel() {
      if (!this.latestRun) return 'Nenhuma sincronização executada';
      return `${this.latestRun.records_count} equipes sincronizadas em ${this.formatDate(this.latestRun.reference_date)}`;
    },
    latestRunDescription() {
      if (!this.latestRun) {
        return 'Use o botão de sincronização para gerar a primeira captura do Kaizen no Neon.';
      }
      return `Última origem: ${this.latestRun.source}. Execução em ${this.formatDateTime(this.latestRun.created_at)}.`;
    },
    rangeLabel() {
      if (!this.range || !this.range.startDate || !this.range.endDate) {
        return 'Período não carregado';
      }

      if (this.selectedPeriod === 'week') {
        return `Visualização semanal: ${this.formatDate(this.range.startDate)} até ${this.formatDate(this.range.endDate)}`;
      }

      return `Visualização mensal: ${this.formatDate(this.range.startDate)} até ${this.formatDate(this.range.endDate)}`;
    },
    historyReferenceDate() {
      if (this.selectedPeriod === 'month') {
        return `${this.selectedMonth}-01`;
      }
      return this.selectedWeekDate;
    },
    historySelectorLabel() {
      return this.selectedPeriod === 'month' ? 'Mês de exibição' : 'Semana de referência';
    },
    selectedBaseLabel() {
      const current = this.baseFilterOptions.find((option) => option.value === this.selectedBaseFilter);
      return current ? current.label : 'Todos';
    },
    syncElapsedLabel() {
      const totalSeconds = Number(this.syncElapsedSeconds || 0);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },
    syncProgressSummary() {
      if (!this.syncTotalDates) {
        return `${this.syncProgressPercentage}%`;
      }
      return `${this.syncProcessedDates}/${this.syncTotalDates} datas | ${this.syncProgressPercentage}%`;
    },
    syncStatusLabel() {
      if (this.syncStatus === 'running') return 'Em andamento';
      if (this.syncStatus === 'completed') return 'Concluído';
      if (this.syncStatus === 'failed') return 'Falhou';
      if (this.syncStatus === 'queued') return 'Na fila';
      return 'Sem execução';
    },
    baseSummary() {
      return this.entries.reduce((summary, entry) => {
        const baseCode = resolveEntryBaseCode(entry);
        if (baseCode in summary) {
          summary[baseCode] += 1;
        }
        return summary;
      }, {
        BCB: 0,
        ITM: 0,
        STI: 0,
      });
    },
    weeklyStartChart() {
      return buildStartChartModel(this.weeklyChartEntries, this.weeklyChartRange, this.selectedBaseFilter);
    },
    monthlyStartChart() {
      return buildStartChartModel(this.monthlyChartEntries, this.monthlyChartRange, this.selectedBaseFilter);
    },
    weeklyChartTitle() {
      if (!this.weeklyChartRange || !this.weeklyChartRange.startDate || !this.weeklyChartRange.endDate) {
        return 'Início de turno na semana';
      }
      return `Semana: ${this.formatDate(this.weeklyChartRange.startDate)} até ${this.formatDate(this.weeklyChartRange.endDate)}`;
    },
    monthlyChartTitle() {
      if (!this.monthlyChartRange || !this.monthlyChartRange.startDate || !this.monthlyChartRange.endDate) {
        return 'Início de turno no mês';
      }
      return `Mês: ${this.formatDate(this.monthlyChartRange.startDate)} até ${this.formatDate(this.monthlyChartRange.endDate)}`;
    },
    weeklyChartStats() {
      return [
        { label: 'Equipes com dados', value: String(this.weeklyStartChart.teamsCount || 0) },
        { label: 'Dias com registro', value: String(this.weeklyStartChart.datesWithRecords || 0) },
        { label: 'Registros', value: String(this.weeklyStartChart.recordsCount || 0) },
        { label: 'Média', value: formatMinutesToTimeLabel(this.weeklyStartChart.averageMinutes) || '--:--' },
        { label: 'Mais cedo', value: formatMinutesToTimeLabel(this.weeklyStartChart.earliestMinutes) || '--:--' },
        { label: 'Mais tarde', value: formatMinutesToTimeLabel(this.weeklyStartChart.latestMinutes) || '--:--' },
      ];
    },
    monthlyChartStats() {
      return [
        { label: 'Equipes com dados', value: String(this.monthlyStartChart.teamsCount || 0) },
        { label: 'Dias com registro', value: String(this.monthlyStartChart.datesWithRecords || 0) },
        { label: 'Registros', value: String(this.monthlyStartChart.recordsCount || 0) },
        { label: 'Média', value: formatMinutesToTimeLabel(this.monthlyStartChart.averageMinutes) || '--:--' },
        { label: 'Mais cedo', value: formatMinutesToTimeLabel(this.monthlyStartChart.earliestMinutes) || '--:--' },
        { label: 'Mais tarde', value: formatMinutesToTimeLabel(this.monthlyStartChart.latestMinutes) || '--:--' },
      ];
    },
    weeklyChartHeight() {
      return Math.max(420, (this.weeklyStartChart.teamsCount || 1) * 30 + 150);
    },
    monthlyChartHeight() {
      return Math.max(420, (this.monthlyStartChart.teamsCount || 1) * 30 + 150);
    },
    weeklyChartInfoLine() {
      return `Filtro ${this.selectedBaseLabel} | Equipes ${this.weeklyStartChart.teamsCount || 0} | Registros ${this.weeklyStartChart.recordsCount || 0}`;
    },
    monthlyChartInfoLine() {
      return `Filtro ${this.selectedBaseLabel} | Equipes ${this.monthlyStartChart.teamsCount || 0} | Registros ${this.monthlyStartChart.recordsCount || 0}`;
    },
    weeklyChartOptions() {
      return this.buildStartChartOptions(this.weeklyStartChart, 'Início do turno por equipe na semana');
    },
    monthlyChartOptions() {
      return this.buildStartChartOptions(this.monthlyStartChart, 'Início do turno por equipe no mês');
    },
    emptyStateLabel() {
      const filterSuffix = this.selectedBaseFilter === 'all' ? '' : ` para ${this.selectedBaseLabel}`;
      if (this.selectedPeriod === 'week') {
        return `Nenhum turno Kaizen encontrado para a semana selecionada${filterSuffix}.`;
      }
      return `Nenhum turno Kaizen encontrado para o mês selecionado${filterSuffix}.`;
    },
  },
  mounted() {
    this.loadHistory();
    this.loadStartCharts();
    this.broadcastSyncMonitor();
  },
  beforeUnmount() {
    this.stopSyncTimer();
    this.stopSyncPolling();
  },
  methods: {
    async parseApiResponse(response) {
      const rawText = await response.text();
      if (!rawText) return {};

      try {
        return JSON.parse(rawText);
      } catch {
        throw new Error(rawText.includes('<!DOCTYPE') || rawText.includes('<html')
          ? 'A API Kaizen não respondeu em JSON. Verifique se o servidor local está com as rotas /api habilitadas.'
          : rawText);
      }
    },
    formatDate(value) {
      if (!value) return '--/--/----';
      const normalizedValue = String(value).includes('T') ? value : `${value}T12:00:00`;
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(normalizedValue));
    },
    formatDateTime(value) {
      if (!value) return '--';
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value));
    },
    formatTime(value) {
      if (!value) return '--:--:--';
      return new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(value));
    },
    triggerDownload(dataUrl, filename) {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      link.click();
    },
    getChartExportConfig(chartType) {
      if (chartType === 'monthly') {
        return {
          refName: 'monthlyChartCard',
          filenameBase: `kaizen-inicio-turno-mensal-${this.selectedMonth}`,
          title: 'Kaizen Bot - Inicio de turno mensal',
          subtitle: this.monthlyChartTitle,
          infoLine: this.monthlyChartInfoLine,
        };
      }

      return {
        refName: 'weeklyChartCard',
        filenameBase: `kaizen-inicio-turno-semanal-${this.selectedWeekDate}`,
        title: 'Kaizen Bot - Inicio de turno semanal',
        subtitle: this.weeklyChartTitle,
        infoLine: this.weeklyChartInfoLine,
      };
    },
    async exportChartImage(chartType) {
      const config = this.getChartExportConfig(chartType);
      const target = this.$refs[config.refName];
      if (!target) {
        this.errorMessage = 'Nao foi possivel localizar o grafico para exportacao.';
        return;
      }

      this.exportingChart = chartType;
      try {
        const dataUrl = await captureElementAsPng(target, {
          backgroundColor: '#0b1422',
          pixelRatio: 2,
        });
        this.triggerDownload(dataUrl, `${config.filenameBase}.png`);
        this.successMessage = 'Imagem do grafico gerada com sucesso.';
      } catch (error) {
        this.errorMessage = error.message || 'Falha ao gerar a imagem do grafico.';
      } finally {
        this.exportingChart = '';
      }
    },
    async exportChartPdf(chartType) {
      const config = this.getChartExportConfig(chartType);
      const target = this.$refs[config.refName];
      if (!target) {
        this.errorMessage = 'Nao foi possivel localizar o grafico para exportacao.';
        return;
      }

      this.exportingChart = chartType;
      try {
        const dataUrl = await captureElementAsPng(target, {
          backgroundColor: '#0b1422',
          pixelRatio: 2,
        });
        await saveChartPdf({
          dataUrl,
          filename: `${config.filenameBase}.pdf`,
          title: config.title,
          subtitle: config.subtitle,
          infoLine: config.infoLine,
        });
        this.successMessage = 'PDF do grafico gerado com sucesso.';
      } catch (error) {
        this.errorMessage = error.message || 'Falha ao gerar o PDF do grafico.';
      } finally {
        this.exportingChart = '';
      }
    },
    handleHistoryReferenceChange() {
      this.loadHistory();
      if (this.selectedPeriod === 'month') {
        this.loadMonthlyStartChart();
        return;
      }
      this.loadWeeklyStartChart();
    },
    handleWeekChartDateChange() {
      this.loadWeeklyStartChart();
    },
    handleMonthChartDateChange() {
      this.loadMonthlyStartChart();
    },
    startSyncTimer() {
      this.stopSyncTimer();
      this.syncStartedAt = Date.now();
      this.syncElapsedSeconds = 0;
      this.syncTimerId = window.setInterval(() => {
        this.syncElapsedSeconds = Math.floor((Date.now() - this.syncStartedAt) / 1000);
      }, 1000);
    },
    stopSyncTimer() {
      if (this.syncTimerId) {
        window.clearInterval(this.syncTimerId);
        this.syncTimerId = null;
      }
    },
    buildSyncMonitorPayload() {
      return {
        syncing: this.syncing,
        status: this.syncStatus,
        jobId: this.syncJobId,
        progressPercentage: this.syncProgressPercentage,
        processedDates: this.syncProcessedDates,
        totalDates: this.syncTotalDates,
        currentDate: this.syncCurrentDate,
        currentMessage: this.syncCurrentMessage,
        startedAt: this.syncStartedAt,
        finishedAt: this.syncFinishedAt,
        logs: this.syncLogs,
      };
    },
    broadcastSyncMonitor() {
      window.dispatchEvent(new CustomEvent('kaizen-sync-monitor', {
        detail: this.buildSyncMonitorPayload(),
      }));
    },
    stopSyncPolling() {
      if (this.syncPollId) {
        window.clearInterval(this.syncPollId);
        this.syncPollId = null;
      }
    },
    applySyncJobState(job = {}) {
      this.syncJobId = job.jobId || this.syncJobId;
      this.syncStatus = job.status || '';
      this.syncProgressPercentage = Math.max(0, Math.min(100, Number(job.progressPercentage || 0)));
      this.syncProcessedDates = Number(job.processedDates || 0);
      this.syncTotalDates = Number(job.totalDates || 0);
      this.syncCurrentDate = job.currentDate || '';
      this.syncCurrentMessage = job.currentMessage || 'Aguardando sincronização.';
      this.syncLogs = Array.isArray(job.logs) ? job.logs : [];
      this.syncFinishedAt = job.finishedAt || null;
      this.warningMessage = job.warning || this.warningMessage;
      this.broadcastSyncMonitor();
    },
    startSyncPolling(jobId) {
      this.stopSyncPolling();
      this.syncPollId = window.setInterval(() => {
        this.pollSyncStatus(jobId);
      }, 1500);
    },
    async pollSyncStatus(jobId) {
      try {
        const response = await fetch(`/api/kaizen-sync?jobId=${encodeURIComponent(jobId)}`, {
          cache: 'no-store',
        });
        const payload = await this.parseApiResponse(response);
        if (!response.ok) {
          throw new Error(payload.detail || payload.error || 'Falha ao consultar o andamento da sincronização Kaizen.');
        }

        const job = payload.job || {};
        this.applySyncJobState(job);

        if (job.status === 'completed') {
          this.stopSyncPolling();
          this.syncing = false;
          this.syncFinishedAt = job.finishedAt || Date.now();
          this.stopSyncTimer();
          const result = job.result || {};
          const extracted = Number(result.recordsCount || 0);
          const syncedRange = result.startDate && result.endDate
            ? `${this.formatDate(result.startDate)} até ${this.formatDate(result.endDate)}`
            : this.formatDate(result.referenceDate || this.syncEndDate);
          this.successMessage = extracted > 0
            ? `Sincronização concluída com ${extracted} equipes entre ${syncedRange}.`
            : `Exportação concluída para ${syncedRange}, mas o relatório atual não trouxe IDs de equipes reconhecíveis para extração automática.`;
          this.warningMessage = result.warning || job.warning || '';
          this.selectedWeekDate = this.syncEndDate;
          this.selectedMonth = this.syncEndDate.slice(0, 7);
          await this.loadHistory({ preserveMessages: true });
          await this.loadStartCharts();
          this.broadcastSyncMonitor();
          return;
        }

        if (job.status === 'failed') {
          this.stopSyncPolling();
          this.syncing = false;
          this.syncFinishedAt = job.finishedAt || Date.now();
          this.stopSyncTimer();
          this.errorMessage = job.error || 'Falha ao sincronizar o Kaizen.';
          this.broadcastSyncMonitor();
        }
      } catch (error) {
        this.stopSyncPolling();
        this.syncing = false;
        this.syncFinishedAt = Date.now();
        this.stopSyncTimer();
        this.errorMessage = error.message || 'Falha ao consultar o andamento da sincronização Kaizen.';
        this.broadcastSyncMonitor();
      }
    },
    changeBaseFilter(filter) {
      this.selectedBaseFilter = filter;
    },
    changePeriod(period) {
      if (this.selectedPeriod === period) return;
      this.selectedPeriod = period;
      this.loadHistory();
    },
    async loadHistory(options = {}) {
      const preserveMessages = Boolean(options.preserveMessages);
      this.loading = true;
      if (!preserveMessages) {
        this.errorMessage = '';
        this.successMessage = '';
        this.warningMessage = '';
      }
      try {
        const query = new URLSearchParams({
          date: this.historyReferenceDate,
          period: this.selectedPeriod,
        });

        const response = await fetch(`/api/get-kaizen-history?${query.toString()}`, {
          cache: 'no-store',
        });
        const payload = await this.parseApiResponse(response);
        if (!response.ok) {
          throw new Error(payload.detail || payload.error || 'Falha ao carregar histórico Kaizen.');
        }
        this.entries = payload.entries || [];
        this.runs = payload.runs || [];
        this.range = payload.range || null;
        this.warningMessage = payload.warning || '';
      } catch (error) {
        this.entries = [];
        this.runs = [];
        this.range = null;
        this.errorMessage = error.message || 'Falha ao carregar histórico Kaizen.';
      } finally {
        this.loading = false;
      }
    },
    buildStartChartOptions(chartModel, title) {
      const categories = chartModel?.categories || [];
      const averageMinutes = Number.isFinite(chartModel?.averageMinutes) ? chartModel.averageMinutes : null;
      const onTimeLimitMinutes = 8 * 60;
      return {
        chart: {
          type: 'heatmap',
          toolbar: {
            show: true,
            tools: {
              download: true,
              selection: false,
              zoom: false,
              zoomin: false,
              zoomout: false,
              pan: false,
              reset: false,
            },
          },
          foreColor: '#cfe4ff',
        },
        plotOptions: {
          heatmap: {
            shadeIntensity: 0.35,
            radius: 6,
            enableShades: false,
            colorScale: {
              ranges: [
                { from: 0, to: onTimeLimitMinutes, name: 'No horário', color: '#84cc16' },
                { from: onTimeLimitMinutes + 1, to: 1440, name: 'Atrasado', color: '#ef4444' },
              ],
            },
          },
        },
        dataLabels: {
          enabled: true,
          formatter: (value) => (Number.isFinite(value) ? formatMinutesToTimeLabel(value) : ''),
          style: {
            colors: ['#f8fbff'],
            fontSize: '11px',
            fontWeight: 700,
          },
          background: {
            enabled: false,
          },
        },
        legend: {
          show: false,
          labels: {
            colors: '#cfe4ff',
          },
        },
        grid: {
          borderColor: 'rgba(255, 255, 255, 0.08)',
          padding: {
            left: 8,
            right: 18,
            bottom: 12,
          },
        },
        xaxis: {
          type: 'category',
          categories,
          labels: {
            rotate: -35,
            style: {
              colors: '#9db4d1',
            },
            formatter: (value) => this.formatDate(value),
          },
          axisBorder: {
            color: 'rgba(255, 255, 255, 0.08)',
          },
          axisTicks: {
            color: 'rgba(255, 255, 255, 0.08)',
          },
        },
        yaxis: {
          labels: {
            style: {
              colors: '#9db4d1',
            },
            maxWidth: 220,
          },
          title: {
            text: 'Equipe',
            style: {
              color: '#cfe4ff',
            },
          },
        },
        tooltip: {
          theme: 'dark',
          custom: ({ seriesIndex, dataPointIndex, w }) => {
            const point = w.config.series?.[seriesIndex]?.data?.[dataPointIndex];
            const team = w.config.series?.[seriesIndex]?.name || 'Equipe';
            const date = point?.x ? this.formatDate(point.x) : '--/--/----';
            const value = Number.isFinite(point?.y) ? formatMinutesToTimeLabel(point.y) : 'Sem registro';
            const averageLabel = averageMinutes !== null ? formatMinutesToTimeLabel(averageMinutes) : '--:--';
            const statusLabel = Number.isFinite(point?.y)
              ? (point.y <= onTimeLimitMinutes ? 'No horário' : 'Atrasado')
              : 'Sem registro';
            return `<div class="kaizen-tooltip"><strong>${team}</strong><span>${date}</span><p>Início: ${value}</p><small>Status: ${statusLabel}</small><small>Média do período: ${averageLabel}</small></div>`;
          },
        },
        noData: {
          text: 'Nenhum início de turno encontrado para este período.',
          align: 'center',
          verticalAlign: 'middle',
          style: {
            color: '#9db4d1',
          },
        },
        title: {
          text: title,
          align: 'left',
          style: {
            color: '#f5fbff',
            fontSize: '14px',
            fontWeight: 700,
          },
        },
      };
    },
    async fetchHistoryByPeriod(referenceDate, period) {
      const query = new URLSearchParams({
        date: referenceDate,
        period,
        limit: '400',
      });
      const response = await fetch(`/api/get-kaizen-history?${query.toString()}`, {
        cache: 'no-store',
      });
      const payload = await this.parseApiResponse(response);
      if (!response.ok) {
        throw new Error(payload.detail || payload.error || 'Falha ao carregar dados do gráfico Kaizen.');
      }
      return payload;
    },
    async loadWeeklyStartChart() {
      const payload = await this.fetchHistoryByPeriod(this.selectedWeekDate, 'week');
      this.weeklyChartEntries = payload.entries || [];
      this.weeklyChartRange = payload.range || null;
    },
    async loadMonthlyStartChart() {
      const payload = await this.fetchHistoryByPeriod(`${this.selectedMonth}-01`, 'month');
      this.monthlyChartEntries = payload.entries || [];
      this.monthlyChartRange = payload.range || null;
    },
    async loadStartCharts() {
      this.chartLoading = true;
      try {
        await Promise.all([
          this.loadWeeklyStartChart(),
          this.loadMonthlyStartChart(),
        ]);
      } catch (error) {
        this.errorMessage = error.message || 'Falha ao carregar os gráficos de início de turno.';
      } finally {
        this.chartLoading = false;
      }
    },
    async syncNow() {
      this.errorMessage = '';
      this.successMessage = '';
      this.warningMessage = '';
      try {
        if (this.syncStartDate > this.syncEndDate) {
          throw new Error('A data inicial do sync deve ser menor ou igual à data final.');
        }

        this.syncing = true;
        this.syncStatus = 'queued';
        this.syncLogs = [];
        this.syncProgressPercentage = 0;
        this.syncProcessedDates = 0;
        this.syncTotalDates = 0;
        this.syncCurrentDate = this.syncStartDate;
        this.syncCurrentMessage = 'Solicitando início da sincronização.';
        this.syncFinishedAt = null;
        this.startSyncTimer();
        this.broadcastSyncMonitor();

        const response = await fetch('/api/kaizen-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate: this.syncStartDate,
            endDate: this.syncEndDate,
            async: true,
          }),
        });
        const payload = await this.parseApiResponse(response);
        if (!response.ok) {
          throw new Error(payload.detail || payload.error || 'Falha ao sincronizar o Kaizen.');
        }

        if (!payload.job || !payload.job.jobId) {
          throw new Error('A API Kaizen não retornou um identificador de job para acompanhar a sincronização.');
        }

        this.applySyncJobState(payload.job);
        this.successMessage = payload.message || 'Sincronização Kaizen iniciada.';
        this.broadcastSyncMonitor();
        await this.pollSyncStatus(payload.job.jobId);
        if (this.syncing) {
          this.startSyncPolling(payload.job.jobId);
        }
      } catch (error) {
        this.errorMessage = error.message || 'Falha ao sincronizar o Kaizen.';
        this.syncing = false;
        this.syncFinishedAt = Date.now();
        this.stopSyncTimer();
        this.stopSyncPolling();
        this.broadcastSyncMonitor();
      }
    },
  },
};
</script>

<style scoped>
.kaizen-page {
  padding: 1.5rem 1.5rem 2rem;
  display: grid;
  gap: 1.4rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-end;
  flex-wrap: wrap;
}

.page-header__eyebrow,
.card-tag {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.72rem;
  font-weight: 700;
  color: #9bd9ff;
  background: rgba(31, 110, 164, 0.14);
}

.page-header h1 {
  margin: 0.7rem 0 0;
  font-size: clamp(2.4rem, 5vw, 4.8rem);
  line-height: 0.94;
  color: var(--text);
}

.page-header p {
  margin: 0.9rem 0 0;
  max-width: 62rem;
  color: var(--text-soft);
  line-height: 1.6;
}

.page-header__actions {
  display: flex;
  gap: 0.85rem;
  flex-wrap: wrap;
  align-items: end;
}

.field-inline {
  display: grid;
  gap: 0.4rem;
  color: var(--text-soft);
  font-size: 0.82rem;
}

.field-inline--period {
  min-width: 250px;
}

.segmented-control {
  display: inline-grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.35rem;
  padding: 0.3rem;
  border-radius: 16px;
  background: rgba(10, 18, 33, 0.68);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.segment-btn {
  min-height: 42px;
  padding: 0.6rem 0.85rem;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: var(--text-soft);
  font-weight: 700;
  cursor: pointer;
}

.segment-btn--active {
  background: linear-gradient(135deg, rgba(31, 208, 255, 0.2), rgba(47, 109, 246, 0.28));
  color: var(--text);
}

.field-inline input {
  min-width: 180px;
  padding: 0.78rem 0.95rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(10, 18, 33, 0.68);
  color: var(--text);
}

.primary-btn,
.ghost-btn {
  min-height: 48px;
  border-radius: 14px;
  padding: 0.8rem 1rem;
  font-weight: 700;
  cursor: pointer;
}

.primary-btn {
  border: none;
  background: linear-gradient(135deg, #1fd0ff, #2f6df6);
  color: #06111f;
}

.ghost-btn {
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: var(--text);
}

.primary-btn:disabled,
.ghost-btn:disabled {
  opacity: 0.6;
  cursor: wait;
}

.sync-status-panel {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  min-width: 280px;
  padding: 0.7rem 0.95rem;
  border-radius: 14px;
  background: rgba(10, 18, 33, 0.68);
  border: 1px solid rgba(31, 208, 255, 0.18);
  color: var(--text);
}

.sync-status-panel__body {
  min-width: 220px;
}

.sync-status-panel strong {
  display: block;
  font-size: 0.88rem;
}

.sync-status-panel p {
  margin: 0.18rem 0 0;
  font-size: 0.8rem;
  color: var(--text-soft);
}

.sync-status-panel small {
  display: block;
  margin-top: 0.45rem;
  color: #9bd9ff;
  font-size: 0.78rem;
}

.sync-progress {
  margin-top: 0.6rem;
  width: 100%;
  height: 10px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
}

.sync-progress__bar {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #1fd0ff, #2f6df6);
  transition: width 0.35s ease;
}

.sync-status-panel__dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #1fd0ff;
  box-shadow: 0 0 0 rgba(31, 208, 255, 0.45);
  animation: sync-pulse 1.4s ease-in-out infinite;
}

@keyframes sync-pulse {
  0% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(31, 208, 255, 0.35);
  }

  70% {
    transform: scale(1);
    box-shadow: 0 0 0 10px rgba(31, 208, 255, 0);
  }

  100% {
    transform: scale(0.95);
    box-shadow: 0 0 0 0 rgba(31, 208, 255, 0);
  }
}

.section-head__meta {
  margin: 0.35rem 0 0;
  color: var(--text-soft);
  font-size: 0.92rem;
}

.kaizen-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.kaizen-chart-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1rem;
}

.kaizen-card {
  padding: 1.25rem;
  border-radius: 24px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.015)),
    var(--surface-overlay);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: var(--shadow-soft);
}

.kaizen-card--hero {
  background:
    radial-gradient(circle at top right, rgba(33, 208, 255, 0.12), transparent 30%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.015)),
    var(--surface-overlay);
}

.kaizen-card--summary {
  display: grid;
  align-content: start;
}

.kaizen-card--chart {
  display: grid;
  gap: 1rem;
}

.kaizen-card--chart-spotlight {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at top right, rgba(31, 208, 255, 0.12), transparent 28%),
    radial-gradient(circle at left center, rgba(132, 204, 22, 0.08), transparent 24%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.04), rgba(255, 255, 255, 0.015)),
    var(--surface-overlay);
}

.kaizen-card--chart-spotlight::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), transparent 30%, transparent 70%, rgba(255, 255, 255, 0.03));
}

.kaizen-card--wide {
  padding: 1.3rem;
}

.kaizen-card h2,
.kaizen-card h3 {
  margin: 0.8rem 0 0;
  color: var(--text);
}

.kaizen-card p {
  margin: 0.75rem 0 0;
  color: var(--text-soft);
  line-height: 1.6;
}

.base-summary-grid {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.base-summary-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.9rem 1rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.base-summary-item strong {
  color: var(--text);
  font-size: 0.95rem;
}

.base-summary-item span {
  min-width: 2.5rem;
  text-align: center;
  padding: 0.35rem 0.55rem;
  border-radius: 999px;
  background: rgba(31, 208, 255, 0.12);
  color: #9bd9ff;
  font-weight: 700;
}

.card-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 1rem;
}

.pill {
  padding: 0.42rem 0.75rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  color: var(--text);
  font-size: 0.82rem;
}

.kaizen-checklist {
  margin: 0.8rem 0 0;
  padding-left: 1rem;
  color: var(--text-soft);
  display: grid;
  gap: 0.55rem;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.section-head--chart {
  align-items: start;
}

.chart-head-actions {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
  align-items: end;
}

.section-head__actions {
  display: flex;
  gap: 0.85rem;
  flex-wrap: wrap;
  align-items: end;
}

.field-inline--chart-filter {
  min-width: 220px;
}

.chart-stat-grid {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 0.75rem;
}

.chart-stat-card {
  display: grid;
  gap: 0.28rem;
  padding: 0.9rem 1rem;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.03));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.chart-stat-card strong {
  color: var(--text);
  font-size: 1.02rem;
}

.chart-stat-card span {
  color: var(--text-soft);
  font-size: 0.78rem;
}

.chart-shell {
  min-height: 420px;
  padding: 0.8rem 0.85rem 0.45rem;
  border-radius: 22px;
  background: rgba(7, 16, 29, 0.62);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(10px);
}

.chart-export-actions {
  display: flex;
  gap: 0.55rem;
}

.chart-export-btn {
  min-height: 44px;
  padding: 0.72rem 0.95rem;
  border-radius: 14px;
  border: 1px solid rgba(31, 208, 255, 0.24);
  background: linear-gradient(135deg, rgba(31, 208, 255, 0.16), rgba(47, 109, 246, 0.2));
  color: #f5fbff;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.chart-export-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(31, 208, 255, 0.44);
}

.chart-export-btn:disabled {
  opacity: 0.65;
  cursor: wait;
}

.chart-export-btn--secondary {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.05);
}

.chart-band-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.55rem;
}

.chart-band {
  display: inline-flex;
  align-items: center;
  min-height: 32px;
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  color: #f8fbff;
  font-size: 0.75rem;
  font-weight: 700;
}

.chart-band--on-time { background: #84cc16; color: #10230b; }
.chart-band--late { background: #ef4444; color: #fff7f7; }
.field-inline--base-filter {
  min-width: 420px;
}
.segmented-control--base-filter {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.state-message {
  margin: 1rem 0 0;
  padding: 0.85rem 1rem;
  border-radius: 14px;
}

.state-message--error {
  color: #ffd7d7;
  background: rgba(139, 24, 24, 0.22);
}

.state-message--success {
  color: #dfffea;
  background: rgba(23, 95, 58, 0.22);
}

.state-message--warning {
  color: #fff0c7;
  background: rgba(133, 92, 12, 0.22);
}

.sync-log-card {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 18px;
  background: rgba(10, 18, 33, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.sync-log-card__head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  margin-bottom: 0.85rem;
}

.sync-log-card__head strong {
  color: var(--text);
}

.sync-log-card__head span {
  color: var(--text-soft);
  font-size: 0.84rem;
}

.sync-log-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.55rem;
}

.sync-log-list__item {
  display: grid;
  grid-template-columns: 84px 1fr;
  gap: 0.75rem;
  align-items: start;
  padding: 0.72rem 0.8rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.03);
}

.sync-log-list__item span {
  color: #9bd9ff;
  font-size: 0.78rem;
  font-weight: 700;
}

.sync-log-list__item p {
  margin: 0;
  color: var(--text-soft);
  font-size: 0.88rem;
  line-height: 1.45;
}

.sync-log-list__item--error {
  border: 1px solid rgba(184, 54, 54, 0.35);
}

.sync-log-list__item--warning {
  border: 1px solid rgba(181, 143, 47, 0.35);
}

:global(.apexcharts-canvas) {
  font-family: inherit;
}

:global(.apexcharts-heatmap-series rect:hover) {
  filter: brightness(1.05);
}

:global(.apexcharts-tooltip.apexcharts-theme-dark) {
  background: rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 32px rgba(2, 6, 23, 0.26);
}

:global(.apexcharts-tooltip-title) {
  background: rgba(255, 255, 255, 0.04) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
}

:global(.apexcharts-heatmap-rect) {
  stroke: rgba(255, 255, 255, 0.18);
  stroke-width: 1px;
}

:global(.apexcharts-data-labels text) {
  paint-order: stroke;
  stroke: rgba(15, 23, 42, 0.45);
  stroke-width: 2px;
}

:global(.kaizen-tooltip) {
  display: grid;
  gap: 0.3rem;
  min-width: 160px;
  padding: 0.2rem;
}

:global(.kaizen-tooltip strong) {
  color: #f8fbff;
}

:global(.kaizen-tooltip span),
:global(.kaizen-tooltip small) {
  color: #b9cbe3;
}

:global(.kaizen-tooltip p) {
  margin: 0;
  color: #f8fbff;
}

@media (max-width: 1180px) {
  .kaizen-grid,
  .kaizen-chart-grid {
    grid-template-columns: 1fr;
  }

  .chart-stat-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .field-inline--base-filter,
  .field-inline--chart-filter {
    min-width: 100%;
  }

  .chart-head-actions,
  .chart-export-actions {
    width: 100%;
  }

  .chart-export-btn {
    flex: 1;
  }

  .chart-stat-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .chart-shell {
    min-height: 300px;
  }
}

.table-shell {
  margin-top: 1rem;
  overflow: auto;
}

.kaizen-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 760px;
}

.kaizen-table th,
.kaizen-table td {
  padding: 0.9rem 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  text-align: left;
}

.kaizen-table th {
  color: var(--text-soft);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.kaizen-table td {
  color: var(--text);
}

.empty-state {
  text-align: center;
  color: var(--text-soft);
}

@media (max-width: 1080px) {
  .kaizen-grid {
    grid-template-columns: 1fr;
  }
  .field-inline--base-filter {
    min-width: 100%;
  }
  .segmented-control--base-filter {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .kaizen-page {
    padding: 1rem 1rem 1.5rem;
  }

  .page-header h1 {
    font-size: clamp(2rem, 10vw, 3.2rem);
  }

  .field-inline,
  .field-inline input,
  .primary-btn,
  .ghost-btn {
    width: 100%;
  }
}
</style>
