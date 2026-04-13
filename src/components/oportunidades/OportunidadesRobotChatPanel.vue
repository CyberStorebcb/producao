<template>
  <aside class="robot-chat-shell" aria-label="Chat do robô de oportunidades">
    <div
      class="robot-avatar-panel"
      :class="{ 'is-animating': robotAnimating }"
      role="button"
      tabindex="0"
      :aria-label="avatarToggleLabel"
      @click="$emit('avatar-click', $event)"
      @keydown.enter.prevent="$emit('avatar-click', $event)"
      @keydown.space.prevent="$emit('avatar-click', $event)"
    >
      <div class="robot-full">
        <div class="robot-full__antenna" :class="{ 'robot-full__antenna--active': showFullListMode }"></div>
        <button
          type="button"
          class="robot-full-antenna-button"
          @click.stop.prevent="$emit('toggle-full-list')"
          aria-label="Alternar lista completa no ranking"
          title="Clique para exibir lista completa"
        ></button>
        <div class="robot-full__head">
          <span class="robot-full__eye"></span>
          <span class="robot-full__eye"></span>
          <span class="robot-full__mouth"></span>
        </div>
        <div class="robot-full__torso">
          <span class="robot-core"></span>
        </div>
        <div class="robot-full__arm robot-full__arm--left"></div>
        <div class="robot-full__arm robot-full__arm--right"></div>
        <div class="robot-full__leg robot-full__leg--left"></div>
        <div class="robot-full__leg robot-full__leg--right"></div>
      </div>
      <p class="robot-avatar-panel__label">Assistente operacional</p>
    </div>

    <section
      class="robot-chat-panel"
      role="dialog"
      aria-modal="false"
      aria-labelledby="oportunidades-chat-panel-title"
      aria-describedby="oportunidades-chat-panel-desc"
    >
      <header class="robot-chat-panel__head">
        <div>
          <span class="robot-chat-panel__eyebrow">Chat do robô</span>
          <strong id="oportunidades-chat-panel-title">{{ currentRobotTip.title }}</strong>
          <p id="oportunidades-chat-panel-desc" class="robot-chat-panel__meta">
            {{ robotChatMessages.length }} mensagens na sessão atual
          </p>
        </div>
        <div class="robot-chat-panel__controls">
          <button type="button" class="robot-chat-clear" @click="$emit('clear')">
            Limpar
          </button>
          <button type="button" class="robot-chat-close" @click="$emit('close')">
            Fechar
          </button>
        </div>
      </header>

      <div
        ref="messagesEl"
        class="robot-chat-messages"
        role="log"
        aria-relevant="additions"
        aria-label="Histórico do chat com o assistente"
      >
        <article
          v-for="message in robotChatMessages"
          :key="message.id"
          class="robot-message"
          :class="`robot-message--${message.role}`"
        >
          <span class="robot-message__author">{{ message.role === 'robot' ? 'Robô' : 'Sistema' }}</span>
          <p>{{ message.text }}</p>
        </article>
      </div>

      <div class="robot-chat-composer">
        <p id="oportunidades-chat-hint" class="oportunidades-chat-sr-hint">
          Comandos em português; Enter envia, Escape não fecha o painel.
        </p>

        <div class="robot-chat-section">
          <div class="robot-chat-section__head">
            <span class="robot-chat-section__label" id="oportunidades-actions-label">Ações rápidas</span>
            <button
              type="button"
              class="robot-chat-section__toggle"
              :aria-expanded="String(showRobotActions)"
              :aria-controls="actionsRegionId"
              @click="$emit('toggle-actions')"
            >
              {{ showRobotActions ? 'Ocultar' : 'Mostrar' }}
            </button>
          </div>
          <div
            v-show="showRobotActions"
            :id="actionsRegionId"
            class="robot-chat-actions"
            role="group"
            aria-labelledby="oportunidades-actions-label"
          >
            <button
              v-for="action in robotActions"
              :key="action.id"
              type="button"
              class="robot-chat-action"
              @click="$emit('run-action', action.id)"
            >
              {{ action.label }}
            </button>
          </div>
        </div>

        <div v-if="robotSuggestions.length" class="robot-chat-section">
          <span class="robot-chat-section__label" id="oportunidades-suggestions-label">Sugestões</span>
          <div
            class="robot-chat-suggestions"
            role="group"
            aria-labelledby="oportunidades-suggestions-label"
          >
            <button
              v-for="suggestion in robotSuggestions"
              :key="suggestion"
              type="button"
              class="robot-chat-suggestion"
              @click="$emit('apply-suggestion', suggestion)"
              :title="suggestion"
            >
              {{ suggestion }}
            </button>
          </div>
        </div>

        <form class="robot-chat-input" @submit.prevent="$emit('submit')">
          <label for="oportunidades-robot-input" class="oportunidades-visually-hidden">
            Comando para o assistente
          </label>
          <input
            id="oportunidades-robot-input"
            :value="robotInput"
            type="text"
            class="robot-chat-input__field"
            autocomplete="off"
            aria-describedby="oportunidades-chat-hint"
            placeholder="Ex.: resumo, focar líder, só não liberada, programada"
            @input="$emit('update:robotInput', $event.target.value)"
          >
          <button type="submit" class="robot-chat-input__submit">Enviar</button>
        </form>
      </div>
    </section>
  </aside>
