<template>
  <div v-if="hasSyncData" class="kaizen-monitor-shell">
    <button
      type="button"
      class="kaizen-monitor-toggle"
      :class="toggleClass"
      :aria-label="`Robo Kaizen: ${statusLabel}`"
      @click="panelOpen = !panelOpen"
    >
      <span class="kaizen-monitor-toggle__beacon"></span>
      <div class="kaizen-monitor-toggle__content">
        <strong>Robo Kaizen</strong>
        <small>{{ statusLabel }}</small>
      </div>
    </button>

    <transition name="kaizen-monitor-panel">
      <aside
        v-if="panelOpen"
        class="kaizen-monitor-panel"
        role="dialog"
        aria-label="Monitor do robo Kaizen"
      >
        <header class="kaizen-monitor-hero">
          <div class="kaizen-monitor-hero__copy">
            <span class="kaizen-monitor-hero__tag">Teste ao vivo do robo</span>
            <h3>Sincronizacao passo a passo</h3>
            <p>{{ heroMessage }}</p>
          </div>
          <button
            type="button"
            class="kaizen-monitor-hero__close"
            aria-label="Fechar painel"
            @click="panelOpen = false"
          >
            Fechar
          </button>
        </header>

        <section class="kaizen-monitor-strip">
          <article class="kaizen-monitor-kpi">
            <span>Progresso</span>
            <strong>{{ progressPercentage }}%</strong>
          </article>
          <article class="kaizen-monitor-kpi">
            <span>Datas</span>
            <strong>{{ processedDates }}/{{ totalDates }}</strong>
          </article>
          <article class="kaizen-monitor-kpi">
            <span>Tempo</span>
            <strong>{{ elapsedLabel }}</strong>
          </article>
        </section>

        <div
          class="kaizen-monitor-progress"
          :class="{ 'kaizen-monitor-progress--failed': hasFailed }"
          role="progressbar"
          :aria-valuenow="progressPercentage"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div class="kaizen-monitor-progress__bar" :style="{ width: `${progressPercentage}%` }"></div>
        </div>

        <section class="kaizen-monitor-stage">
          <div class="kaizen-monitor-stage__head">
            <strong>Acompanhamento ao vivo</strong>
            <span>{{ liveStatusLabel }}</span>
          </div>

          <article class="kaizen-monitor-stage__spotlight" :class="spotlightClass">
            <div>
              <span class="kaizen-monitor-stage__tag">{{ liveStageLabel }}</span>
              <strong>{{ liveHeadline }}</strong>
              <p>{{ liveDescription }}</p>
            </div>
            <span class="kaizen-monitor-stage__pulse"></span>
          </article>

          <div class="kaizen-monitor-meta">
            <article v-for="item in metaCards" :key="item.label" class="kaizen-monitor-meta__card">
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </article>
          </div>
        </section>

        <section class="kaizen-monitor-preview">
          <div class="kaizen-monitor-section-head">
            <strong>Espelho do navegador</strong>
            <span>{{ previewCaption }}</span>
          </div>

          <div class="kaizen-monitor-preview__frame">
            <img
              v-if="previewImage"
              :src="previewImage"
              alt="Preview do navegador do robo Kaizen"
            >
            <div v-else class="kaizen-monitor-preview__empty">
              <strong>Preview indisponivel</strong>
              <p>O robo ainda nao gerou uma captura desta execucao.</p>
            </div>
          </div>
        </section>

        <section class="kaizen-monitor-flow">
          <div class="kaizen-monitor-section-head">
            <strong>Fluxo do robô</strong>
            <span>{{ steps.length }} etapas</span>
          </div>

          <div class="kaizen-monitor-steps">
            <article
              v-for="step in steps"
              :key="step.id"
              class="kaizen-monitor-step"
              :class="stepClass(step.status)"
            >
              <span class="kaizen-monitor-step__dot"></span>
              <div>
                <strong>{{ step.label }}</strong>
                <p>{{ step.description }}</p>
              </div>
            </article>
          </div>
        </section>

        <section class="kaizen-monitor-console">
          <div class="kaizen-monitor-section-head">
            <strong>Console ao vivo</strong>
            <span>{{ liveFeedEntries.length }} eventos</span>
          </div>

          <div class="kaizen-monitor-console__shell">
            <div class="kaizen-monitor-console__bar">
              <span></span>
              <span></span>
              <span></span>
              <strong>Streaming do bot</strong>
            </div>

            <ul>
              <li
                v-for="entry in liveFeedEntries"
                :key="`${entry.timestamp}-${entry.message}`"
                class="kaizen-monitor-console__entry"
                :class="entryClass(entry)"
              >
                <span>{{ formatClock(entry.timestamp) }}</span>
                <div>
                  <p>{{ entry.message }}</p>
                  <small v-if="entryDetails(entry)">{{ entryDetails(entry) }}</small>
                </div>
              </li>
            </ul>
          </div>
        </section>

        <section class="kaizen-monitor-logbook">
          <div class="kaizen-monitor-section-head">
            <strong>Historico curto</strong>
            <span>{{ logEntries.length }} itens</span>
          </div>

          <ul>
            <li v-for="entry in logEntries" :key="`${entry.timestamp}-${entry.message}`">
              <span>{{ formatClock(entry.timestamp) }}</span>
              <div>
                <p>{{ entry.message }}</p>
                <small v-if="entryDetails(entry)">{{ entryDetails(entry) }}</small>
              </div>
            </li>
          </ul>
        </section>
      </aside>
    </transition>
  </div>
