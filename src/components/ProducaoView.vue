<template>
  <section class="producao-shell">
    <header class="producao-header">
      <div>
        <p class="eyebrow">Produção diária · Aba DIÁRIO</p>
        <h1>Equipes e valores apontados</h1>
        <p class="subline">
          Origem: {{ originLabel }} · Atualizado {{ lastUpdatedLabel || 'há instantes' }}
        </p>
      </div>
      <div class="header-actions">
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
    </header>

    <div v-if="loading" class="state-panel">
      <div class="loader" aria-hidden="true"></div>
      <p>Buscando planilha no Dropbox…</p>
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
      <section class="cards-section">
        <header>
          <h2>Visão rápida ({{ selectedDate?.label || 'sem data' }})</h2>
          <p>{{ filteredTeams.length }} equipes listadas · clique na estrela para fixar favoritos</p>
        </header>
        <div class="cards-grid">
          <article
            v-for="team in cardsTeams"
            :key="team.code"
            class="team-card"
            :class="valueBadgeClass(valueFor(team, selectedDateKey))"
          >
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
            <div class="team-card__value">
              {{ formatCurrency(valueFor(team, selectedDateKey)) }}
            </div>
          </article>
        </div>
      </section>

            <section class="history-panel">
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
                :teams="filteredTeams"
                :dates="historyColumns"
                :value-getter="valueFor"
                :format-short="formatShort"
                :badge-class="valueBadgeClass"
                :pinned-checker="isPinned"
              />
            </section>
    </template>
  </section>
</template>

<script>
import HistoryTable from './HistoryTable.vue';
const PIN_STORAGE_KEY = 'producao_pinned_teams_v1';
const LAST_DATE_STORAGE_KEY = 'producao_last_date_key_v1';

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
});

const timestampFormatter = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export default {
  name: 'ProducaoView',
  components: {
    HistoryTable,
  },
  data() {
    return {
      teamRows: [],
      loading: true,
      errorMessage: '',
      availableDates: [],
      selectedDateKey: '',
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
    selectedDate() {
      return this.availableDates.find((c) => c.key === this.selectedDateKey) || null;
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
      const prioritized = this.filteredTeams.slice(0, 12);
      return prioritized.length ? prioritized : this.filteredTeams;
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
  },
  methods: {
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
      if (Math.abs(num) >= 1000) {
        return currencyFormatter.format(num).replace('R$', '').trim();
      }
      return num.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
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
    async fetchDropboxExcel() {
      this.loading = true;
      this.errorMessage = '';
      try {
        const endpoint = import.meta.env.DEV ? 'http://localhost:5176/dropbox-diario' : '/api/dropbox-diario';
        const response = await fetch(endpoint, { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Falha ao buscar dados do servidor');
        }
        const payload = await response.json();
        const normalized = payload?.data || {};
        if (!Array.isArray(normalized.dates) || !Array.isArray(normalized.teams)) {
          throw new Error('Formato inesperado recebido do servidor.');
        }

        this.availableDates = normalized.dates;
        const teams = normalized.teams
          .map((team) => ({
            ...team,
            valuesByDate: team.valuesByDate || {},
          }))
          .sort((a, b) => a.display.localeCompare(b.display));
        this.teamRows = teams;

        const storedDate = this.availableDates.find((col) => col.key === this.lastDateKey);
        const initialColumn = storedDate || this.pickDefaultDate(this.availableDates);
        this.selectedDateKey = initialColumn ? initialColumn.key : '';
        if (this.selectedDateKey) {
          this.persistLastDateKey(this.selectedDateKey);
          this.lastDateKey = this.selectedDateKey;
        }
        this.historyWindowStart = Math.max(0, this.availableDates.length - this.historyWindowSize);

        this.originLabel = payload.origin === 'remote' ? 'Dropbox' : payload.origin === 'local' ? 'Arquivo local' : 'desconhecida';
        const updatedAt = payload.generatedAt ? new Date(payload.generatedAt) : new Date();
        this.lastUpdatedLabel = timestampFormatter.format(updatedAt);
      } catch (err) {
        console.error('Erro ao buscar arquivo do Dropbox:', err);
        this.errorMessage = err.message || 'Erro desconhecido ao carregar dados.';
        this.teamRows = [];
      } finally {
        this.loading = false;
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
  gap: 1.5rem;
}

.producao-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.eyebrow {
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.65);
}

.producao-header h1 {
  margin: 0.2rem 0;
  font-size: clamp(1.7rem, 4vw, 2.4rem);
}

.subline {
  margin: 0;
  color: rgba(255, 255, 255, 0.75);
}

.header-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
}

.input-stack {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
}

.input-stack select,
.input-stack input {
  min-width: 190px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(15, 23, 42, 0.8);
  color: #fff;
  padding: 0.6rem 1rem;
}

.pill {
  border: none;
  border-radius: 999px;
  padding: 0.8rem 1.6rem;
  font-weight: 600;
  color: #0f172a;
  background: linear-gradient(120deg, #f97316, #fbbf24);
  cursor: pointer;
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
.history-panel {
  background: rgba(15, 23, 42, 0.55);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.cards-section header,
.history-panel header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
}

.team-card {
  position: relative;
  border-radius: 18px;
  padding: 1rem 1.2rem;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  min-height: 120px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
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

.team-card__meta {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.team-code {
  font-weight: 600;
  font-size: 1rem;
}

.team-plate {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.65);
}

.team-card__value {
  font-size: 1.5rem;
  font-weight: 700;
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
  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }
  .history-panel table {
    font-size: 0.8rem;
  }
}
</style>