</template>

<script>
export default {
  name: 'OportunidadesRobotChatPanel',
  props: {
    showFullListMode: { type: Boolean, default: false },
    robotAnimating: { type: Boolean, default: false },
    currentRobotTip: { type: Object, required: true },
    robotChatMessages: { type: Array, required: true },
    robotInput: { type: String, default: '' },
    showRobotActions: { type: Boolean, default: false },
    robotActions: { type: Array, required: true },
    robotSuggestions: { type: Array, required: true },
  },
  emits: [
    'update:robotInput',
    'avatar-click',
    'toggle-full-list',
    'clear',
    'close',
    'toggle-actions',
    'run-action',
    'apply-suggestion',
    'submit',
  ],
  data() {
    return {
      actionsRegionId: `oportunidades-robot-actions-${Math.random().toString(36).slice(2, 9)}`,
    };
  },
  computed: {
    avatarToggleLabel() {
      return 'Recolher painel do assistente';
    },
  },
  watch: {
    robotChatMessages: {
      handler() {
        this.$nextTick(() => this.scrollMessagesToEnd());
      },
      deep: true,
    },
  },
  mounted() {
    this.$nextTick(() => this.scrollMessagesToEnd());
  },
  methods: {
    scrollMessagesToEnd() {
      const el = this.$refs.messagesEl;
      if (el) el.scrollTop = el.scrollHeight;
    },
  },
};
</script>

<style scoped>
.oportunidades-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.oportunidades-chat-sr-hint {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.robot-chat-shell {
  position: fixed;
  right: 26px;
  bottom: 24px;
  z-index: 40;
  display: grid;
  grid-template-columns: 132px minmax(460px, 620px);
  align-items: end;
  gap: 16px;
  max-width: calc(100vw - 32px);
  max-height: calc(100vh - 32px);
}

.robot-avatar-panel {
  min-height: 0;
  padding: 18px 12px;
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(8, 21, 40, 0.96), rgba(11, 31, 60, 0.9));
  border: 1px solid rgba(125, 211, 252, 0.18);
  box-shadow: 0 24px 42px rgba(2, 6, 23, 0.36);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  pointer-events: auto;
}

.robot-avatar-panel.is-animating .robot-full {
  animation: robotAssemble 0.72s ease;
}

.robot-avatar-panel.is-animating .robot-full__head {
  animation: robotHeadIn 0.42s ease both;
}