</template>

<script>
import { resolveStepStatuses } from '../../shared/kaizenSteps.js';

const STORAGE_KEY = 'kaizen_sync_monitor_state_v1';
const MAX_STORED_LOGS = 50;
const STATE_EXPIRY_MS = 24 * 60 * 60 * 1000;

const STATUS_CLASS_MAP = {
  done: 'kaizen-monitor-step--done',
  active: 'kaizen-monitor-step--active',
  pending: 'kaizen-monitor-step--pending',
  error: 'kaizen-monitor-step--error',
};

function readStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    const savedAt = parsed?._savedAt || 0;
    if (savedAt && Date.now() - savedAt > STATE_EXPIRY_MS) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function persistState(payload) {
  try {
    const toSave = payload ? { ...payload, _savedAt: Date.now() } : null;
    if (toSave && Array.isArray(toSave.logs)) {
      toSave.logs = toSave.logs.slice(-MAX_STORED_LOGS);
    }

    if (toSave) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // noop
  }
}

export default {
  name: 'KaizenRobotMonitor',
  emits: ['sync-finished'],
  data() {
    return {
      panelOpen: false,
      monitor: readStoredState() || null,
      tickNow: Date.now(),
      tickId: null,
    };
  },
  computed: {
    hasSyncData() {
      return Boolean(this.monitor && (this.monitor.syncing || this.monitor.jobId || (this.monitor.logs || []).length));
    },
    isSyncing() {
      return Boolean(this.monitor?.syncing);
    },
    hasFailed() {
      return this.monitor?.status === 'failed';
    },
    progressPercentage() {
      return Number(this.monitor?.progressPercentage || 0);
    },
    processedDates() {
      return Number(this.monitor?.processedDates || 0);
    },
    totalDates() {
      return Math.max(1, Number(this.monitor?.totalDates || 0));
    },
    currentMessage() {
      return this.monitor?.currentMessage || 'Aguardando sincronizacao.';
    },
    statusLabel() {
      if (this.monitor?.status === 'failed') return 'Falhou';
      if (this.monitor?.status === 'completed' && this.monitor?.warning) return 'Concluido com falhas';
      if (this.monitor?.status === 'completed') return 'Concluido';
      if (this.monitor?.status === 'queued') return 'Na fila';
      if (this.monitor?.syncing) return 'Sincronizando';
      return 'Monitor pronto';
    },
    toggleClass() {
      return {
        'kaizen-monitor-toggle--active': this.isSyncing,
        'kaizen-monitor-toggle--failed': this.hasFailed,
      };
    },
    spotlightClass() {
      return {
        'kaizen-monitor-stage__spotlight--failed': this.hasFailed,
      };
    },
    elapsedLabel() {
      const startedAt = this.monitor?.startedAt ? new Date(this.monitor.startedAt).getTime() : 0;
      if (!startedAt) return '00:00';

      const finishedAt = this.monitor?.finishedAt ? new Date(this.monitor.finishedAt).getTime() : 0;
      const end = finishedAt || this.tickNow;
      const totalSeconds = Math.max(0, Math.floor((end - startedAt) / 1000));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },
    heroMessage() {
      if (this.monitor?.error) return this.monitor.error;
      if (this.monitor?.warning) return this.monitor.warning;
      return this.currentMessage;
    },
    latestEntry() {
      const logs = Array.isArray(this.monitor?.logs) ? this.monitor.logs : [];
      return logs.length ? logs[logs.length - 1] : null;
    },
    preview() {
      return this.monitor?.preview || null;
    },
    previewImage() {
      return this.preview?.imageDataUrl || '';
    },
    previewCaption() {
      if (!this.preview) return 'Sem frame';
      return `${this.liveStageLabel} • ${this.formatClock(this.preview.timestamp)}`;
    },
    liveStatusLabel() {
      if (this.hasFailed) return 'Execucao interrompida';
      if (this.monitor?.status === 'completed') return 'Execucao concluida';
      if (this.isSyncing) return 'Transmitindo agora';
      return 'Ultima execucao';
    },
    liveStageLabel() {
      const stage = this.latestEntry?.stage || this.preview?.stage || '';
      if (stage.includes('saving') || stage.includes('completed') || stage.includes('download')) return 'Persistencia';
      if (stage.includes('export') || stage.includes('navigation') || stage.includes('popup') || stage.includes('time-view') || stage.includes('actions')) return 'Exportacao SIGA';
      if (stage.includes('job') || stage.includes('range') || stage.includes('login') || stage.includes('tree')) return 'Inicializacao';
      return 'Monitor';
    },
    liveHeadline() {
      if (this.hasFailed) return this.monitor?.error || 'Falha durante a execucao do robo.';
      return this.preview?.message || this.latestEntry?.message || this.currentMessage;
    },
    liveDescription() {
      if (this.monitor?.warning) return this.monitor.warning;
      if (this.monitor?.result?.warning) return this.monitor.result.warning;
      if (this.monitor?.result?.recordsCount) {
        return `${this.monitor.result.recordsCount} equipes processadas nesta execucao.`;
      }
      return 'Visualize o bot navegando, ajustando a data, exportando e persistindo o historico.';
    },
    metaCards() {
      const previewDetails = this.preview?.details || {};
      const latestDetails = this.latestEntry?.details || {};
      const merged = { ...latestDetails, ...previewDetails };
      const targetDate = this.preview?.referenceDate || this.latestEntry?.referenceDate || this.monitor?.currentDate || this.monitor?.result?.referenceDate || '--';
      return [
        {
          label: 'Data alvo',
          value: targetDate === '--' ? '--' : this.formatDateLabel(targetDate),
        },
        {
          label: 'Cabecalho atual',
          value: merged.currentHeaderDate || '--',
        },
        {
          label: 'Arquivo',
          value: merged.rawFilename || this.monitor?.result?.rawFilename || '--',
        },
        {
          label: 'Equipes',
          value: String(merged.recordsCount || this.monitor?.result?.recordsCount || '--'),
        },
      ];
    },
    liveFeedEntries() {
      const logs = Array.isArray(this.monitor?.logs) ? this.monitor.logs : [];
      return logs.slice(-8).reverse();
    },
    logEntries() {
      const logs = Array.isArray(this.monitor?.logs) ? this.monitor.logs : [];
      return logs.slice(-14).reverse();
    },
    steps() {
      const logs = Array.isArray(this.monitor?.logs) ? this.monitor.logs : [];
      return resolveStepStatuses(logs, this.monitor?.status || '', this.isSyncing, this.monitor?.currentStepId || null);
    },
  },
  watch: {
    isSyncing(syncing, wasSyncing) {
      if (syncing && !wasSyncing) {
        this.startTick();
      } else if (!syncing && wasSyncing) {
        this.stopTick();
      }
    },
    'monitor.status'(status, previousStatus) {
      if ((status === 'completed' || status === 'failed') && previousStatus !== status) {
        this.stopTick();
        if (status === 'completed') {
          this.$emit('sync-finished');
        }
      }
    },
  },
  mounted() {
    if (this.isSyncing) {
      this.startTick();
      this.panelOpen = true;
    }

    this.handleMonitorEvent = (event) => {
      const incoming = event.detail || null;
      if (incoming && Array.isArray(incoming.logs)) {
        incoming.logs = incoming.logs.slice(-MAX_STORED_LOGS);
      }
      this.monitor = incoming;
      persistState(this.monitor);
      if (this.monitor?.syncing) {
        this.panelOpen = true;
      }
    };

    window.addEventListener('kaizen-sync-monitor', this.handleMonitorEvent);
  },
  beforeUnmount() {
    window.removeEventListener('kaizen-sync-monitor', this.handleMonitorEvent);
    this.stopTick();
  },
  methods: {
    startTick() {
      if (this.tickId) return;
      this.tickNow = Date.now();
      this.tickId = window.setInterval(() => {
        if (this.panelOpen || this.isSyncing) {
          this.tickNow = Date.now();
        }
      }, 1000);
    },
    stopTick() {
      if (this.tickId) {
        window.clearInterval(this.tickId);
        this.tickId = null;
      }
      this.tickNow = Date.now();
    },
    stepClass(status) {
      return STATUS_CLASS_MAP[status] || STATUS_CLASS_MAP.pending;
    },
    entryClass(entry) {
      return {
        'kaizen-monitor-console__entry--warning': entry?.level === 'warning',
        'kaizen-monitor-console__entry--error': entry?.level === 'error',
      };
    },
    formatClock(value) {
      if (!value) return '--:--:--';
      return new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(value));
    },
    formatDateLabel(value) {
      if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return value || '--';
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(`${value}T12:00:00`));
    },
    entryDetails(entry) {
      const details = entry?.details || {};
      const parts = [];
      if (details.step && details.totalSteps) parts.push(`passo ${details.step}/${details.totalSteps}`);
      if (details.currentHeaderDate) parts.push(`cabecalho ${details.currentHeaderDate}`);
      if (details.rawFilename) parts.push(`arquivo ${details.rawFilename}`);
      if (details.recordsCount) parts.push(`${details.recordsCount} equipes`);
      if (details.dayDelta && !details.step) parts.push(`${Math.abs(details.dayDelta)} dia(s) de ajuste`);
      return parts.join(' | ');
    },
  },
};
</script>

