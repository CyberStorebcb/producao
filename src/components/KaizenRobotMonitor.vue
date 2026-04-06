<template>
  <div v-if="hasSyncData" class="kaizen-robot-shell">
    <button
      type="button"
      class="kaizen-robot-toggle"
      :class="[
        isSyncing && 'kaizen-robot-toggle--active',
        hasFailed && 'kaizen-robot-toggle--failed',
      ]"
      @click="panelOpen = !panelOpen"
      :aria-label="`Robo Kaizen: ${statusLabel}`"
    >
      <span class="kaizen-robot-toggle__dot"></span>
      <div>
        <strong>Robo Kaizen</strong>
        <small>{{ statusLabel }}</small>
      </div>
    </button>

    <transition name="robot-panel">
      <aside v-if="panelOpen" class="kaizen-robot-panel" role="dialog" aria-label="Monitor de sincronização Kaizen">
        <header class="kaizen-robot-panel__header">
          <div>
            <span class="kaizen-robot-panel__tag">Processo em segundo plano</span>
            <h3>Sincronizacao passo a passo</h3>
            <p>{{ currentMessage }}</p>
          </div>
          <button type="button" class="kaizen-robot-panel__close" @click="panelOpen = false" aria-label="Fechar painel">Fechar</button>
        </header>

        <div class="kaizen-robot-summary">
          <article class="kaizen-robot-summary__card">
            <strong>{{ progressPercentage }}%</strong>
            <span>Progresso</span>
          </article>
          <article class="kaizen-robot-summary__card">
            <strong>{{ processedDates }}/{{ totalDates }}</strong>
            <span>Datas</span>
          </article>
          <article class="kaizen-robot-summary__card">
            <strong>{{ elapsedLabel }}</strong>
            <span>Tempo</span>
          </article>
        </div>

        <div
          class="kaizen-robot-progress"
          :class="{ 'kaizen-robot-progress--failed': hasFailed }"
          role="progressbar"
          :aria-valuenow="progressPercentage"
          aria-valuemin="0"
          aria-valuemax="100"
          :aria-label="`Progresso: ${progressPercentage}%`"
        >
          <div class="kaizen-robot-progress__bar" :style="{ width: `${progressPercentage}%` }"></div>
        </div>

        <section class="kaizen-robot-steps">
          <article
            v-for="step in steps"
            :key="step.id"
            class="kaizen-robot-step"
            :class="stepClass(step.status)"
          >
            <span class="kaizen-robot-step__dot"></span>
            <div>
              <strong>{{ step.label }}</strong>
              <p>{{ step.description }}</p>
            </div>
          </article>
        </section>

        <section class="kaizen-robot-logbook">
          <div class="kaizen-robot-logbook__head">
            <strong>Log do robo</strong>
            <span>{{ logEntries.length }} eventos</span>
          </div>
          <ul>
            <li v-for="entry in logEntries" :key="`${entry.timestamp}-${entry.message}`">
              <span>{{ formatClock(entry.timestamp) }}</span>
              <p>{{ entry.message }}</p>
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
const STATE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 horas

const STATUS_CLASS_MAP = {
  done: 'kaizen-robot-step--done',
  active: 'kaizen-robot-step--active',
  pending: 'kaizen-robot-step--pending',
  error: 'kaizen-robot-step--error',
};

function readStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    // Expiração: descartar estado com mais de 24h
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
      return Number(this.monitor?.totalDates || 0);
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
    logEntries() {
      return Array.isArray(this.monitor?.logs) ? [...this.monitor.logs].slice(-12).reverse() : [];
    },
    steps() {
      const logs = Array.isArray(this.monitor?.logs) ? this.monitor.logs : [];
      const currentStepId = this.monitor?.currentStepId || null;
      return resolveStepStatuses(logs, this.monitor?.status || '', this.isSyncing, currentStepId);
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
    formatClock(value) {
      if (!value) return '--:--:--';
      return new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(value));
    },
  },
};
</script>

<style scoped>
.kaizen-robot-shell {
  --robot-primary: #1fd0ff;
  --robot-primary-rgb: 31, 208, 255;
  --robot-accent: #2f6df6;
  --robot-bg: rgba(9, 18, 33, 0.92);
  --robot-bg-panel: linear-gradient(180deg, rgba(9, 18, 33, 0.98), rgba(10, 22, 38, 0.94));
  --robot-text: #f5fbff;
  --robot-text-muted: #b8cbe3;
  --robot-text-tag: #9bd9ff;
  --robot-success: #84cc16;
  --robot-error: #ef4444;
  --robot-border: rgba(255, 255, 255, 0.08);
  --robot-border-soft: rgba(255, 255, 255, 0.06);
  --robot-card-bg: rgba(255, 255, 255, 0.04);

  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 60;
}

.kaizen-robot-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.8rem;
  min-height: 58px;
  padding: 0.9rem 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  background: var(--robot-bg);
  color: var(--robot-text);
  box-shadow: 0 18px 40px rgba(2, 6, 23, 0.3);
  backdrop-filter: blur(12px);
  cursor: pointer;
}

