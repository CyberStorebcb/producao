<template>
  <section class="menu-hero">
    <div class="matrix">
      <header class="hero-head">
        <div class="hero-copy">
          <p class="eyebrow">Operação Centro</p>
          <h1>Lobby Operacional</h1>
          <p class="subtext">Painel de acompanhamento em tempo real do turno.</p>
        </div>
        <div class="hero-actions">
          <button class="live-pill">
            <i class="bi bi-broadcast-pin" aria-hidden="true"></i>
            <span>AO VIVO</span>
          </button>
          <button class="mini-cta" @click="$emit('select','programacao')">
            Agenda
            <i class="bi bi-arrow-up-right"></i>
          </button>
          <button class="mini-cta" :disabled="sheetUpdating" @click="updateFromSheets">
            <span v-if="!sheetUpdating">Atualizar dados</span>
            <span v-else>Atualizando...</span>
            <i class="bi bi-arrow-repeat"></i>
          </button>
        </div>
      </header>

      <div class="info-belt">
        <template v-for="(card, idx) in statusCards" :key="card.id">  
          <article v-if="card.id === 'window'" class="info-card janela-card">
            <div class="janela-header">
              <p>{{ card.label }}</p>
              <i class="bi bi-clock-history janela-ico"></i>
            </div>
            <div class="janela-main">
              <span class="janela-horas">{{ card.value }}</span>
              <span class="janela-descanso">{{ card.meta }}</span>
            </div>
          </article>
          <article v-else-if="card.id === 'status'" class="info-card status-card">
            <div class="status-header">
              <p>{{ card.label }}</p>
              <i class="bi bi-patch-check-fill status-ico"></i>
            </div>
            <div class="status-main">
              <span class="status-value">{{ card.value }}</span>
              <span class="status-meta">{{ card.meta }}</span>
            </div>
          </article>
          <article v-else-if="card.id === 'routes'" class="info-card rotas-card">
            <div class="rotas-header">
              <p>{{ card.label }}</p>
              <i class="bi bi-geo-alt-fill rotas-ico"></i>
            </div>
            <div class="rotas-main">
              <span class="rotas-value">{{ card.value }}</span>
              <span class="rotas-meta">{{ card.meta }}</span>
            </div>
          </article>
          <article v-else class="info-card">
            <p>{{ card.label }}</p>
            <strong>{{ card.value }}</strong>
            <span>{{ card.meta }}</span>
          </article>
          <!-- Após o primeiro card, insere o card de clima como um card separado -->
          <template v-if="idx === 0 && weather">
            <article class="info-card weather-card">
              <div class="weather-header">
                <span class="weather-city">Bacabal-MA</span>
                <img :src="weather.iconUrl" :alt="weather.description" v-if="weather.iconUrl" class="weather-icon-big" />
              </div>
              <div class="weather-main">
                <span class="weather-temp">{{ weather.temp }}°C</span>
                <span class="weather-desc">{{ weather.description }}</span>
              </div>
            </article>
          </template>
        </template>
      </div>

      <div class="canvas-grid">
        <section class="tile tile-flow">
          <div class="tile-head">
            <h2>Fluxo</h2>
            <div class="flow-head-actions">
              <label class="hero-date-control flow-date-control">
                <span>Data da produção</span>
                <select v-model="selectedDateKey" :disabled="productionLoading || !dateFilterOptions.length">
                  <option v-if="!dateFilterOptions.length" value="">Sem dados</option>
                  <option v-for="date in dateFilterOptions" :key="date.key" :value="date.key">
                    {{ date.label }}
                  </option>
                </select>
              </label>
              <button class="chip" @click="$emit('select','equipes')">
                Equipes
                <i class="bi bi-arrow-up-right"></i>
              </button>
            </div>
          </div>
          <div class="flow-stats">
            <div
              v-for="stat in flowStats"
              :key="stat.id"
              :class="['flow-card', stat.id === 'prod' ? 'producao-card' : '', `flow-${stat.id}`]"
            >
              <div class="flow-card-top">
                <p>{{ stat.label }}</p>
                <i :class="['bi', getFlowIcon(stat.id), 'flow-icon']"></i>
              </div>

              <div class="flow-value-row">
                <strong>{{ displayFlowValue(stat) }}</strong>
                <span
                  v-if="stat.trend"
                  :class="['trend-pill', isNegativeTrend(stat.trend) ? 'down' : 'up']"
                >
                  {{ stat.trend }}
                </span>
              </div>

              <small>{{ stat.hint }}</small>

              <div class="flow-progress" role="presentation" aria-hidden="true">
                <span :style="{ width: `${getFlowProgress(stat)}%` }"></span>
              </div>
            </div>
          </div>
        </section>

        <section class="tile tile-timeline">
          <div class="tile-head">
            <h3>Top oportunidades</h3>
            <span class="tile-note">{{ topOpportunitiesNote }}</span>
          </div>
          <ul class="timeline" role="list">
            <li v-for="item in topOpportunityItems" :key="item.id">
              <span class="time">{{ item.time }}</span>
              <div class="timeline-copy">
                <p>{{ item.title }}</p>
                <small :class="item.status">{{ item.statusLabel }}</small>
              </div>
              <button class="bare" :aria-label="`Abrir ${item.title}`" @click="$emit('select', item.target)">
                <i class="bi bi-arrow-up-right"></i>
              </button>
            </li>
          </ul>
        </section>

        <!-- tile 'Alertas' (zones) removed as requested -->

        <section class="tile tile-alerts">
          <div class="tile-head">
            <div class="alerts-head-copy">
              <h3>Alertas</h3>
              <small>{{ selectedDateLabel }} · 3 equipes abaixo da meta</small>
            </div>
            <button class="chip" @click="$emit('select','producao')">
              Ver tudo
              <i class="bi bi-clipboard-data"></i>
            </button>
          </div>
          <ul class="alerts" role="list">
            <li v-for="(team, index) in lowestTeams" :key="team.code" :class="['alert-card', 'static', teamPerformanceBand(team)]">
              <div class="alert-rank">{{ index + 1 }}</div>
              <div class="alert-card-copy">
                <div class="alert-card-topline">
                  <p class="alert-title">{{ team.display }}</p>
                  <span class="alert-pill" :class="teamPerformanceBand(team)">{{ teamPerformanceLabel(team) }}</span>
                </div>
                <small class="alert-meta">{{ Math.round((team.__ratio || 0) * 100) }}% da meta · R$ {{ formatCurrency(team.selectedValue) }}</small>
                <div class="alert-progress" aria-hidden="true">
                  <span :style="{ width: `${teamProgressPercent(team)}%` }"></span>
                </div>
                <div class="alert-footer">
                  <small>{{ performanceHelperText(team) }}</small>
                  <span class="alert-target">Meta R$ {{ formatCurrency(team.__target || 0) }}</span>
                </div>
              </div>
              <div class="alert-card-right">
                <span :class="['alert-signal', teamPerformanceBand(team)]">
                  <i :class="['bi', teamPerformanceIcon(team)]"></i>
                </span>
              </div>
            </li>
          </ul>
        </section>
      </div>

      <div class="quick-strip">
        <button v-for="action in quickActions" :key="action.id" class="quick-pill" @click="$emit('select', action.target)" :aria-label="action.label">
          <i :class="['bi', action.icon]"></i>
          <span>{{ action.label }}</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script>