.robot-avatar-panel.is-animating .robot-full__torso {
  animation: robotTorsoIn 0.42s ease 0.12s both;
}

.robot-avatar-panel.is-animating .robot-full__arm--left,
.robot-avatar-panel.is-animating .robot-full__arm--right {
  animation: robotArmIn 0.38s ease 0.24s both;
}

.robot-avatar-panel.is-animating .robot-full__leg--left,
.robot-avatar-panel.is-animating .robot-full__leg--right {
  animation: robotLegIn 0.34s ease 0.34s both;
}

.robot-avatar-panel__label {
  margin: 0;
  text-align: center;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(191, 219, 254, 0.68);
}

.robot-full {
  position: relative;
  width: 88px;
  height: 156px;
  transform-origin: center bottom;
  animation: robotHover 3.2s ease-in-out infinite;
}

.robot-full__antenna {
  position: absolute;
  top: 0;
  left: 50%;
  width: 4px;
  height: 18px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: rgba(125, 211, 252, 0.92);
}

.robot-full__antenna::after {
  content: '';
  position: absolute;
  top: -8px;
  left: 50%;
  width: 12px;
  height: 12px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: #38bdf8;
  box-shadow: 0 0 16px rgba(56, 189, 248, 0.7);
}

.robot-full-antenna-button {
  position: absolute;
  top: -18px;
  left: 50%;
  width: 32px;
  height: 32px;
  transform: translateX(-50%);
  border: 0;
  border-radius: 999px;
  background: rgba(56, 189, 248, 0.08);
  cursor: pointer;
  z-index: 3;
}

.robot-full-antenna-button:hover {
  background: rgba(191, 219, 254, 0.26);
}

.robot-full-antenna-button:focus-visible {
  outline: 2px solid rgba(56, 189, 248, 0.9);
  outline-offset: 2px;
}

.robot-full__head {
  position: absolute;
  top: 16px;
  left: 50%;
  width: 72px;
  height: 58px;
  transform: translateX(-50%);
  border-radius: 22px;
  background: linear-gradient(180deg, #e0f2fe, #93c5fd);
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
}

.robot-full__eye {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #0f172a;
  transform-origin: center;
  animation: robotBlink 4.8s ease-in-out infinite;
}

.robot-full__mouth {
  position: absolute;
  left: 50%;
  bottom: 12px;
  width: 18px;
  height: 5px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.82);
}

.robot-full__torso {
  position: absolute;
  top: 82px;
  left: 50%;
  width: 54px;
  height: 44px;
  transform: translateX(-50%);
  border-radius: 18px;
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.92), rgba(14, 165, 233, 0.82));
  display: grid;
  place-items: center;
}

.robot-core {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: rgba(224, 242, 254, 0.9);
  box-shadow: 0 0 18px rgba(125, 211, 252, 0.55);
}

.robot-full__arm,
.robot-full__leg {
  position: absolute;
  background: linear-gradient(180deg, #cbd5e1, #94a3b8);
  border-radius: 999px;
}

.robot-full__arm {
  top: 88px;
  width: 12px;
  height: 42px;
}

.robot-full__arm--left {
  left: 10px;
  transform: rotate(14deg);
}

.robot-full__arm--right {
  right: 10px;
  transform: rotate(-14deg);
}

.robot-full__leg {
  top: 118px;
  width: 12px;
  height: 34px;
}

.robot-full__leg--left {
  left: 28px;
}

.robot-full__leg--right {
  right: 28px;
}

.robot-full__antenna--active {
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.7);
}

.robot-full__antenna.robot-full__antenna--active::after {
  background: #4ade80;
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.9);
}

