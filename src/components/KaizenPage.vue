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
          <span>Data</span>
          <input v-model="selectedDate" type="date">
        </label>
        <button type="button" class="primary-btn" :disabled="syncing" @click="syncNow">
          {{ syncing ? 'Sincronizando...' : 'Sincronizar agora' }}
        </button>
      </div>
    </header>

    <section class="kaizen-grid">
      <article class="kaizen-card kaizen-card--hero">
        <span class="card-tag">Status</span>
        <h2>{{ latestRunLabel }}</h2>
        <p>{{ latestRunDescription }}</p>
        <div class="card-pills">
          <span class="pill">{{ entries.length }} equipes carregadas</span>
          <span class="pill">{{ runs.length }} execuções no histórico</span>
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
        </div>
        <button type="button" class="ghost-btn" :disabled="loading" @click="loadHistory">
          {{ loading ? 'Atualizando...' : 'Atualizar lista' }}
        </button>
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
            <tr v-for="entry in entries" :key="`${entry.reference_date}-${entry.team_id}`">
              <td>{{ formatDate(entry.reference_date) }}</td>
              <td>{{ entry.team_label || entry.team_id }}</td>
              <td>{{ entry.shift_start || '--:--' }}</td>
              <td>{{ entry.shift_end || '--:--' }}</td>
              <td>{{ entry.source }}</td>
              <td>{{ formatDateTime(entry.synced_at) }}</td>
            </tr>
            <tr v-if="!loading && !entries.length">
              <td colspan="6" class="empty-state">Nenhum turno Kaizen encontrado para a data selecionada.</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </section>
</template>

<script>
const today = new Date().toISOString().slice(0, 10);

export default {
  name: 'KaizenPage',
  data() {
    return {
      selectedDate: today,
      entries: [],
      runs: [],
      loading: false,
      syncing: false,
      errorMessage: '',
      successMessage: '',
      warningMessage: '',
    };
  },
  computed: {
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
  },
  mounted() {
    this.loadHistory();
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
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(`${value}T12:00:00`));
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
    async loadHistory() {
      this.loading = true;
      this.errorMessage = '';
      this.successMessage = '';
      this.warningMessage = '';
      try {
        const response = await fetch(`/api/get-kaizen-history?date=${encodeURIComponent(this.selectedDate)}`, {
          cache: 'no-store',
        });
        const payload = await this.parseApiResponse(response);
        if (!response.ok) {
          throw new Error(payload.detail || payload.error || 'Falha ao carregar histórico Kaizen.');
        }
        this.entries = payload.entries || [];
        this.runs = payload.runs || [];
        this.warningMessage = payload.warning || '';
      } catch (error) {
        this.entries = [];
        this.runs = [];
        this.errorMessage = error.message || 'Falha ao carregar histórico Kaizen.';
      } finally {
        this.loading = false;
      }
    },
    async syncNow() {
      this.syncing = true;
      this.errorMessage = '';
      this.successMessage = '';
      this.warningMessage = '';
      try {
        const response = await fetch('/api/kaizen-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            referenceDate: this.selectedDate,
          }),
        });
        const payload = await this.parseApiResponse(response);
        if (!response.ok) {
          throw new Error(payload.detail || payload.error || 'Falha ao sincronizar o Kaizen.');
        }
        const extracted = Number(payload.recordsCount || 0);
        this.successMessage = extracted > 0
          ? `Sincronização concluída com ${extracted} equipes para ${this.formatDate(payload.referenceDate)}.`
          : `Exportação concluída para ${this.formatDate(payload.referenceDate)}, mas o relatório atual não trouxe IDs de equipes reconhecíveis para extração automática.`;
        this.warningMessage = payload.warning || '';
        await this.loadHistory();
      } catch (error) {
        this.errorMessage = error.message || 'Falha ao sincronizar o Kaizen.';
      } finally {
        this.syncing = false;
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