const SOURCE_SHEETS = ['OBRAS', 'EME', 'CUSTEIO'];
const ALL_DATES_KEY = '__ALL_DATES__';
const DAILY_PRODUCTIVE_HOURS = 9;
const DEFAULT_TEAM_DAILY_TARGET = 9752.47;
const TEAM_DAILY_TARGET_OVERRIDES = {
  'MA-BCB-T001M': 3258.83,
};

const dateLabelFormatter = new Intl.DateTimeFormat('pt-BR', {
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

function formatDateLabel(dateKey) {
  if (!dateKey) return '—';
  const date = new Date(`${dateKey}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return dateLabelFormatter.format(date);
}

function mergeNormalizedSheets(results) {
  const dateMap = new Map();
  const teamMap = new Map();
  const sourceSheets = [];
  const totals = {
    skippedRows: 0,
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
        plate: team.plate || '',
        valuesByDate: {},
        sourceSheets: [],
      };

      if (!existing.sourceSheets.includes(sheetName)) existing.sourceSheets.push(sheetName);
      if (!existing.plate && team.plate) existing.plate = team.plate;

      Object.entries(team.valuesByDate || {}).forEach(([dateKey, value]) => {
        existing.valuesByDate[dateKey] = Number(((Number(existing.valuesByDate[dateKey]) || 0) + (Number(value) || 0)).toFixed(2));
      });

      teamMap.set(team.code, existing);
    });

    totals.skippedRows += Number(normalized.summary?.skippedRows) || 0;
    totals.totalImportedValue = Number((totals.totalImportedValue + (Number(normalized.summary?.totalImportedValue) || 0)).toFixed(2));
  });

  const dates = Array.from(dateMap.values()).sort((left, right) => left.key.localeCompare(right.key));
  const teams = Array.from(teamMap.values()).sort((left, right) => left.display.localeCompare(right.display));

  return {
    dates,
    teams,
    summary: {
      sourceSheets,
      skippedRows: totals.skippedRows,
      totalImportedValue: totals.totalImportedValue,
      teamCount: teams.length,
      dateCount: dates.length,
      firstDateKey: dates.length ? dates[0].key : '',
      lastDateKey: dates.length ? dates[dates.length - 1].key : '',
    },
  };
}

export default {
  name: 'MenuHero',
  data() {
    return {
      topOpportunities: [],
      topOpportunitiesLoading: false,
      topOpportunitiesError: '',
      zones: [
        { id: 'zona-a', label: 'Zona Azul', window: '08h-12h', load: '85% carga', crew: '3 eqp', risk: 'low', riskLabel: 'Estável' },
        { id: 'zona-b', label: 'Corredor Leste', window: '09h-14h', load: '112% carga', crew: '4 eqp', risk: 'med', riskLabel: 'Atenção' },
        { id: 'zona-c', label: 'Anel Sul', window: '10h-18h', load: '74% carga', crew: '2 eqp', risk: 'low', riskLabel: 'Controlado' },
        { id: 'zona-d', label: 'Setor Industrial', window: '11h-17h', load: '129% carga', crew: '3 eqp', risk: 'high', riskLabel: 'Crítico' }
      ],
      alerts: [
        { id: 'alert-1', title: 'Rota 4 +17 min', meta: 'Equipe Delta', severity: 'warn', severityLabel: 'Atenção', target: 'equipes' },
        { id: 'alert-2', title: 'Backlog industrial', meta: '+6 ordens · Setor 7', severity: 'crit', severityLabel: 'Crítico', target: 'producao' },
        { id: 'alert-3', title: 'Chuva leve prevista', meta: '13h15 · 60%', severity: 'info', severityLabel: 'Monitorar', target: 'programacao' }
      ],
      quickActions: [
        { id: 'prod', label: 'Prod', icon: 'bi-graph-up-arrow', target: 'producao' },
        { id: 'prog', label: 'Prog', icon: 'bi-kanban', target: 'programacao' },
        { id: 'eqp', label: 'Eqp', icon: 'bi-people', target: 'equipes' }
      ],
      weather: null,
      weatherQuery: 'Bacabal,MA',
      weatherTimer: null,
      sheetUpdating: false,
      sheetUpdateStatus: null,
      lastSheetUpdateAt: null,
      weatherError: null,
      productionLoading: false,
      productionError: '',
      availableDates: [],
      selectedDateKey: '',
      teamRows: [],
      importSummary: {},
      productionOrigin: '—',
      productionGeneratedAt: '',
    };
  },
  computed: {
    dateFilterOptions() {
      return [
        { key: ALL_DATES_KEY, label: 'Todas as datas' },
        ...[...this.availableDates].reverse(),
      ];
    },
    isAllDatesSelected() {
      return this.selectedDateKey === ALL_DATES_KEY;
    },
    selectedProductionDate() {
      if (this.isAllDatesSelected) return null;
      return this.availableDates.find((item) => item.key === this.selectedDateKey) || null;
    },
    lastAvailableDate() {
      return this.availableDates.length ? this.availableDates[this.availableDates.length - 1] : null;
    },
    selectedDateLabel() {
      if (this.isAllDatesSelected) return 'Todas as datas';
      return this.selectedProductionDate?.label || 'Sem data';
    },
    selectedTeamsSnapshot() {
      if (!this.selectedDateKey) return [];
      return this.teamRows
        .map((team) => ({
          ...team,
          selectedValue: this.isAllDatesSelected ? this.teamTotal(team) : this.valueFor(team, this.selectedDateKey),
        }))
        .filter((team) => team.selectedValue > 0)
        .sort((left, right) => right.selectedValue - left.selectedValue);
    },
    lowestTeams() {
      if (!this.selectedDateKey) return [];
      const snapshot = this.teamRows
        .map((team) => ({
          ...team,
          selectedValue: this.isAllDatesSelected ? this.teamTotal(team) : this.valueFor(team, this.selectedDateKey),
        }));
      if (!snapshot.length) return [];
      return [...snapshot]
        .map((team) => {
          const target = this.teamScopeTarget(team);
          const ratio = target > 0 ? (Number(team.selectedValue) || 0) / target : 0;
          return {
            ...team,
            __target: target,
            __ratio: ratio,
          };
        })
        .sort((a, b) => {
          if (a.__ratio !== b.__ratio) return a.__ratio - b.__ratio;
          return (Number(a.selectedValue) || 0) - (Number(b.selectedValue) || 0);
        })
        .slice(0, 3);
    },
    selectedDateTotal() {
      return this.selectedTeamsSnapshot.reduce((sum, team) => sum + team.selectedValue, 0);
    },
    selectedScopeDays() {
      if (!this.selectedDateKey) return 0;
      return this.isAllDatesSelected ? this.availableDates.length : 1;
    },
    selectedScopeHours() {
      return this.selectedScopeDays * DAILY_PRODUCTIVE_HOURS;
    },
    productionPerHour() {
      if (!this.selectedScopeHours) return 0;
      return this.selectedDateTotal / this.selectedScopeHours;
    },
    previousDateKey() {
      if (this.isAllDatesSelected) return '';
      const index = this.availableDates.findIndex((item) => item.key === this.selectedDateKey);
      return index > 0 ? this.availableDates[index - 1].key : '';
    },
    previousDateLabel() {
      return this.previousDateKey ? formatDateLabel(this.previousDateKey) : 'sem base anterior';
    },
    previousDateTotal() {
      if (!this.previousDateKey) return 0;
      return this.teamRows.reduce((sum, team) => sum + this.valueFor(team, this.previousDateKey), 0);
    },
    previousProductionPerHour() {
      if (!this.previousDateTotal) return 0;
      return this.previousDateTotal / DAILY_PRODUCTIVE_HOURS;
    },
    productionDeltaPercent() {
      if (!this.previousProductionPerHour) return 0;
      return ((this.productionPerHour - this.previousProductionPerHour) / this.previousProductionPerHour) * 100;
    },
    productionDeltaLabel() {
      if (this.isAllDatesSelected) return `${this.availableDates.length} datas no período consolidado`;
      if (!this.previousDateKey) return 'Sem base anterior para comparação';
      const prefix = this.productionDeltaPercent >= 0 ? '+' : '';
      return `${prefix}${this.productionDeltaPercent.toFixed(1).replace('.', ',')}% vs ${this.previousDateLabel}`;
    },
    productionTotalLabel() {
      if (this.isAllDatesSelected) return `R$ ${this.formatCurrency(this.selectedDateTotal)} no período`;
      return `R$ ${this.formatCurrency(this.selectedDateTotal)} no dia`;
    },
    activeTeamsCount() {
      return this.selectedTeamsSnapshot.length;
    },
    averageActiveProduction() {
      if (!this.activeTeamsCount) return 0;
      return this.selectedDateTotal / this.activeTeamsCount;
    },
    topTeamOnDate() {
      return this.selectedTeamsSnapshot[0] || null;
    },
    topTeamSharePercent() {
      if (!this.topTeamOnDate || !this.selectedDateTotal) return 0;
      return (this.topTeamOnDate.selectedValue / this.selectedDateTotal) * 100;
    },
    activeCoveragePercent() {
      if (!this.teamRows.length) return 0;
      return (this.activeTeamsCount / this.teamRows.length) * 100;
    },
    importStatusLabel() {
      if (this.productionLoading) return 'Carregando';
      if (this.productionError) return 'Indisponível';
      return (this.importSummary.skippedRows || 0) > 0 ? 'Atenção' : 'Conferido';
    },
    productionUpdatedLabel() {
      if (!this.productionGeneratedAt) return 'Sem atualização';
      const timestamp = new Date(this.productionGeneratedAt);
      if (Number.isNaN(timestamp.getTime())) return 'Sem atualização';
      return timestampFormatter.format(timestamp);
    },
    productionOriginLabel() {
      if (this.productionOrigin === 'database') return 'Neon';
      if (this.productionOrigin === 'remote-db-sync') return 'Dropbox + Neon';
      if (this.productionOrigin === 'remote') return 'Dropbox';
      return 'Base local';
    },
    topOpportunitiesNote() {
      if (this.topOpportunitiesLoading) return 'carregando';
      if (this.topOpportunitiesError) return 'indisponível';
      const count = this.topOpportunities.length;
      return `${count} ${count === 1 ? 'item' : 'itens'}`;
    },
    topOpportunityItems() {
      if (this.topOpportunitiesLoading) {
        return [
          {
            id: 'loading',
            time: '...',
            title: 'Carregando oportunidades',
            status: 'info',
            statusLabel: 'Buscando as obras com maior valor',
            target: 'programacao',
          },
        ];
      }

      if (this.topOpportunitiesError) {
        return [
          {
            id: 'error',
            time: '!',
            title: 'Falha ao carregar oportunidades',
            status: 'late',
            statusLabel: this.topOpportunitiesError,
            target: 'programacao',
          },
        ];
      }

      if (!this.topOpportunities.length) {
        return [
          {
            id: 'empty',
            time: '0',
            title: 'Nenhuma oportunidade disponível',
            status: 'warn',
            statusLabel: 'Abra a tela de oportunidades para revisar os filtros',
            target: 'programacao',
          },
        ];
      }

      return this.topOpportunities.map((item, index) => ({
        id: item.code || `${index}-${item.display}`,
        time: `${index + 1}º`,
        title: item.display || 'Projeto sem descrição',
        status: index === 0 ? 'ok' : 'info',
        statusLabel: `${item.districtLabel || 'Sem distrital'} · R$ ${this.formatCurrency(item.total || 0)}`,
        target: 'programacao',
      }));
    },
    statusCards() {
      return [
        {
          id: 'window',
          label: 'Data em foco',
          value: this.selectedDateLabel,
          meta: this.isAllDatesSelected
            ? (this.importSummary.firstDateKey && this.importSummary.lastDateKey
              ? `${formatDateLabel(this.importSummary.firstDateKey)} até ${formatDateLabel(this.importSummary.lastDateKey)}`
              : 'Sem datas carregadas')
            : (this.lastAvailableDate ? `Última disponível: ${this.lastAvailableDate.label}` : 'Sem datas carregadas'),
        },
        {
          id: 'status',
          label: 'Base produção',
          value: this.importStatusLabel,
          meta: this.productionError || `${this.productionOriginLabel} · ${this.productionUpdatedLabel}`,
        },
        {
          id: 'routes',
          label: 'Equipes ativas',
          value: `${this.activeTeamsCount}`,
          meta: `${this.teamRows.length} monitoradas`,
        }
      ];
    },
    flowStats() {
      return [
        {
          id: 'prod',
          label: 'PROD/H',
          value: this.productionPerHour,
          hint: this.productionTotalLabel,
          trend: this.productionDeltaLabel,
          format: 'currency-per-hour',
          progress: this.lastAvailableDate && this.importSummary.totalImportedValue
            ? Math.min(100, (this.selectedDateTotal / Math.max(this.importSummary.totalImportedValue, this.selectedDateTotal, 1)) * 100)
            : 0,
        },
        {
          id: 'active',
          label: 'Equipes ativas',
          value: String(this.activeTeamsCount),
          hint: `${this.activeCoveragePercent.toFixed(1).replace('.', ',')}% da base com lançamento`,
          trend: '',
          progress: this.activeCoveragePercent,
        },
        {
          id: 'average',
          label: 'Média ativa',
          value: this.averageActiveProduction,
          hint: this.activeTeamsCount
            ? `${this.activeTeamsCount} equipes com produção${this.isAllDatesSelected ? ' no período' : ''}`
            : 'Sem equipes com produção',
          trend: '',
          format: 'currency',
          progress: this.topTeamOnDate?.selectedValue ? Math.min(100, (this.averageActiveProduction / this.topTeamOnDate.selectedValue) * 100) : 0,
        },
        {
          id: 'leader',
          label: this.isAllDatesSelected ? 'Líder do período' : 'Líder do dia',
          value: this.topTeamOnDate ? this.topTeamOnDate.display : '—',
          hint: this.topTeamOnDate
            ? `R$ ${this.formatCurrency(this.topTeamOnDate.selectedValue)}`
            : this.isAllDatesSelected ? 'Sem produção no período' : 'Sem produção na data',
          trend: '',
          progress: this.topTeamSharePercent,
        },
        {
          id: 'share',
          label: 'Participação líder',
          value: `${this.topTeamSharePercent.toFixed(1).replace('.', ',')}%`,
          hint: this.topTeamOnDate
            ? `${this.topTeamOnDate.display} no total ${this.isAllDatesSelected ? 'do período' : 'da data'}`
            : 'Sem liderança definida',
          trend: '',
          progress: this.topTeamSharePercent,
        }
      ];
    },
  },
  mounted() {
    this.fetchWeather();
    this.loadProductionSnapshot();
    this.loadTopOpportunities();
    this.weatherTimer = setInterval(() => this.fetchWeather(), 15 * 60 * 1000);
  },
  unmounted() {
    if (this.weatherTimer) clearInterval(this.weatherTimer);
  },
  methods: {
    async loadTopOpportunities() {
      this.topOpportunitiesLoading = true;
      this.topOpportunitiesError = '';
      try {
        const response = await fetch('/api/get-oportunidades?topN=4&progress=SEM%20ANDAMENTO', { cache: 'no-store' });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.detail || payload?.error || 'Falha ao carregar oportunidades');
        }
        this.topOpportunities = Array.isArray(payload?.data?.top) ? payload.data.top.slice(0, 4) : [];
      } catch (error) {
        console.error('Erro ao carregar top oportunidades:', error);
        this.topOpportunities = [];
        this.topOpportunitiesError = error.message || 'Falha ao carregar oportunidades';
      } finally {
        this.topOpportunitiesLoading = false;
      }
    },
    async fetchWeather() {
      const apiKey = '13bac35c0c1b49bb8ce135347260304';
      const query = this.weatherQuery || 'Bacabal,MA';
      const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(query)}&lang=pt`;
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Erro ao buscar clima');
        const data = await response.json();
        console.info('weatherapi response:', data);
        this.weather = {
          temp: Math.round(data.current.temp_c),
          description: data.current.condition.text,
          iconUrl: 'https:' + data.current.condition.icon,
          location: data.location || null,
          lastUpdated: data.current.last_updated || null
        };
        if (data.location && typeof data.location.lat === 'number' && typeof data.location.lon === 'number') {
          const latlon = `${data.location.lat},${data.location.lon}`;
          if (this.weatherQuery !== latlon) this.weatherQuery = latlon;
        }
      } catch (e) {
        this.weatherError = 'Não foi possível obter o clima.';
      }
    },
    async requestNormalizedSheet(sheetName) {
      const response = await fetch(`/api/get-producao-from-db?sheet=${encodeURIComponent(sheetName)}`, { cache: 'no-store' });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.detail || payload?.error || `Falha ao carregar ${sheetName}`);
      }
      return {
        sheetName,
        normalized: payload.data || {},
        origin: payload.origin || 'database',
        generatedAt: payload.generatedAt || '',
      };
    },
    async loadProductionSnapshot() {
      this.productionLoading = true;
      this.productionError = '';
      try {
        const results = await Promise.all(SOURCE_SHEETS.map((sheetName) => this.requestNormalizedSheet(sheetName)));
        const merged = mergeNormalizedSheets(results);
        this.availableDates = merged.dates;
        this.teamRows = merged.teams;
        this.importSummary = merged.summary;
        const origins = Array.from(new Set(results.map((result) => result.origin)));
        this.productionOrigin = origins.length === 1 ? origins[0] : 'database';
        this.productionGeneratedAt = results
          .map((result) => result.generatedAt)
          .filter(Boolean)
          .sort()
          .pop() || '';

        const lastDateKey = this.availableDates[this.availableDates.length - 1]?.key || '';
        if (!this.selectedDateKey || (!this.availableDates.some((item) => item.key === this.selectedDateKey) && this.selectedDateKey !== ALL_DATES_KEY)) {
          this.selectedDateKey = lastDateKey;
        }
      } catch (error) {
        console.error('Erro ao carregar snapshot de produção:', error);
        this.productionError = error.message || 'Falha ao carregar produção';
        this.availableDates = [];
        this.teamRows = [];
        this.importSummary = {};
        this.selectedDateKey = '';
      } finally {
        this.productionLoading = false;
      }
    },
    async updateFromSheets() {
      const endpoint = '/api/dropbox-diario';
      this.sheetUpdating = true;
      this.sheetUpdateStatus = null;
      try {
        const resp = await fetch(endpoint, { cache: 'no-store' });
        if (!resp.ok) throw new Error('Falha ao buscar planilha: ' + resp.status);
        const json = await resp.json();
        console.info('dropbox-diario result:', json);
        this.sheetUpdateStatus = { ok: true, origin: json.origin || 'unknown', rows: Array.isArray(json.data) ? json.data.length : null };
        this.lastSheetUpdateAt = new Date().toISOString();
        this.$emit('sheets-updated', json.data);
        await this.loadProductionSnapshot();
      } catch (err) {
        console.error('Erro ao atualizar planilhas:', err);
        this.sheetUpdateStatus = { ok: false, message: err.message };
      } finally {
        this.sheetUpdating = false;
      }
    },
    valueFor(team, dateKey) {
      if (!team || !dateKey || !team.valuesByDate) return 0;
      return Object.prototype.hasOwnProperty.call(team.valuesByDate, dateKey)
        ? Number(team.valuesByDate[dateKey]) || 0
        : 0;
    },
    teamTotal(team) {
      return Object.values(team?.valuesByDate || {}).reduce((sum, value) => sum + (Number(value) || 0), 0);
    },
    teamDailyTarget(team) {
      if (!team) return 0;
      const teamKey = String(team.code || team.display || '').trim().toUpperCase();
      return TEAM_DAILY_TARGET_OVERRIDES[teamKey] || DEFAULT_TEAM_DAILY_TARGET;
    },
    teamScopeTarget(team) {
      const dailyTarget = this.teamDailyTarget(team);
      const multiplier = Math.max(1, Number(this.selectedScopeDays) || 1);
      return dailyTarget * multiplier;
    },
    teamPerformanceBand(team) {
      const ratio = Number(team?.__ratio) || 0;
      if (ratio <= 0.5) return 'critical';
      if (ratio <= 0.85) return 'attention';
      return 'ok';
    },
    teamPerformanceLabel(team) {
      const band = this.teamPerformanceBand(team);
      if (band === 'critical') return 'Crítico';
      if (band === 'attention') return 'Atenção';
      return 'Monitorar';
    },
    teamPerformanceIcon(team) {
      const band = this.teamPerformanceBand(team);
      if (band === 'critical') return 'bi-exclamation-diamond-fill';
      if (band === 'attention') return 'bi-exclamation-triangle-fill';
      return 'bi-activity';
    },
    teamProgressPercent(team) {
      return Math.max(4, Math.min(100, Math.round((Number(team?.__ratio) || 0) * 100)));
    },
    performanceHelperText(team) {
      const ratio = Number(team?.__ratio) || 0;
      if ((Number(team?.selectedValue) || 0) <= 0) return this.isAllDatesSelected ? 'Sem produção registrada no período' : 'Sem produção registrada na data';
      if (ratio <= 0.5) return this.isAllDatesSelected ? 'Muito abaixo da meta do período' : 'Muito abaixo da meta da data';
      if (ratio <= 0.85) return this.isAllDatesSelected ? 'Abaixo da meta do período' : 'Abaixo da meta da data';
      return this.isAllDatesSelected ? 'Próxima da meta do período' : 'Próxima da meta da data';
    },
    formatCurrency(valor) {
      const num = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(/[^\d,\.]/g, '').replace(',', '.'));
      if (Number.isNaN(num)) return valor;
      return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    displayFlowValue(stat) {
      if (stat.format === 'currency') return `R$ ${this.formatCurrency(stat.value)}`;
      if (stat.format === 'currency-per-hour') return `R$ ${this.formatCurrency(stat.value)}/h`;
      return stat.value;
    },
    getFlowIcon(id) {
      const icons = {
        prod: 'bi-currency-dollar',
        active: 'bi-people-fill',
        average: 'bi-calculator-fill',
        leader: 'bi-trophy-fill',
        share: 'bi-pie-chart-fill'
      };
      return icons[id] || 'bi-circle-fill';
    },
    getFlowProgress(stat) {
      if (typeof stat === 'object' && stat) return Math.max(0, Math.min(100, Number(stat.progress) || 0));
      return 0;
    },
    extractTrend(hint) {
      const match = String(hint || '').match(/[+-]?\d+(?:,\d+|\.\d+)?%/);
      return match ? match[0] : '';
    },
    isNegativeTrend(hint) {
      return String(this.extractTrend(hint)).startsWith('-');
    }
  }
};
</script>

