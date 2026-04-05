<template>
  <div v-if="hasSyncData" class="kaizen-robot-shell">
    <button
      type="button"
      class="kaizen-robot-toggle"
      :class="{ 'kaizen-robot-toggle--active': isSyncing }"
      @click="panelOpen = !panelOpen"
    >
      <span class="kaizen-robot-toggle__dot"></span>
      <div>
        <strong>Robo Kaizen</strong>
        <small>{{ statusLabel }}</small>
      </div>
    </button>

    <transition name="robot-panel">
      <aside v-if="panelOpen" class="kaizen-robot-panel">
        <header class="kaizen-robot-panel__header">
          <div>
            <span class="kaizen-robot-panel__tag">Processo em segundo plano</span>
            <h3>Sincronizacao passo a passo</h3>
            <p>{{ currentMessage }}</p>
          </div>
          <button type="button" class="kaizen-robot-panel__close" @click="panelOpen = false">Fechar</button>
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

        <div class="kaizen-robot-progress">
          <div class="kaizen-robot-progress__bar" :style="{ width: `${progressPercentage}%` }"></div>
        </div>

        <section class="kaizen-robot-steps">
          <article
            v-for="step in steps"
            :key="step.id"
            class="kaizen-robot-step"
            :class="{
              'kaizen-robot-step--done': step.status === 'done',
              'kaizen-robot-step--active': step.status === 'active',
              'kaizen-robot-step--pending': step.status === 'pending',
              'kaizen-robot-step--error': step.status === 'error'
            }"
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
const STORAGE_KEY = 'kaizen_sync_monitor_state_v1';

const STEP_DEFINITIONS = [
  { id: 'job-started', label: 'Inicializacao', description: 'Job criado e sincronizacao iniciada.', stages: ['job-created', 'job-started', 'range-started'] },
  { id: 'export', label: 'Exportacao SIGA', description: 'Robo navegando e exportando o relatorio.', stages: ['date-started', 'range-date-started', 'export-started', 'export-finished'] },
  { id: 'save', label: 'Persistencia', description: 'Dados sendo gravados e deduplicados no Neon.', stages: ['saving-started', 'date-completed'] },
  { id: 'complete', label: 'Conclusao', description: 'Lote finalizado e historico atualizado.', stages: ['range-completed', 'job-completed', 'job-failed'] },
];

function readStoredState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistState(payload) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // noop
  }
}

export default {
  name: 'KaizenRobotMonitor',
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
      const seenStages = new Set(logs.map((entry) => entry.stage).filter(Boolean));
      const hasFailure = this.monitor?.status === 'failed';
      const currentStage = logs.length ? logs[logs.length - 1].stage : '';

      return STEP_DEFINITIONS.map((step, index) => {
        const completed = step.stages.some((stage) => seenStages.has(stage)) && currentStage !== step.stages[0];
        const active = step.stages.includes(currentStage) || (this.isSyncing && !hasFailure && !completed && STEP_DEFINITIONS.slice(0, index).every((previous) => previous.stages.some((stage) => seenStages.has(stage))));
        let status = 'pending';
        if (hasFailure && step.id === 'complete') status = 'error';
        else if (completed) status = 'done';
        else if (active) status = 'active';
        return {
          ...step,
          status,
        };
      });
    },
  },
  mounted() {
    this.tickId = window.setInterval(() => {
      this.tickNow = Date.now();
    }, 1000);
    this.handleMonitorEvent = (event) => {
      this.monitor = event.detail || null;
      persistState(this.monitor);
      if (this.monitor?.syncing) {
        this.panelOpen = true;
      }
    };
    window.addEventListener('kaizen-sync-monitor', this.handleMonitorEvent);
    if (this.monitor?.syncing) {
      this.panelOpen = true;
    }
  },
  beforeUnmount() {
    window.removeEventListener('kaizen-sync-monitor', this.handleMonitorEvent);
    if (this.tickId) {
      window.clearInterval(this.tickId);
      this.tickId = null;
    }
  },
  methods: {
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
  background: rgba(9, 18, 33, 0.92);
  color: #f5fbff;
  box-shadow: 0 18px 40px rgba(2, 6, 23, 0.3);
  backdrop-filter: blur(12px);
}

.kaizen-robot-toggle--active {
  border-color: rgba(31, 208, 255, 0.3);
}

.kaizen-robot-toggle__dot {
  width: 12px;
  height: 12px;
  border-radius: 999px;
  background: #1fd0ff;
  box-shadow: 0 0 0 0 rgba(31, 208, 255, 0.35);
  animation: robotPulse 1.5s ease-in-out infinite;
}

.kaizen-robot-toggle strong,
.kaizen-robot-panel h3,
.kaizen-robot-step strong,
.kaizen-robot-logbook__head strong,
.kaizen-robot-summary__card strong {
  color: #f5fbff;
}

.kaizen-robot-toggle small,
.kaizen-robot-panel p,
.kaizen-robot-step p,
.kaizen-robot-logbook__head span,
.kaizen-robot-summary__card span {
  color: #b8cbe3;
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
  background: linear-gradient(180deg, rgba(9, 18, 33, 0.98), rgba(10, 22, 38, 0.94));
  border: 1px solid rgba(255, 255, 255, 0.08);
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
  background: rgba(31, 208, 255, 0.12);
  color: #9bd9ff;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-size: 0.68rem;
  font-weight: 700;
}

.kaizen-robot-panel__close {
  min-height: 40px;
  padding: 0.7rem 0.9rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  color: #f5fbff;
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
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
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
  background: linear-gradient(90deg, #1fd0ff, #2f6df6);
  transition: width 0.3s ease;
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

.kaizen-robot-step--done .kaizen-robot-step__dot { background: #84cc16; }
.kaizen-robot-step--active .kaizen-robot-step__dot { background: #1fd0ff; }
.kaizen-robot-step--error .kaizen-robot-step__dot { background: #ef4444; }

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
  color: #9bd9ff;
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
  0% { box-shadow: 0 0 0 0 rgba(31, 208, 255, 0.35); }
  70% { box-shadow: 0 0 0 10px rgba(31, 208, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(31, 208, 255, 0); }
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