<style scoped>
.kaizen-monitor-shell {
  --km-bg: rgba(7, 15, 28, 0.92);
  --km-panel: linear-gradient(180deg, rgba(7, 15, 28, 0.98), rgba(11, 24, 41, 0.95));
  --km-card: rgba(255, 255, 255, 0.04);
  --km-card-strong: rgba(18, 54, 96, 0.72);
  --km-border: rgba(255, 255, 255, 0.08);
  --km-border-soft: rgba(255, 255, 255, 0.06);
  --km-text: #f4f8ff;
  --km-muted: #afc2dd;
  --km-tag: #8fd8ff;
  --km-primary: #1fd0ff;
  --km-primary-deep: #2f6df6;
  --km-success: #84cc16;
  --km-warning: #f59e0b;
  --km-error: #ef4444;
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 60;
}

.kaizen-monitor-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.9rem;
  min-height: 60px;
  padding: 0.95rem 1.05rem;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: var(--km-bg);
  color: var(--km-text);
  box-shadow: 0 24px 48px rgba(2, 6, 23, 0.34);
  backdrop-filter: blur(14px);
  cursor: pointer;
}

.kaizen-monitor-toggle--active {
  border-color: rgba(31, 208, 255, 0.28);
}

.kaizen-monitor-toggle--failed {
  border-color: rgba(239, 68, 68, 0.35);
}