.robot-chat-panel {
  min-height: min(620px, calc(100vh - 40px));
  max-height: calc(100vh - 32px);
  min-width: 0;
  border-radius: 30px;
  background: linear-gradient(180deg, rgba(8, 18, 34, 0.98), rgba(12, 24, 44, 0.98));
  border: 1px solid rgba(125, 211, 252, 0.16);
  box-shadow: 0 30px 60px rgba(2, 6, 23, 0.42);
  display: grid;
  grid-template-rows: auto 1fr auto;
  overflow: hidden;
}

.robot-chat-panel__head {
  padding: 18px 18px 14px;
  border-bottom: 1px solid rgba(125, 211, 252, 0.12);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.robot-chat-panel__eyebrow {
  display: block;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.66rem;
  color: rgba(125, 211, 252, 0.72);
}

.robot-chat-panel__head strong {
  color: #f8fbff;
  font-size: 1rem;
}

.robot-chat-panel__meta {
  margin: 6px 0 0;
  color: rgba(191, 219, 254, 0.54);
  font-size: 0.76rem;
}

.robot-chat-panel__controls {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
}

.robot-chat-clear,
.robot-chat-close {
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  color: #cbd5e1;
}

.robot-chat-clear {
  background: rgba(56, 189, 248, 0.08);
}

.robot-chat-close {
  background: rgba(148, 163, 184, 0.08);
}

.robot-chat-messages {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  overflow: auto;
  overscroll-behavior: contain;
  background:
    linear-gradient(180deg, rgba(6, 14, 28, 0.22), rgba(6, 14, 28, 0)),
    radial-gradient(circle at top, rgba(56, 189, 248, 0.05), transparent 50%);
}

.robot-message {
  width: min(100%, 520px);
  max-width: 100%;
  min-width: 0;
  padding: 12px 14px;
  border-radius: 18px;
  border: 1px solid rgba(125, 211, 252, 0.12);
  box-shadow: 0 10px 18px rgba(2, 6, 23, 0.14);
}

.robot-message--robot {
  align-self: flex-start;
  background: rgba(14, 165, 233, 0.1);
}

.robot-message--system {
  align-self: flex-end;
  margin-left: auto;
  background: rgba(148, 163, 184, 0.08);
  border-color: rgba(148, 163, 184, 0.16);
}

.robot-message__author {
  display: block;
  margin-bottom: 6px;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(191, 219, 254, 0.6);
}

.robot-message p {
  margin: 0;
  color: #e2e8f0;
  font-size: 0.88rem;
  line-height: 1.5;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.robot-chat-composer {
  position: relative;
  border-top: 1px solid rgba(125, 211, 252, 0.12);
  background: linear-gradient(180deg, rgba(10, 19, 35, 0.94), rgba(8, 18, 34, 0.98));
  padding: 14px 18px 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

.robot-chat-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.robot-chat-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.robot-chat-section__label {
  color: rgba(191, 219, 254, 0.54);
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.robot-chat-section__toggle {
  appearance: none;
  -webkit-appearance: none;
  border: 1px solid rgba(56, 189, 248, 0.2);
  background: rgba(56, 189, 248, 0.08);
  color: #c7e8ff;
  border-radius: 999px;
  padding: 7px 12px;
  font-size: 0.74rem;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, color 0.18s ease;
}

.robot-chat-section__toggle:hover {
  transform: translateY(-1px);
  border-color: rgba(125, 211, 252, 0.38);
  background: rgba(56, 189, 248, 0.16);
  color: #f8fbff;
}

.robot-chat-section__toggle:focus-visible {
  outline: 2px solid rgba(125, 211, 252, 0.42);
  outline-offset: 2px;
}

.robot-chat-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.robot-chat-action {
  min-width: 0;
  padding: 10px 14px;
  border-radius: 999px;
  border: 1px solid rgba(56, 189, 248, 0.18);
  background: rgba(56, 189, 248, 0.08);
  color: #dbeafe;
  font-size: 0.82rem;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
}

.robot-chat-action:hover {
  transform: translateY(-1px);
  border-color: rgba(125, 211, 252, 0.34);
  background: rgba(56, 189, 248, 0.14);
}

.robot-chat-suggestions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  min-width: 0;
}

.robot-chat-suggestion {
  min-width: 0;
  width: 100%;
  padding: 9px 12px;
  border-radius: 999px;
  border: 1px dashed rgba(125, 211, 252, 0.22);
  background: rgba(125, 211, 252, 0.06);
  color: #dbeafe;
  font-size: 0.78rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: left;
}

.robot-chat-input {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
  align-items: stretch;
}

.robot-chat-input__field {
  min-width: 0;
  padding: 12px 14px;
  border-radius: 16px;
  border: 1px solid rgba(125, 211, 252, 0.18);
  background: rgba(15, 23, 42, 0.9);
  color: #e2e8f0;
  outline: none;
}

.robot-chat-input__field::placeholder {
  color: rgba(191, 219, 254, 0.42);
}

.robot-chat-input__field:focus {
  border-color: rgba(56, 189, 248, 0.36);
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.12);
}

.robot-chat-input__submit {
  padding: 12px 16px;
  border-radius: 16px;
  border: 1px solid rgba(56, 189, 248, 0.28);
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.22), rgba(37, 99, 235, 0.2));
  color: #e0f2fe;
  font-weight: 700;
}