<style scoped>
          .producao-card strong {
            color: #22d3ee;
            font-size: 1.5rem;
            font-weight: 700;
            letter-spacing: 0.02em;
          }
        .rotas-card {
          background: linear-gradient(120deg, rgba(59,130,246,0.13) 60%, rgba(251,191,36,0.08) 100%);
          border: 1.5px solid #38bdf8;
          box-shadow: 0 2px 16px 0 rgba(59,130,246,0.08);
          min-width: 210px;
          padding-bottom: 18px;
          padding-top: 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .rotas-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          margin-bottom: 2px;
        }
        .rotas-header p {
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-size: 0.62rem;
          color: #38bdf8;
          font-weight: 700;
        text-shadow: 0 1px 2px #222b;
        line-height: 1.1;
      }
        .rotas-ico {
          font-size: 1.2rem;
          color: #e2e8f0;
          margin-left: 6px;
        }
        .rotas-main {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 2px;
        }
        .rotas-value {
          font-size: 2.1rem;
          font-weight: 800;
          color: #fbbf24;
          letter-spacing: 0.01em;
          text-shadow: 0 2px 8px #222b44, 0 1px 2px #222b;
          line-height: 1.08;
        }
        .rotas-meta {
          font-size: 1.08rem;
          color: #fde68a;
          font-weight: 500;
          margin-top: 2px;
          letter-spacing: 0.01em;
          text-shadow: 0 1px 2px #222b;
        }
        .tile-zones .zones-bottoms {
          margin-top: 10px;
          border-top: 1px dashed rgba(255,255,255,0.03);
          padding-top: 8px;
        }
        .zones-bottoms-head {
          margin: 0 0 6px 0;
          font-size: 0.85rem;
          color: #cbd5e1;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }
        .lowest-teams { list-style: none; padding: 0; margin: 0; display: grid; gap: 6px; }
        .lowest-team { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; }
        .lowest-team p { margin: 0; font-weight: 700; font-size: 0.95rem; }
        .lowest-team small { color: #94a3b8; display: block; }
        /* Meta pill styles for consistent, prominent badges */
        .status-meta, .janela-descanso, .rotas-meta {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 0.95rem;
          font-weight: 600;
          text-shadow: none;
        }
        .status-meta { background: rgba(34,197,94,0.06); border: 1px solid rgba(34,197,94,0.12); color: #baf7d1; }
        .janela-descanso { background: rgba(56,189,248,0.04); border: 1px solid rgba(56,189,248,0.12); color: #9fe6ff; }
        .rotas-meta { background: rgba(251,191,36,0.04); border: 1px solid rgba(251,191,36,0.12); color: #ffecb0; }

        @media (max-width: 520px) {
          .janela-main, .status-main, .rotas-main {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }
        }
        .status-card {
          background: linear-gradient(120deg, rgba(34,197,94,0.10) 60%, rgba(34,211,238,0.10) 100%);
          border: 1.5px solid #22d3ee;
          box-shadow: 0 2px 16px 0 rgba(34,211,238,0.08);
          min-width: 210px;
          padding-bottom: 18px;
          padding-top: 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .status-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          margin-bottom: 2px;
        }
        .status-header p {
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-size: 0.62rem;
          color: #86efac;
          font-weight: 700;
          text-shadow: 0 1px 2px #222b;
          line-height: 1.1;
        }
        .status-main {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 2px;
        }
        .status-value {
          font-size: 2.1rem;
          font-weight: 800;
          color: #4ade80;
          letter-spacing: 0.01em;
          text-shadow: 0 2px 8px #222b44, 0 1px 2px #222b;
          line-height: 1.08;
        }
        .status-meta {
          font-size: 1.08rem;
          color: #bbf7d0;
          font-weight: 500;
          margin-top: 2px;
          letter-spacing: 0.01em;
          text-shadow: 0 1px 2px #222b;
        }
        .status-ico {
          font-size: 1.2rem;
          color: #6ee7b7;
          margin-left: 6px;
        }
    .janela-card {
      background: linear-gradient(120deg, rgba(59,130,246,0.10) 60%, rgba(34,211,238,0.13) 100%);
      border: 1.5px solid #38bdf8;
      box-shadow: 0 2px 16px 0 rgba(59,130,246,0.08);
      min-width: 210px;
      padding-bottom: 18px;
      padding-top: 18px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .janela-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      margin-bottom: 2px;
    }
    .janela-header p {
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      font-size: 0.62rem;
      color: #60a5fa;
      font-weight: 700;
    }
    .janela-ico {
      font-size: 1.2rem;
      color: #38bdf8;
      margin-left: 6px;
    }
    .janela-main {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 2px;
    }
    .janela-horas {
      font-size: 2.1rem;
      font-weight: 800;
      color: #38bdf8;
      letter-spacing: 0.01em;
      text-shadow: 0 2px 8px #222b44, 0 1px 2px #222b;
      line-height: 1.08;
    }
    .janela-descanso {
      font-size: 1.08rem;
      color: #7dd3fc;
      font-weight: 500;
      margin-top: 2px;
      letter-spacing: 0.01em;
      text-shadow: 0 1px 2px #222b;
    }
  .weather-card {
    background: linear-gradient(120deg, rgba(34,211,238,0.13) 60%, rgba(59,130,246,0.10) 100%);
    color: #fff;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    min-width: 210px;
    box-shadow: 0 2px 16px 0 rgba(34,211,238,0.08);
    border: 1.5px solid #22d3ee;
    transition: box-shadow 0.2s, border 0.2s;
  }
  .weather-card:hover {
    box-shadow: 0 4px 24px 0 rgba(34,211,238,0.18);
    border: 1.5px solid #38bdf8;
  }
  .weather-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2px;
  }
  .weather-city {
    font-size: 0.78rem;
    color: #bae6fd;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-shadow: 0 1px 2px #222b;
  }
  .weather-icon-big {
    width: 38px;
    height: 38px;
    margin-left: 8px;
    filter: drop-shadow(0 1px 2px #222b);
  }
  .weather-main {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    width: 100%;
  }
  .weather-temp {
    font-size: 1.7rem;
    font-weight: 700;
    line-height: 1.1;
    color: #fff;
    text-shadow: 0 1px 2px #222b;
  }
  .weather-desc {
    font-size: 1.05rem;
    color: #bae6fd;
    font-weight: 500;
    margin-top: 2px;
    text-shadow: 0 1px 2px #222b;
  }
      .info-card {
        cursor: pointer;
        transition: transform 0.15s, border 0.15s;
      }
      .info-card:hover {
        border-color: #22d3ee;
        transform: translateY(-2px) scale(1.03);
        z-index: 2;
      }
    .weather-info {
      margin-bottom: 12px;
      font-size: 1.1em;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #fff;
      background: rgba(34, 211, 238, 0.12);
      border-radius: 12px;
      padding: 8px 16px;
      width: fit-content;
    }
  .menu-hero { width: 100%; min-height: 100vh; padding: 0; background: transparent; position: relative; overflow: hidden; }
  .matrix { position: relative; z-index: 1; width: 100%; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 24px; padding: clamp(24px, 4vw, 90px); }

  .hero-head { grid-column: 1 / -1; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; }
  .hero-copy { flex: 1 1 720px; max-width: 920px; display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
  .hero-copy h1 { margin: 0; font-size: clamp(2.2rem, 5vw, 4rem); font-family: 'Space Grotesk', sans-serif; color: var(--text); font-weight: 700; line-height: 1.02; letter-spacing: -0.01em; position: relative; }
  .hero-copy h1::before { content: ''; position: absolute; left: -18px; top: 50%; transform: translateY(-50%); width: 8px; height: 60%; border-radius: 4px; background: linear-gradient(180deg,#22d3ee,#38bdf8); opacity: 0.18; }
  .hero-copy p { margin: 0; }
  .eyebrow { letter-spacing: 0.35em; text-transform: uppercase; font-size: 0.68rem; color: var(--muted); font-weight: 700; }
  .subtext { color: var(--text-soft); font-size: 1.02rem; margin-top: 6px; max-width: 760px; opacity: 0.95; }
  @media (max-width: 920px) {
    .hero-copy { align-items: flex-start; }
    .hero-copy h1::before { left: -14px; width: 6px; }
  }
  .hero-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .hero-date-control {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 14px;
    border-radius: 18px;
    border: 1px solid var(--border-soft);
    background: var(--surface-1);
    box-shadow: var(--shadow-soft);
    min-width: 220px;
  }
  .hero-date-control span {
    margin: 0;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    font-size: 0.62rem;
    color: var(--muted);
    font-weight: 700;
  }
  .hero-date-control select {
    border: 1px solid var(--border-soft);
    border-radius: 12px;
    background: var(--surface-2);
    color: var(--text);
    padding: 10px 12px;
    font-size: 0.95rem;
    min-width: 0;
  }
  .hero-date-control select:focus {
    outline: 3px solid rgba(34,211,238,0.10);
    border-color: rgba(34,211,238,0.28);
  }
  .live-pill {
    border: none;
    border-radius: 999px;
    padding: 10px 22px;
    background: linear-gradient(90deg,#12c5da,#22d3ee);
    color: #042029;
    font-weight: 800;
    letter-spacing: 0.12em;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 6px 18px rgba(34,211,238,0.12);
    transition: transform 0.14s ease, box-shadow 0.14s ease;
  }
  .live-pill i { font-size: 1.05rem; color: rgba(2,10,14,0.85); }
  .live-pill:hover { transform: translateY(-3px); box-shadow: 0 12px 34px rgba(34,211,238,0.18); }
  .live-pill:focus { outline: 3px solid rgba(34,211,238,0.12); }
  .mini-cta {
    border: 1px solid var(--border-soft);
    border-radius: 999px;
    padding: 10px 18px;
    background: var(--surface-1);
    color: var(--text);
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: background 0.12s ease, transform 0.12s ease, border-color 0.12s ease;
  }
  .mini-cta i { opacity: 0.95; }
  .mini-cta:hover { background: var(--surface-2); transform: translateY(-2px); border-color: rgba(34,211,238,0.22); }
  .mini-cta:focus { outline: 3px solid rgba(34,211,238,0.10); }

  .info-belt { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: clamp(12px, 1.5vw, 20px); }
  .info-card { padding: 18px; border-radius: 22px; border: 1px solid var(--border-soft); background: var(--surface-1); color: var(--text); display: flex; flex-direction: column; gap: 4px; box-shadow: var(--shadow-soft); }
  .janela-card,
  .status-card,
  .rotas-card {
    min-height: 120px;
  }
  .info-card p { margin: 0; text-transform: uppercase; letter-spacing: 0.2em; font-size: 0.62rem; color: var(--muted); }
  .info-card strong { font-size: 1.2rem; }
  .info-card span { color: var(--text-soft); font-size: 0.85rem; }

  .canvas-grid { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 24px; }
  .tile { border-radius: 30px; border: 1px solid var(--border-soft); background: var(--surface-1); padding: clamp(18px, 2vw, 28px); display: flex; flex-direction: column; gap: 16px; color: var(--text); backdrop-filter: blur(8px); box-shadow: var(--shadow-soft); }
  .tile-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .flow-head-actions { display: flex; align-items: flex-start; gap: 12px; flex-wrap: wrap; justify-content: flex-end; }
  .flow-date-control { min-width: 220px; }
  .tile-head h2, .tile-head h3 { margin: 0; font-size: 1.3rem; }
  .chip { border: 1px solid var(--border-soft); background: var(--surface-2); color: var(--text); border-radius: 999px; padding: 6px 14px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.85rem; }
  .tile-note { font-size: 0.8rem; color: var(--text-soft); }

  .tile-flow { grid-column: span 12; }
  .flow-stats { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 12px; align-items: stretch; }
  .flow-card { grid-column: span 3; min-height: 188px; padding: 14px; border-radius: 18px; border: 1px solid var(--border-soft); background: var(--surface-2); display: flex; flex-direction: column; gap: 10px; position: relative; overflow: hidden; transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease; }
  .flow-prod { grid-column: span 4; }
  .flow-active,
  .flow-average,
  .flow-leader { grid-column: span 4; }
  .flow-share { grid-column: span 3; }
  .flow-card::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at top right, rgba(56,189,248,0.18), transparent 45%); opacity: 0; transition: opacity 0.22s ease; pointer-events: none; }
  .flow-card:hover { transform: translateY(-4px); border-color: rgba(62,198,224,0.45); box-shadow: 0 10px 20px rgba(3,10,18,0.35); }
  .flow-card:hover::before { opacity: 1; }
  .flow-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .flow-icon { color: rgba(186,230,253,0.8); font-size: 0.9rem; }
  .flow-value-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
  .flow-card p { margin: 0; text-transform: uppercase; letter-spacing: 0.16em; font-size: 0.6rem; color: var(--muted); }
  .flow-card strong { font-size: 1.3rem; line-height: 1.22; letter-spacing: -0.02em; }
  .flow-prod strong { font-size: clamp(1.8rem, 2.4vw, 2.35rem); max-width: 7ch; }
  .flow-card small { color: var(--text-soft); font-size: 0.98rem; line-height: 1.45; }
  .trend-pill { flex: 0 0 auto; border-radius: 999px; padding: 5px 9px; font-size: 0.7rem; letter-spacing: 0.04em; font-weight: 700; white-space: nowrap; }
  .trend-pill.up { background: rgba(34,197,94,0.18); color: #22c55e; }
  .trend-pill.down { background: rgba(248,113,113,0.16); color: #f87171; }
  .flow-progress { width: 100%; height: 4px; border-radius: 999px; background: rgba(148,163,184,0.2); margin-top: auto; overflow: hidden; }
  .flow-progress span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #22d3ee, #38bdf8); transition: width 0.35s ease; }
  .flow-backlog .flow-progress span { background: linear-gradient(90deg, #fbbf24, #f59e0b); }

  .tile-timeline { grid-column: span 12; }
  .timeline { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
  .timeline li {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 16px;
    align-items: center;
    padding: 14px 16px;
    border-radius: 14px;
    border: 1px solid var(--border-soft);
    background: var(--surface-2);
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  }
  .timeline li:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 18px rgba(2,6,23,0.5);
    border-color: rgba(62,198,224,0.12);
  }
  .timeline .time {
    font-weight: 800;
    background: var(--surface-3);
    color: var(--text);
    padding: 8px 10px;
    border-radius: 10px;
    min-width: 56px;
    text-align: center;
    box-shadow: inset 0 -6px 12px rgba(0,0,0,0.12);
    font-size: 0.95rem;
    letter-spacing: 0.02em;
  }
  .timeline-copy p { margin: 0; font-weight: 700; font-size: 0.98rem; color: var(--text); }
  .timeline-copy small { font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase; display: block; margin-top: 6px; }
  .timeline-copy small.ok { color: #22c55e; }
  .timeline-copy small.info { color: #38bdf8; }
  .timeline-copy small.warn { color: #fbbf24; }
  .timeline-copy small.late { color: #f87171; }
  .bare {
    border: none;
    background: transparent;
    color: #3ec6e0;
    cursor: pointer;
    width: 38px;
    height: 38px;
    display: inline-grid;
    place-items: center;
    border-radius: 999px;
    transition: background 0.12s ease, transform 0.12s ease;
  }
  .bare:hover { background: rgba(62,198,224,0.06); transform: translateX(3px); }

  .tile-zones { grid-column: span 6; }
  .zones { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
  .zones li {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 14px;
    border: 1px solid var(--border-soft);
    background: var(--surface-2);
    align-items: center;
    transition: transform 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease;
  }
  .zones li + li { border-top: 1px solid rgba(255,255,255,0.02); }
  .zones li:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(2,6,23,0.45); border-color: rgba(62,198,224,0.08); }
  .zones p { margin: 0; font-weight: 700; font-size: 1rem; color: var(--text); }
  .zones small { color: var(--text-soft); display: block; margin-top: 6px; font-size: 0.88rem; }
  .zone-meta { display: flex; align-items: center; gap: 14px; font-size: 0.9rem; color: var(--text-soft); }
  .zone-meta span { color: var(--text-soft); font-weight: 600; }
  .zone-risk { padding: 6px 12px; border-radius: 999px; font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; }
  .zone-risk.low { background: rgba(34,197,94,0.12); color: #16a34a; border: 1px solid rgba(34,197,94,0.08); }
  .zone-risk.med { background: rgba(251,191,36,0.12); color: #b45309; border: 1px solid rgba(251,191,36,0.08); }
  .zone-risk.high { background: rgba(248,113,113,0.12); color: #b91c1c; border: 1px solid rgba(248,113,113,0.08); }

  @media (max-width: 768px) {
    .zones li { padding: 12px; }
    .zone-meta { gap: 10px; }
  }

  @media (max-width: 520px) {
    .zones li { flex-direction: column; align-items: flex-start; gap: 8px; }
    .zone-meta { width: 100%; display: flex; justify-content: space-between; }
  }

  .tile-alerts { grid-column: span 12; }
  .alerts-head-copy { display: flex; flex-direction: column; gap: 4px; }
  .alerts-head-copy small { color: var(--text-soft); font-size: 0.82rem; }
  .alerts { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
  .alert-card {
    position: relative;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 14px;
    padding: 16px 18px;
    border-radius: 20px;
    border: 1px solid var(--border-soft);
    background: linear-gradient(180deg, rgba(15,23,42,0.94), rgba(15,23,42,0.72));
    cursor: pointer;
    overflow: hidden;
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .alert-card::before {
    content: '';
    position: absolute;
    inset: 0;
    background: radial-gradient(circle at top right, rgba(56,189,248,0.12), transparent 42%);
    opacity: 0;
    transition: opacity 0.2s ease;
    pointer-events: none;
  }
  .alert-card:hover {
    transform: translateY(-4px);
    border-color: rgba(62,198,224,0.34);
    box-shadow: 0 16px 30px rgba(2, 6, 23, 0.42);
  }
  .alert-card.static { cursor: default; }
  .alert-card:hover::before { opacity: 1; }
  .alert-card:hover .alert-open { transform: translate(2px, -2px); }
  .alert-card.critical {
    border-color: rgba(248, 113, 113, 0.34);
    background: linear-gradient(180deg, rgba(42, 15, 23, 0.92), rgba(30, 12, 18, 0.82));
  }
  .alert-card.attention {
    border-color: rgba(251, 191, 36, 0.32);
    background: linear-gradient(180deg, rgba(40, 28, 10, 0.9), rgba(24, 18, 10, 0.78));
  }
  .alert-card.ok {
    border-color: rgba(59, 130, 246, 0.22);
    background: linear-gradient(180deg, rgba(15, 23, 42, 0.94), rgba(12, 27, 46, 0.82));
  }
  .alert-rank {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    background: rgba(148, 163, 184, 0.12);
    color: #dbeafe;
    font-weight: 800;
    font-size: 0.92rem;
    box-shadow: inset 0 -6px 12px rgba(0,0,0,0.12);
  }
  .alert-card-copy { min-width: 0; display: flex; flex-direction: column; gap: 8px; }
  .alert-card-topline { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .alert-title { margin: 0; font-size: 1.12rem; font-weight: 800; color: var(--text); line-height: 1.1; }
  .alert-meta { color: var(--text-soft); font-size: 0.98rem; }
  .alert-progress {
    width: 100%;
    height: 6px;
    border-radius: 999px;
    background: rgba(148, 163, 184, 0.16);
    overflow: hidden;
  }
  .alert-progress span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, #38bdf8, #22d3ee);
    transition: width 0.3s ease;
  }
  .alert-card.critical .alert-progress span { background: linear-gradient(90deg, #fb7185, #ef4444); }
  .alert-card.attention .alert-progress span { background: linear-gradient(90deg, #fbbf24, #f59e0b); }
  .alert-footer { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .alert-footer small { color: #a5b4fc; }
  .alert-target {
    color: #cbd5e1;
    font-size: 0.76rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
  }
  .alert-card-right { display: flex; align-items: center; gap: 12px; }
  .alert-signal {
    width: 36px;
    height: 36px;
    border-radius: 12px;
    display: grid;
    place-items: center;
    background: rgba(148, 163, 184, 0.1);
    color: #cbd5e1;
  }
  .alert-signal.critical { background: rgba(239, 68, 68, 0.12); color: #f87171; }
  .alert-signal.attention { background: rgba(245, 158, 11, 0.14); color: #fbbf24; }
  .alert-signal.ok { background: rgba(59, 130, 246, 0.14); color: #60a5fa; }
  .alert-open { color: #dbeafe; transition: transform 0.2s ease; }
  .alert-pill {
    padding: 5px 10px;
    border-radius: 999px;
    font-size: 0.68rem;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    font-weight: 800;
    white-space: nowrap;
  }
  .alert-pill.critical { background: rgba(248, 113, 113, 0.2); color: #fecaca; box-shadow: inset 0 0 0 1px rgba(248, 113, 113, 0.16); }
  .alert-pill.attention { background: rgba(251, 191, 36, 0.22); color: #fde68a; box-shadow: inset 0 0 0 1px rgba(251, 191, 36, 0.14); }
  .alert-pill.ok { background: rgba(59, 130, 246, 0.18); color: #bfdbfe; box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.12); }

  .quick-strip { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 12px; justify-content: flex-start; }
  /* Centraliza o menu de navegação de ações rápidas */
  .quick-strip { justify-content: center; }
  .quick-pill {
    border: 1px solid var(--border-soft);
    background: var(--surface-2);
    border-radius: 14px;
    padding: 10px 14px;
    color: var(--text);
    display: inline-flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
    font-weight: 700;
    font-size: 0.95rem;
    min-width: 88px;
    justify-content: center;
  }
  .quick-pill i { width: 20px; height: 20px; display: inline-grid; place-items: center; font-size: 0.95rem; color: var(--primary-1); }
  .quick-pill span { display: inline-block; padding: 4px 6px; }
  .quick-pill:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(2,6,23,0.4); border-color: rgba(62,198,224,0.12); }
  .quick-pill:focus { outline: 3px solid rgba(62,198,224,0.08); }
  .quick-pill.primary { background: linear-gradient(90deg,#0ea5b6,#22d3ee); color: #03161a; border-color: rgba(34,211,238,0.18); box-shadow: 0 8px 28px rgba(34,211,238,0.12); }
  .quick-pill.ghost { background: rgba(255,255,255,0.01); color: #dbeafe; border-color: rgba(255,255,255,0.04); }
  @media (max-width: 520px) {
    .quick-strip { gap: 8px; }
    .quick-pill { padding: 8px 10px; font-size: 0.9rem; }
  }

  

  /* Leve realce nos cards principais */
  .info-card { transition: transform 0.16s, border 0.16s, box-shadow 0.16s, background 0.16s; }
  .info-card:hover { box-shadow: 0 14px 36px rgba(2,6,23,0.6); }

  @media (max-width: 1200px) {
    .tile-flow { grid-column: span 12; }
    .tile-timeline { grid-column: span 12; }
    .tile-zones { grid-column: span 6; }
    .tile-alerts { grid-column: span 12; }
  }

  @media (max-width: 768px) {
    .matrix { grid-template-columns: repeat(6, minmax(0, 1fr)); }
    .hero-actions { width: 100%; }
    .canvas-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); }
    .flow-head-actions { width: 100%; justify-content: flex-start; }
    .flow-stats { grid-template-columns: repeat(6, minmax(0, 1fr)); }
    .flow-card,
    .flow-prod,
    .flow-active,
    .flow-average,
    .flow-leader,
    .flow-share { grid-column: span 3; }
    .tile-flow, .tile-alerts, .tile-timeline, .tile-zones { grid-column: span 6; }
    .alerts { grid-template-columns: 1fr; }
  }

  @media (max-width: 520px) {
    .menu-hero { padding: 20px; }
    .matrix { grid-template-columns: repeat(1, minmax(0, 1fr)); }
    .canvas-grid { grid-template-columns: repeat(1, minmax(0, 1fr)); }
    .tile { grid-column: span 1; }
    .hero-actions { flex-direction: column; align-items: flex-start; }
    .hero-date-control { width: 100%; }
    .flow-stats { grid-template-columns: 1fr; }
    .flow-card,
    .flow-prod,
    .flow-active,
    .flow-average,
    .flow-leader,
    .flow-share { grid-column: span 1; min-height: auto; }
    .mini-cta { width: 100%; justify-content: center; }
    .alert-card { grid-template-columns: 1fr; align-items: flex-start; }
    .alert-card-right { width: 100%; justify-content: space-between; }
    .alert-card-topline,
    .alert-footer { flex-direction: column; align-items: flex-start; }
  }

  :global(html:not(.dark-theme)) .menu-hero {
    color: var(--text);
  }

  :global(html:not(.dark-theme)) .hero-copy h1,
  :global(html:not(.dark-theme)) .tile-head h2,
  :global(html:not(.dark-theme)) .tile-head h3,
  :global(html:not(.dark-theme)) .flow-card strong,
  :global(html:not(.dark-theme)) .timeline .time,
  :global(html:not(.dark-theme)) .timeline-copy p,
  :global(html:not(.dark-theme)) .zones p,
  :global(html:not(.dark-theme)) .alerts p,
  :global(html:not(.dark-theme)) .radar-desc,
  :global(html:not(.dark-theme)) .quick-pill,
  :global(html:not(.dark-theme)) .info-card strong {
    color: var(--text);
  }

  :global(html:not(.dark-theme)) .eyebrow,
  :global(html:not(.dark-theme)) .subtext,
  :global(html:not(.dark-theme)) .info-card p,
  :global(html:not(.dark-theme)) .info-card span,
  :global(html:not(.dark-theme)) .tile-note,
  :global(html:not(.dark-theme)) .flow-card p,
  :global(html:not(.dark-theme)) .flow-card small,
  :global(html:not(.dark-theme)) .zones small,
  :global(html:not(.dark-theme)) .zone-meta,
  :global(html:not(.dark-theme)) .zone-meta span,
  :global(html:not(.dark-theme)) .alerts small,
  :global(html:not(.dark-theme)) .radar-title,
  :global(html:not(.dark-theme)) .radar-chip {
    color: var(--text-soft);
  }

  :global(html:not(.dark-theme)) .info-card,
  :global(html:not(.dark-theme)) .tile,
  :global(html:not(.dark-theme)) .flow-card,
  :global(html:not(.dark-theme)) .timeline li,
  :global(html:not(.dark-theme)) .zones li,
  :global(html:not(.dark-theme)) .alerts li,
  :global(html:not(.dark-theme)) .quick-pill {
    background: var(--surface-1);
    border-color: var(--border-soft);
    color: var(--text);
    box-shadow: var(--shadow-soft);
  }

  :global(html:not(.dark-theme)) .mini-cta,
  :global(html:not(.dark-theme)) .chip,
  :global(html:not(.dark-theme)) .bare {
    background: var(--surface-1);
    border-color: var(--border-soft);
    color: var(--text);
  }

  :global(html:not(.dark-theme)) .timeline .time {
    background: var(--surface-3);
    box-shadow: none;
  }

  :global(html:not(.dark-theme)) .quick-pill i,
  :global(html:not(.dark-theme)) .flow-icon,
  :global(html:not(.dark-theme)) .bare {
    color: var(--primary-1);
  }

  :global(html:not(.dark-theme)) .tile,
  :global(html:not(.dark-theme)) .info-card {
    backdrop-filter: blur(6px);
  }
</style>