.kaizen-monitor-toggle__beacon {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: var(--km-primary);
  box-shadow: 0 0 0 0 rgba(31, 208, 255, 0.34);
  animation: kaizenMonitorPulse 1.5s ease-in-out infinite;
}

.kaizen-monitor-toggle--failed .kaizen-monitor-toggle__beacon {
  background: var(--km-error);
  box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.34);
  animation: kaizenMonitorPulseError 1.5s ease-in-out infinite;
}

.kaizen-monitor-toggle__content {
  display: grid;
  gap: 0.12rem;
  text-align: left;
}

.kaizen-monitor-toggle__content strong,
.kaizen-monitor-hero h3,
.kaizen-monitor-kpi strong,
.kaizen-monitor-stage__spotlight strong,
.kaizen-monitor-section-head strong,
.kaizen-monitor-meta__card strong,
.kaizen-monitor-step strong,
.kaizen-monitor-console__bar strong,
.kaizen-monitor-preview__empty strong {
  color: var(--km-text);
}

.kaizen-monitor-toggle__content small,
.kaizen-monitor-hero p,
.kaizen-monitor-kpi span,
.kaizen-monitor-stage__spotlight p,
.kaizen-monitor-preview__empty p,
.kaizen-monitor-step p,
.kaizen-monitor-console__entry small,
.kaizen-monitor-logbook small {
  color: var(--km-muted);
}