@keyframes robotHover {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-6px);
  }
}

@keyframes robotBlink {
  0%,
  44%,
  48%,
  100% {
    transform: scaleY(1);
  }
  46% {
    transform: scaleY(0.15);
  }
}

@keyframes robotAssemble {
  0% {
    opacity: 0;
    transform: translateY(24px) scale(0.82);
  }
  55% {
    opacity: 1;
    transform: translateY(-6px) scale(1.04);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes robotHeadIn {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(-18px) scale(0.84);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

@keyframes robotTorsoIn {
  0% {
    opacity: 0;
    transform: translateX(-50%) translateY(20px) scale(0.86);
  }
  100% {
    opacity: 1;
    transform: translateX(-50%) translateY(0) scale(1);
  }
}

@keyframes robotArmIn {
  0% {
    opacity: 0;
    transform: translateY(-10px) rotate(0deg);
  }
  100% {
    opacity: 1;
  }
}

@keyframes robotLegIn {
  0% {
    opacity: 0;
    transform: translateY(14px) scaleY(0.7);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scaleY(1);
  }
}

@media (max-width: 1120px) {
  .robot-chat-shell {
    right: 18px;
    left: 18px;
    grid-template-columns: 104px minmax(0, 1fr);
    max-width: none;
    max-height: calc(100vh - 24px);
  }

  .robot-avatar-panel {
    padding: 14px 8px;
    cursor: pointer;
  }

  .robot-chat-panel {
    min-height: min(580px, calc(100vh - 28px));
  }
}

@media (max-width: 820px) {
  .robot-chat-actions,
  .robot-chat-suggestions {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .robot-chat-shell {
    left: 12px;
    right: 12px;
    bottom: 12px;
    grid-template-columns: 1fr;
    max-height: calc(100vh - 24px);
  }

  .robot-avatar-panel {
    display: none;
  }

  .robot-chat-panel {
    min-height: min(72vh, calc(100vh - 24px));
    max-height: calc(100vh - 24px);
    border-radius: 24px;
  }

  .robot-chat-panel__head {
    padding: 16px 16px 12px;
  }

  .robot-chat-panel__controls {
    width: 100%;
    justify-content: flex-start;
  }

  .robot-chat-messages,
  .robot-chat-composer {
    padding-left: 16px;
    padding-right: 16px;
  }

  .robot-chat-input {
    grid-template-columns: 1fr;
  }

  .robot-chat-input__submit,
  .robot-chat-action,
  .robot-chat-suggestion,
  .robot-chat-clear,
  .robot-chat-close {
    min-height: 44px;
  }
}
</style>