.kaizen-robot-toggle--active {
  border-color: rgba(var(--robot-primary-rgb), 0.3);
}

.kaizen-robot-toggle--failed {
  border-color: rgba(239, 68, 68, 0.4);
}

.kaizen-robot-toggle__dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: var(--robot-primary);
  box-shadow: 0 0 0 0 rgba(var(--robot-primary-rgb), 0.35);
  animation: robotPulse 1.5s ease-in-out infinite;
}

.kaizen-robot-toggle--failed .kaizen-robot-toggle__dot {
  background: var(--robot-error);
  box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.35);
  animation: robotPulseError 1.5s ease-in-out infinite;
}

.kaizen-robot-toggle strong,
.kaizen-robot-panel h3,
.kaizen-robot-step strong,
.kaizen-robot-logbook__head strong,
.kaizen-robot-summary__card strong {
  color: var(--robot-text);
}

.kaizen-robot-toggle small,
.kaizen-robot-panel p,
.kaizen-robot-step p,
.kaizen-robot-logbook__head span,
.kaizen-robot-summary__card span {
  color: var(--robot-text-muted);
}

.kaizen-robot-panel {
  position: absolute;
  right: 0;
  bottom: 74px;
  width: min(460px, calc(100vw - 24px));
  max-height: min(78vh, 760px);
  overflow: auto;
  padding: 1.1rem;
  border-radius: 24px;
  background: var(--robot-bg-panel);
  border: 1px solid var(--robot-border);
  box-shadow: 0 24px 60px rgba(2, 6, 23, 0.42);
}

.kaizen-robot-panel__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: start;
}

.kaizen-robot-panel__tag {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0.24rem 0.7rem;
  border-radius: 999px;
  background: rgba(var(--robot-primary-rgb), 0.12);
  color: var(--robot-text-tag);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.68rem;
  font-weight: 700;
}

.kaizen-robot-panel__close {
  min-height: 40px;
  padding: 0.7rem 0.9rem;
  border-radius: 12px;
  border: 1px solid var(--robot-border);
  background: var(--robot-card-bg);
  color: var(--robot-text);
  cursor: pointer;
}

.kaizen-robot-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.7rem;
  margin-top: 1rem;
}

.kaizen-robot-summary__card,
.kaizen-robot-step,
.kaizen-robot-logbook li {
  padding: 0.9rem 1rem;
  border-radius: 16px;
  background: var(--robot-card-bg);
  border: 1px solid var(--robot-border-soft);
}

.kaizen-robot-progress {
  margin-top: 1rem;
  width: 100%;
  height: 12px;
  border-radius: 999px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.08);
}

.kaizen-robot-progress__bar {
  height: 100%;
  background: linear-gradient(90deg, var(--robot-primary), var(--robot-accent));
  transition: width 0.3s ease;
}

.kaizen-robot-progress--failed .kaizen-robot-progress__bar {
  background: linear-gradient(90deg, var(--robot-error), #f97316);
}

.kaizen-robot-steps,
.kaizen-robot-logbook {
  margin-top: 1rem;
  display: grid;
  gap: 0.7rem;
}

.kaizen-robot-step {
  display: grid;
  grid-template-columns: 16px 1fr;
  gap: 0.8rem;
  align-items: start;
}

.kaizen-robot-step__dot {
  width: 12px;
  height: 12px;
  margin-top: 0.3rem;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.5);
}

.kaizen-robot-step--done .kaizen-robot-step__dot { background: var(--robot-success); }
.kaizen-robot-step--active .kaizen-robot-step__dot { background: var(--robot-primary); }
.kaizen-robot-step--error .kaizen-robot-step__dot { background: var(--robot-error); }

.kaizen-robot-logbook__head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.kaizen-robot-logbook ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.6rem;
}

.kaizen-robot-logbook li {
  display: grid;
  grid-template-columns: 70px 1fr;
  gap: 0.7rem;
  align-items: start;
}

.kaizen-robot-logbook li span {
  color: var(--robot-text-tag);
  font-size: 0.76rem;
  font-weight: 700;
}

.kaizen-robot-logbook li p {
  margin: 0;
}

.robot-panel-enter-active,
.robot-panel-leave-active {
  transition: all 0.2s ease;
}

.robot-panel-enter-from,
.robot-panel-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@keyframes robotPulse {
  0% { box-shadow: 0 0 0 0 rgba(var(--robot-primary-rgb), 0.35); }
  70% { box-shadow: 0 0 0 10px rgba(var(--robot-primary-rgb), 0); }
  100% { box-shadow: 0 0 0 0 rgba(var(--robot-primary-rgb), 0); }
}

@keyframes robotPulseError {
  0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.35); }
  70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
  100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
}

@media (max-width: 720px) {
  .kaizen-robot-shell {
    right: 12px;
    left: 12px;
    bottom: 12px;
  }

  .kaizen-robot-toggle {
    width: 100%;
    justify-content: center;
  }

  .kaizen-robot-panel {
    right: 0;
    left: 0;
    width: 100%;
  }

  .kaizen-robot-summary {
    grid-template-columns: 1fr;
  }
}
</style>