.kaizen-monitor-panel {
  position: absolute;
  right: 0;
  bottom: 76px;
  width: min(560px, calc(100vw - 24px));
  max-height: min(84vh, 920px);
  overflow: auto;
  padding: 1.15rem;
  border-radius: 28px;
  background: var(--km-panel);
  border: 1px solid var(--km-border);
  box-shadow: 0 30px 70px rgba(2, 6, 23, 0.48);
}

.kaizen-monitor-hero {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: start;
}

.kaizen-monitor-hero__copy {
  display: grid;
  gap: 0.45rem;
}

.kaizen-monitor-hero__tag,
.kaizen-monitor-stage__tag {
  display: inline-flex;
  align-items: center;
  width: fit-content;
  min-height: 30px;
  padding: 0.24rem 0.72rem;
  border-radius: 999px;
  background: rgba(31, 208, 255, 0.12);
  color: var(--km-tag);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  font-size: 0.72rem;
  font-weight: 800;
}

.kaizen-monitor-hero__close {
  min-height: 44px;
  padding: 0.8rem 1rem;
  border-radius: 14px;
  border: 1px solid var(--km-border);
  background: var(--km-card);
  color: var(--km-text);
  cursor: pointer;
}

.kaizen-monitor-strip,
.kaizen-monitor-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  margin-top: 1rem;
}

.kaizen-monitor-meta {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.kaizen-monitor-kpi,
.kaizen-monitor-meta__card,
.kaizen-monitor-step,
.kaizen-monitor-logbook li {
  padding: 0.95rem 1rem;
  border-radius: 18px;
  background: var(--km-card);
  border: 1px solid var(--km-border-soft);
}

.kaizen-monitor-progress {
  margin-top: 1rem;
  height: 14px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
}

.kaizen-monitor-progress__bar {
  height: 100%;
  background: linear-gradient(90deg, var(--km-primary), var(--km-primary-deep));
  transition: width 0.28s ease;
}

.kaizen-monitor-progress--failed .kaizen-monitor-progress__bar {
  background: linear-gradient(90deg, var(--km-error), #f97316);
}

.kaizen-monitor-stage,
.kaizen-monitor-preview,
.kaizen-monitor-flow,
.kaizen-monitor-console,
.kaizen-monitor-logbook {
  margin-top: 1rem;
  display: grid;
  gap: 0.75rem;
}

.kaizen-monitor-stage__head,
.kaizen-monitor-section-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.kaizen-monitor-stage__head span,
.kaizen-monitor-section-head span,
.kaizen-monitor-preview__head span {
  color: var(--km-tag);
  font-size: 0.76rem;
}

.kaizen-monitor-stage__spotlight {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding: 1rem;
  border-radius: 22px;
  background: linear-gradient(135deg, rgba(31, 208, 255, 0.16), rgba(47, 109, 246, 0.12));
  border: 1px solid rgba(31, 208, 255, 0.18);
}

.kaizen-monitor-stage__spotlight--failed {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.16), rgba(249, 115, 22, 0.12));
  border-color: rgba(239, 68, 68, 0.22);
}

.kaizen-monitor-stage__pulse {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  background: var(--km-primary);
  box-shadow: 0 0 0 0 rgba(31, 208, 255, 0.34);
  animation: kaizenMonitorPulse 1.5s ease-in-out infinite;
}

