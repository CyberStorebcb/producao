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
          <span>Data do histórico</span>
          <input v-model="selectedDate" type="date" @input="handleDateChange">
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
          <div>
            <strong>Carregando sincronização</strong>
            <p>Tempo decorrido: {{ syncElapsedLabel }}</p>
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
              <td>{{ entry.shift_start || '--:--' }}</td>
              <td>{{ entry.shift_end || '--:--' }}</td>
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
const today = new Date().toISOString().slice(0, 10);
const baseFilterOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'BCB', label: 'Bacabal' },
  { value: 'ITM', label: 'Itapecuru Mirim' },
  { value: 'STI', label: 'Santa Ines' },
];

function resolveEntryBaseCode(entry) {
  const reference = String(entry?.team_id || entry?.team_label || '').toUpperCase();
  if (reference.includes('-BCB-') || reference.includes('_BCB_')) return 'BCB';
  if (reference.includes('-ITM-') || reference.includes('_ITM_')) return 'ITM';
  if (reference.includes('-STI-') || reference.includes('_STI_')) return 'STI';
  return 'OTHER';
}

export default {
  name: 'KaizenPage',
  data() {
    return {
      selectedDate: today,
      syncStartDate: today,
      syncEndDate: today,
      selectedPeriod: 'day',
      selectedBaseFilter: 'all',
      periodOptions: [
        { value: 'day', label: 'Dia' },
        { value: 'week', label: 'Semana' },
        { value: 'month', label: 'Mês' },
      ],
      baseFilterOptions,
      entries: [],
      runs: [],
      range: null,
      loading: false,
      syncing: false,
      syncStartedAt: null,
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

      if (this.selectedPeriod === 'day') {
        return `Visualização diária: ${this.formatDate(this.range.startDate)}`;
      }

      if (this.selectedPeriod === 'week') {
        return `Visualização semanal: ${this.formatDate(this.range.startDate)} até ${this.formatDate(this.range.endDate)}`;
      }

      return `Visualização mensal: ${this.formatDate(this.range.startDate)} até ${this.formatDate(this.range.endDate)}`;
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
    emptyStateLabel() {
      const filterSuffix = this.selectedBaseFilter === 'all' ? '' : ` para ${this.selectedBaseLabel}`;
      if (this.selectedPeriod === 'week') {
        return `Nenhum turno Kaizen encontrado para a semana selecionada${filterSuffix}.`;
      }
      if (this.selectedPeriod === 'month') {
        return `Nenhum turno Kaizen encontrado para o mês selecionado${filterSuffix}.`;
      }
      return `Nenhum turno Kaizen encontrado para a data selecionada${filterSuffix}.`;
    },
  },
  mounted() {
    this.loadHistory();
  },
  beforeUnmount() {
    this.stopSyncTimer();
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
    handleDateChange() {
      this.loadHistory();
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
      this.syncStartedAt = null;
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
          date: this.selectedDate,
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
    async syncNow() {
      this.syncing = true;
      this.startSyncTimer();
      this.errorMessage = '';
      this.successMessage = '';
      this.warningMessage = '';
      try {
        if (this.syncStartDate > this.syncEndDate) {
          throw new Error('A data inicial do sync deve ser menor ou igual à data final.');
        }

        const response = await fetch('/api/kaizen-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate: this.syncStartDate,
            endDate: this.syncEndDate,
          }),
        });
        const payload = await this.parseApiResponse(response);
        if (!response.ok) {
          throw new Error(payload.detail || payload.error || 'Falha ao sincronizar o Kaizen.');
        }
        const extracted = Number(payload.recordsCount || 0);
        const syncedRange = payload.startDate && payload.endDate
          ? `${this.formatDate(payload.startDate)} até ${this.formatDate(payload.endDate)}`
          : this.formatDate(payload.referenceDate);
        this.successMessage = extracted > 0
          ? `Sincronização concluída com ${extracted} equipes entre ${syncedRange}.`
          : `Exportação concluída para ${syncedRange}, mas o relatório atual não trouxe IDs de equipes reconhecíveis para extração automática.`;
        this.warningMessage = payload.warning || '';
        this.selectedDate = this.syncEndDate;
        await this.loadHistory({ preserveMessages: true });
      } catch (error) {
        this.errorMessage = error.message || 'Falha ao sincronizar o Kaizen.';
      } finally {
        this.syncing = false;
        this.stopSyncTimer();
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
  align-items: center;
  gap: 0.75rem;
  min-height: 48px;
  padding: 0.7rem 0.95rem;
  border-radius: 14px;
  background: rgba(10, 18, 33, 0.68);
  border: 1px solid rgba(31, 208, 255, 0.18);
  color: var(--text);
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
.section-head__actions {
  display: flex;
  gap: 0.85rem;
  flex-wrap: wrap;
  align-items: end;
}
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