.kaizen-monitor-stage__spotlight--failed .kaizen-monitor-stage__pulse {
  background: var(--km-error);
  box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.34);
  animation: kaizenMonitorPulseError 1.5s ease-in-out infinite;
}

.kaizen-monitor-preview__frame,
.kaizen-monitor-console__shell {
  border-radius: 20px;
  overflow: hidden;
  border: 1px solid rgba(148, 163, 184, 0.12);
  background: rgba(2, 8, 23, 0.78);
}

.kaizen-monitor-preview__frame img {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
  background: #020817;
}

.kaizen-monitor-preview__empty {
  display: grid;
  place-items: center;
  gap: 0.35rem;
  min-height: 260px;
  padding: 1rem;
  text-align: center;
}

.kaizen-monitor-steps {
  display: grid;
  gap: 0.75rem;
}

.kaizen-monitor-step {
  display: grid;
  grid-template-columns: 16px 1fr;
  gap: 0.8rem;
  align-items: start;
}

.kaizen-monitor-step__dot {
  width: 12px;
  height: 12px;
  margin-top: 0.28rem;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.5);
}

.kaizen-monitor-step--done .kaizen-monitor-step__dot { background: var(--km-success); }
.kaizen-monitor-step--active .kaizen-monitor-step__dot { background: var(--km-primary); }
.kaizen-monitor-step--error .kaizen-monitor-step__dot { background: var(--km-error); }

.kaizen-monitor-console__bar {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.8rem 0.95rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.kaizen-monitor-console__bar span {
  width: 9px;
  height: 9px;
  border-radius: 999px;
}

.kaizen-monitor-console__bar span:first-child { background: #ef4444; }
.kaizen-monitor-console__bar span:nth-child(2) { background: #f59e0b; }
.kaizen-monitor-console__bar span:nth-child(3) { background: #84cc16; }

.kaizen-monitor-console__shell ul,
.kaizen-monitor-logbook ul {
  list-style: none;
  margin: 0;
  padding: 0;
}

.kaizen-monitor-console__shell ul {
  display: grid;
  gap: 0.5rem;
  max-height: 260px;
  overflow: auto;
  padding: 0.6rem;
}

.kaizen-monitor-console__entry,
.kaizen-monitor-logbook li {
  display: grid;
  grid-template-columns: 72px 1fr;
  gap: 0.75rem;
  align-items: start;
}

.kaizen-monitor-console__entry {
  padding: 0.72rem 0.76rem;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.72);
}

.kaizen-monitor-console__entry--warning {
  background: rgba(120, 53, 15, 0.35);
}

.kaizen-monitor-console__entry--error {
  background: rgba(127, 29, 29, 0.38);
}

.kaizen-monitor-console__entry span,
.kaizen-monitor-logbook li span {
  color: var(--km-tag);
  font-size: 0.76rem;
  font-weight: 700;
}

.kaizen-monitor-console__entry p,
.kaizen-monitor-logbook li p {
  margin: 0;
  color: var(--km-text);
}

.kaizen-monitor-logbook ul {
  display: grid;
  gap: 0.6rem;
}

.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active,
.kaizen-monitor-panel-enter-active,
.kaizen-monitor-panel-leave-active {
  transition: all 0.22s ease;
}

.kaizen-monitor-panel-enter-from,
.kaizen-monitor-panel-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@keyframes kaizenMonitorPulse {
  0% { box-shadow: 0 0 0 0 rgba(31, 208, 255, 0.34); }
  70% { box-shadow: 0 0 0 12px rgba(31, 208, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(31, 208, 255, 0); }
}

@keyframes kaizenMonitorPulseError {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.34); }
  70% { box-shadow: 0 0 0 12px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

@media (max-width: 720px) {
  .kaizen-monitor-shell {
    right: 12px;
    left: 12px;
    bottom: 12px;
  }

  .kaizen-monitor-toggle {
    width: 100%;
    justify-content: center;
  }

  .kaizen-monitor-panel {
    right: 0;
    left: 0;
    width: 100%;
  }

  .kaizen-monitor-strip,
  .kaizen-monitor-meta {
    grid-template-columns: 1fr;
  }
}
</style>