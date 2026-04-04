<template>
  <section class="oportunidades-shell">
    <div class="oportunidades-backdrop"></div>
    <div class="oportunidades-frame">
      <header class="oportunidades-hero">
        <div class="hero-copy">
          <p class="hero-kicker">Robô de oportunidades</p>
          <h1>OPORTUNIDADES</h1>
          <p class="hero-text">
            Visualização executiva das maiores oportunidades da carteira, com filtros operacionais aplicados antes do ranking.
          </p>

          <div class="hero-robot-dock">
            <div class="robot-bubble">
              <span class="robot-bubble__eyebrow">Assistente</span>
              <strong>{{ currentRobotTip.title }}</strong>
              <p>{{ currentRobotTip.text }}</p>
              <button type="button" class="robot-bubble__next" @click="advanceRobotTip">
                Trocar leitura
              </button>
            </div>

            <button
              type="button"
              class="robot-trigger"
              :class="{ 'is-active': robotChatOpen, 'is-animating': robotAnimating, 'is-loading': loading }"
              @click="toggleRobotChat"
              :aria-label="robotChatOpen ? 'Fechar chat do robô' : 'Abrir chat do robô'"
            >
              <span class="robot-head" :class="{ 'is-loading': loading }">
                <span class="robot-antenna"></span>
                <span class="robot-face">
                  <span class="robot-eye"></span>
                  <span class="robot-eye"></span>
                </span>
                <span class="robot-mouth"></span>
                <span class="robot-steam robot-steam--left"></span>
                <span class="robot-steam robot-steam--center"></span>
                <span class="robot-steam robot-steam--right"></span>
              </span>
            </button>
          </div>
        </div>

        <div class="hero-stats" v-if="summary">
          <div class="stat-card stat-card--accent">
            <span class="stat-label">Distritais selecionadas</span>
            <strong>{{ selectedDistricts.length }}</strong>
          </div>
          <div class="stat-card">
            <span class="stat-label">Registros no top</span>
            <strong>{{ summary.top.length }}</strong>
          </div>
          <div class="stat-card">
            <span class="stat-label">Valor consolidado</span>
            <strong>{{ formatCurrency(summary.totalVisibleValue) }}</strong>
          </div>
        </div>
      </header>

      <section class="control-surface">
        <div class="scope-panel">
          <p class="panel-kicker">Filtro distrital</p>
          <div class="scope-switch" role="group" aria-label="Selecionar distritais">
            <button
              v-for="scope in districtOptions"
              :key="scope"
              type="button"
              class="scope-pill"
              :class="{ active: selectedDistricts.includes(scope) }"
              :aria-pressed="selectedDistricts.includes(scope)"
              @click="toggleDistrict(scope)"
            >
              <span class="scope-pill__title">{{ scope }}</span>
              <span class="scope-pill__meta">{{ selectedDistricts.includes(scope) ? 'Incluída na análise' : 'Fora da análise' }}</span>
            </button>
          </div>
        </div>

        <div v-if="summary" class="filter-panel">
          <div class="filter-group">
            <span class="filter-title">Distritais ativos</span>
            <div class="filter-chips">
              <span v-for="district in summary.filters.districts" :key="district.code" class="filter-chip">
                {{ district.label }}
              </span>
            </div>
          </div>

          <div class="filter-group">
            <span class="filter-title">Status da obra</span>
            <div class="filter-chips">
              <button
                v-for="status in statusOptions"
                :key="status"
                type="button"
                class="filter-chip filter-chip--soft filter-chip--button"
                :class="{ active: selectedStatuses.includes(status) }"
                :aria-pressed="selectedStatuses.includes(status)"
                @click="toggleStatus(status)"
              >
                {{ status }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <div v-if="loading" class="state-panel">Carregando dados das bases...</div>
      <div v-else-if="error" class="state-panel state-panel--error">Erro: {{ error }}</div>
      <article v-else-if="summary" class="results-card">
        <header class="results-head">
          <div>
            <p class="results-kicker">Top {{ topN }} filtrado</p>
            <h2>Maiores valores após os filtros</h2>
          </div>
          <p class="results-date">{{ summary.summary.totalCandidates }} registros elegíveis após o filtro</p>
        </header>

        <div v-if="visibleDistrictTotals.length" class="district-overview">
          <div v-for="district in visibleDistrictTotals" :key="district.code" class="district-card">
            <span>{{ district.label }}</span>
            <strong>{{ formatCurrency(district.totalValue) }}</strong>
          </div>
        </div>

        <div class="results-table-wrap">
          <table class="oportunidades-table">
            <thead>
              <tr>
                <th style="width: 56px">#</th>
                <th>Obra / Projeto</th>
                <th style="width: 170px">Distrital</th>
                <th style="width: 180px">Município</th>
                <th style="width: 170px">Nota</th>
                <th style="width: 180px" class="text-end">Faturamento</th>
                <th style="width: 180px">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, idx) in summary.top" :key="item.code">
                <td>
                  <span class="rank-badge">{{ idx + 1 }}</span>
                </td>
                <td>
                  <div class="obra-cell">
                    <strong>{{ item.display }}</strong>
                    <small>{{ item.pep || item.code }}</small>
                  </div>
                </td>
                <td>{{ item.districtLabel }}</td>
                <td>{{ item.municipality || '-' }}</td>
                <td>{{ item.note || '-' }}</td>
                <td class="text-end faturamento-cell">{{ formatCurrency(item.total) }}</td>
                <td>
                  <span class="status-pill">{{ item.statusLabel || item.status || '-' }}</span>
                </td>
              </tr>
              <tr v-if="summary.top.length === 0">
                <td colspan="7" class="empty-row">Nenhuma obra encontrada com os filtros atuais.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <transition name="robot-chat-shell">
        <aside v-if="robotChatOpen" class="robot-chat-shell" aria-label="Chat do robô de oportunidades">
          <div class="robot-avatar-panel" :class="{ 'is-animating': robotAnimating }">
            <div class="robot-full">
              <div class="robot-full__antenna"></div>
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

          <section class="robot-chat-panel">
            <header class="robot-chat-panel__head">
              <div>
                <span class="robot-chat-panel__eyebrow">Chat do robô</span>
                <strong>{{ currentRobotTip.title }}</strong>
              </div>
              <button type="button" class="robot-chat-close" @click="closeRobotChat">
                Fechar
              </button>
            </header>

            <div class="robot-chat-messages">
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

            <div class="robot-chat-actions">
              <button
                v-for="action in robotActions"
                :key="action.id"
                type="button"
                class="robot-chat-action"
                @click="runRobotAction(action.id)"
              >
                {{ action.label }}
              </button>
            </div>

            <form class="robot-chat-input" @submit.prevent="submitRobotInput">
              <input
                v-model.trim="robotInput"
                type="text"
                class="robot-chat-input__field"
                placeholder="Ex.: resumo, focar lider, so nao liberada, programada"
              >
              <button type="submit" class="robot-chat-input__submit">Enviar</button>
            </form>
          </section>
        </aside>
      </transition>
    </div>
  </section>
</template>

<script>
export default {
  name: 'Oportunidades',
  props: {
    topN: { type: Number, default: 10 }
  },
  data() {
    return {
      selectedDistricts: ['BACABAL', 'ITAPECURU MIRIM', 'SANTA INÊS'],
      selectedStatuses: ['NAO LIBERADA', 'OBRA LIBERADA', 'PROGRAMADA', 'REPROGRAMAR'],
      summary: null,
      loading: true,
      error: null,
      robotTipIndex: 0,
      robotChatOpen: false,
      robotAnimating: false,
      robotChatMessages: [],
      robotInput: '',
      pendingRobotReaction: null,
    };
  },
  computed: {
    districtOptions() {
      return ['BACABAL', 'ITAPECURU MIRIM', 'SANTA INÊS'];
    },
    statusOptions() {
      return ['NAO LIBERADA', 'OBRA LIBERADA', 'PROGRAMADA', 'REPROGRAMAR'];
    },
    visibleDistrictTotals() {
      if (!this.summary?.top?.length) return [];

      const totalsByDistrict = new Map();
      this.summary.top.forEach((item) => {
        const code = item.districtCode || item.districtLabel;
        const current = totalsByDistrict.get(code) || {
          code,
          label: item.districtLabel || code,
          totalValue: 0,
        };
        current.totalValue += Number(item.total) || 0;
        totalsByDistrict.set(code, current);
      });

      const ordered = this.summary.filters.districts
        .map((district) => totalsByDistrict.get(district.code))
        .filter(Boolean);

      return ordered;
    },
    robotTips() {
      const districtCount = this.selectedDistricts.length;
      const statusCount = this.selectedStatuses.length;
      const visibleCount = this.summary?.top?.length || 0;
      const visibleValue = this.summary?.totalVisibleValue || 0;
      const strongestDistrict = this.visibleDistrictTotals[0];

      return [
        {
          title: 'Radar ativo',
          text: `${districtCount} distritais e ${statusCount} status estao compondo a leitura atual.`,
        },
        {
          title: 'Recorte visivel',
          text: `${visibleCount} obras aparecem no top atual, somando ${this.formatCurrency(visibleValue)}.`,
        },
        {
          title: 'Maior peso no top',
          text: strongestDistrict
            ? `${strongestDistrict.label} concentra ${this.formatCurrency(strongestDistrict.totalValue)} do que esta na tabela.`
            : 'Ajuste os filtros para eu destacar onde o maior volume esta concentrado.',
        },
      ];
    },
    currentRobotTip() {
      return this.robotTips[this.robotTipIndex] || this.robotTips[0];
    },
    robotActions() {
      return [
        { id: 'summary', label: 'Resumir top atual' },
        { id: 'focus-leading-district', label: 'Focar na distrital lider' },
        { id: 'only-non-liberada', label: 'Ver so nao liberada' },
        { id: 'only-programada', label: 'Ver so programada' },
        { id: 'compare-districts', label: 'Comparar distritais' },
        { id: 'restore-filters', label: 'Restaurar filtros' },
      ];
    },
  },
  mounted() {
    this.loadAll();
  },
  methods: {
    async fetchOportunidades() {
      const query = new URLSearchParams({
        topN: String(this.topN),
        districts: this.selectedDistricts.join(','),
        statuses: this.selectedStatuses.join(','),
      });
      const res = await fetch(`/api/get-oportunidades?${query.toString()}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Falha ao executar o robô de oportunidades');
      }
      const json = await res.json();
      return json.data;
    },
    async loadAll() {
      this.loading = true;
      this.error = null;
      try {
        this.summary = await this.fetchOportunidades();
        if (this.robotChatOpen && this.pendingRobotReaction) {
          this.appendRobotMessage(this.buildRobotReactionMessage(this.pendingRobotReaction));
          this.pendingRobotReaction = null;
        } else if (this.robotChatOpen) {
          this.robotChatMessages = this.createRobotContextMessages();
        }
      } catch (err) {
        this.error = String(err.message || err);
      } finally {
        this.loading = false;
      }
    },
    toggleDistrict(scope) {
      const isSelected = this.selectedDistricts.includes(scope);
      if (isSelected && this.selectedDistricts.length === 1) return;

      this.selectedDistricts = isSelected
        ? this.selectedDistricts.filter((item) => item !== scope)
        : [...this.selectedDistricts, scope];
      this.pendingRobotReaction = 'districts';
      this.loadAll();
    },
    toggleStatus(status) {
      const isSelected = this.selectedStatuses.includes(status);
      if (isSelected && this.selectedStatuses.length === 1) return;

      this.selectedStatuses = isSelected
        ? this.selectedStatuses.filter((item) => item !== status)
        : [...this.selectedStatuses, status];
      this.pendingRobotReaction = 'statuses';
      this.loadAll();
    },
    advanceRobotTip() {
      this.robotTipIndex = (this.robotTipIndex + 1) % this.robotTips.length;
    },
    createRobotContextMessages() {
      const strongestDistrict = this.visibleDistrictTotals[0];
      const messages = [
        {
          id: 'intro',
          role: 'robot',
          text: `${this.currentRobotTip.title}: ${this.currentRobotTip.text}`,
        },
        {
          id: 'context',
          role: 'robot',
          text: `Estou olhando ${this.summary?.top?.length || 0} obras do top visivel, com ${this.selectedDistricts.length} distritais e ${this.selectedStatuses.length} status ativos.`,
        },
      ];

      if (strongestDistrict) {
        messages.push({
          id: 'leading-district',
          role: 'robot',
          text: `${strongestDistrict.label} esta puxando ${this.formatCurrency(strongestDistrict.totalValue)} do que aparece agora na tabela.`,
        });
      }

      return messages;
    },
    buildRobotReactionMessage(source) {
      const strongestDistrict = this.visibleDistrictTotals[0];
      const prefix = source === 'districts'
        ? 'Atualizei o filtro distrital.'
        : source === 'statuses'
          ? 'Atualizei o filtro de status.'
          : 'Recalculei o recorte.';
      const districtText = strongestDistrict
        ? `${strongestDistrict.label} lidera o top visivel com ${this.formatCurrency(strongestDistrict.totalValue)}.`
        : 'Nao encontrei concentracao relevante no top atual.';
      return `${prefix} Agora vejo ${this.summary?.top?.length || 0} obras somando ${this.formatCurrency(this.summary?.totalVisibleValue || 0)}. ${districtText}`;
    },
    pulseRobot() {
      this.robotAnimating = true;
      window.setTimeout(() => {
        this.robotAnimating = false;
      }, 720);
    },
    openRobotChat() {
      this.robotChatMessages = this.createRobotContextMessages();
      this.robotChatOpen = true;
      this.pulseRobot();
    },
    closeRobotChat() {
      this.robotChatOpen = false;
    },
    toggleRobotChat() {
      if (this.robotChatOpen) {
        this.closeRobotChat();
        return;
      }
      this.openRobotChat();
    },
    appendRobotMessage(text, role = 'robot') {
      this.robotChatMessages = [
        ...this.robotChatMessages,
        {
          id: `${role}-${Date.now()}-${this.robotChatMessages.length}`,
          role,
          text,
        },
      ];
    },
    async setStatusesAndReload(statuses, successMessage) {
      this.pendingRobotReaction = null;
      this.selectedStatuses = statuses;
      await this.loadAll();
      this.appendRobotMessage(successMessage);
    },
    async runRobotAction(actionId) {
      if (actionId === 'summary') {
        this.appendRobotMessage(`O top atual soma ${this.formatCurrency(this.summary?.totalVisibleValue || 0)} e mostra ${this.summary?.top?.length || 0} obras visiveis.`);
        return;
      }

      if (actionId === 'focus-leading-district') {
        const strongestDistrict = this.visibleDistrictTotals[0];
        if (!strongestDistrict) {
          this.appendRobotMessage('Nao encontrei uma distrital lider no recorte atual.');
          return;
        }

        this.pendingRobotReaction = null;
        this.selectedDistricts = [strongestDistrict.label];
        await this.loadAll();
        this.appendRobotMessage(`Apliquei foco em ${strongestDistrict.label}. Agora o recorte ficou concentrado nela.`);
        return;
      }

      if (actionId === 'only-non-liberada') {
        await this.setStatusesAndReload(['NAO LIBERADA'], 'Deixei visivel apenas o status NAO LIBERADA.');
        return;
      }

      if (actionId === 'only-programada') {
        await this.setStatusesAndReload(['PROGRAMADA'], 'Agora estou olhando somente PROGRAMADA.');
        return;
      }

      if (actionId === 'compare-districts') {
        const [firstDistrict, secondDistrict] = this.visibleDistrictTotals;
        if (!firstDistrict || !secondDistrict) {
          this.appendRobotMessage('Preciso de pelo menos duas distritais no top visivel para comparar.');
          return;
        }
        const difference = firstDistrict.totalValue - secondDistrict.totalValue;
        this.appendRobotMessage(`${firstDistrict.label} supera ${secondDistrict.label} por ${this.formatCurrency(difference)} dentro do top visivel.`);
        return;
      }

      if (actionId === 'restore-filters') {
        this.pendingRobotReaction = null;
        this.selectedDistricts = this.districtOptions.slice();
        this.selectedStatuses = this.statusOptions.slice();
        await this.loadAll();
        this.appendRobotMessage('Restaurei o recorte padrao de distritais e status.');
        return;
      }
    },
    async submitRobotInput() {
      const command = this.robotInput;
      if (!command) return;

      this.appendRobotMessage(command, 'system');
      this.robotInput = '';

      const normalized = command
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();

      if (normalized.includes('resumo') || normalized.includes('sumario') || normalized.includes('top')) {
        await this.runRobotAction('summary');
        return;
      }

      if (normalized.includes('lider') || normalized.includes('focar')) {
        await this.runRobotAction('focus-leading-district');
        return;
      }

      if (normalized.includes('nao liberada')) {
        await this.runRobotAction('only-non-liberada');
        return;
      }

      if (normalized.includes('programada')) {
        await this.runRobotAction('only-programada');
        return;
      }

      if (normalized.includes('compar') || normalized.includes('distrital')) {
        await this.runRobotAction('compare-districts');
        return;
      }

      if (normalized.includes('restaurar') || normalized.includes('reset')) {
        await this.runRobotAction('restore-filters');
        return;
      }

      if (normalized.includes('origem') || normalized.includes('planilha')) {
        this.appendRobotMessage('Estou lendo o arquivo ACOM-OBRAS-2025.xlsx na aba OBRAS, usando os campos NOTA, DESCRITIVO, DISTRITAL, MUNICIPIO, STATUS OBRA e PROJETADO R$.');
        return;
      }

      this.appendRobotMessage('Ainda nao entendi esse comando. Tente: resumo, focar lider, so nao liberada, programada, comparar ou restaurar.');
    },
    formatCurrency(v) {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
    }
  }
};
</script>

<style scoped>
.oportunidades-shell {
  position: relative;
  min-height: 100%;
  padding: 0;
  overflow: hidden;
}

.oportunidades-backdrop {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 12% 10%, rgba(14, 165, 233, 0.18), transparent 24%),
    radial-gradient(circle at 88% 8%, rgba(37, 99, 235, 0.16), transparent 22%),
    linear-gradient(180deg, rgba(3, 8, 18, 0.62), rgba(7, 15, 28, 0.18) 32%, transparent 60%);
  pointer-events: none;
}

.oportunidades-frame {
  position: relative;
  z-index: 1;
  width: 100%;
  padding: clamp(24px, 4vw, 42px);
}

.oportunidades-hero {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(320px, 0.95fr);
  gap: 20px;
  align-items: stretch;
  margin-bottom: 22px;
}

.hero-copy,
.hero-stats,
.control-surface,
.results-card,
.state-panel {
  backdrop-filter: blur(14px);
}

.hero-copy {
  position: relative;
  padding: clamp(26px, 4vw, 38px);
  padding-right: clamp(180px, 20vw, 240px);
  min-height: 220px;
  border-radius: 30px;
  background:
    linear-gradient(135deg, rgba(5, 15, 31, 0.88), rgba(9, 24, 48, 0.72)),
    radial-gradient(circle at top left, rgba(56, 189, 248, 0.28), transparent 32%);
  border: 1px solid rgba(125, 211, 252, 0.16);
  box-shadow: 0 26px 54px rgba(2, 6, 23, 0.22);
}

.hero-kicker,
.results-kicker,
.stat-label,
.panel-kicker,
.filter-title {
  margin: 0 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.72rem;
  color: rgba(226, 232, 240, 0.7);
}

.hero-copy h1,
.results-head h2 {
  margin: 0;
  font-family: 'Space Grotesk', sans-serif;
  letter-spacing: -0.05em;
}

.hero-copy h1 {
  font-size: clamp(2.4rem, 6vw, 4.5rem);
  color: #f8fbff;
  line-height: 0.95;
}

.hero-text {
  margin: 16px 0 0;
  max-width: 58ch;
  color: rgba(226, 232, 240, 0.82);
  font-size: 1rem;
  line-height: 1.65;
}

.hero-robot-dock {
  position: absolute;
  right: 24px;
  bottom: 24px;
  display: flex;
  align-items: end;
  gap: 14px;
}

.robot-bubble {
  width: min(240px, 28vw);
  padding: 14px 16px;
  border-radius: 20px 20px 8px 20px;
  background: linear-gradient(180deg, rgba(12, 27, 49, 0.96), rgba(15, 23, 42, 0.86));
  border: 1px solid rgba(125, 211, 252, 0.18);
  box-shadow: 0 18px 28px rgba(2, 6, 23, 0.22);
}

.robot-bubble__eyebrow {
  display: block;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.64rem;
  color: rgba(125, 211, 252, 0.7);
}

.robot-bubble strong {
  display: block;
  color: #f8fbff;
  font-size: 0.95rem;
}

.robot-bubble p {
  margin: 6px 0 0;
  color: rgba(226, 232, 240, 0.78);
  font-size: 0.84rem;
  line-height: 1.45;
}

.robot-bubble__next {
  margin-top: 12px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #7dd3fc;
  font-size: 0.78rem;
  font-weight: 600;
}

.robot-trigger {
  width: 76px;
  height: 76px;
  border: 0;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(10, 23, 42, 0.96), rgba(20, 51, 95, 0.94));
  border: 1px solid rgba(56, 189, 248, 0.24);
  box-shadow: 0 20px 32px rgba(14, 165, 233, 0.16);
  display: grid;
  place-items: center;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.robot-trigger.is-active {
  border-color: rgba(125, 211, 252, 0.52);
  box-shadow: 0 24px 36px rgba(37, 99, 235, 0.28);
}

.robot-trigger.is-animating {
  animation: robotPulse 0.72s ease;
}

.robot-trigger.is-loading {
  box-shadow: 0 24px 40px rgba(14, 165, 233, 0.24);
}

.robot-trigger:hover {
  transform: translateY(-2px);
  border-color: rgba(125, 211, 252, 0.4);
  box-shadow: 0 24px 36px rgba(37, 99, 235, 0.22);
}

.robot-head {
  position: relative;
  width: 38px;
  height: 32px;
  border-radius: 14px;
  background: linear-gradient(180deg, #dbeafe, #93c5fd);
  display: grid;
  place-items: center;
}

.robot-head.is-loading {
  animation: robotHeadBoil 0.42s ease-in-out infinite;
}

.robot-antenna {
  position: absolute;
  top: -12px;
  left: 50%;
  width: 4px;
  height: 12px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: rgba(147, 197, 253, 0.88);
}

.robot-antenna::after {
  content: '';
  position: absolute;
  top: -6px;
  left: 50%;
  width: 10px;
  height: 10px;
  transform: translateX(-50%);
  border-radius: 50%;
  background: #38bdf8;
  box-shadow: 0 0 16px rgba(56, 189, 248, 0.8);
}

.robot-face {
  display: flex;
  gap: 8px;
}

.robot-eye {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #0f172a;
  box-shadow: 0 0 10px rgba(14, 165, 233, 0.35);
}

.robot-head.is-loading .robot-eye {
  animation: robotEyeBoil 0.3s steps(2, end) infinite;
}

.robot-mouth {
  position: absolute;
  left: 50%;
  bottom: 7px;
  width: 14px;
  height: 4px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.8);
}

.robot-steam {
  position: absolute;
  bottom: calc(100% - 4px);
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: rgba(125, 211, 252, 0.92);
  opacity: 0;
  filter: blur(0.2px);
  pointer-events: none;
}

.robot-steam--left {
  left: 4px;
}

.robot-steam--center {
  left: 50%;
  transform: translateX(-50%);
}

.robot-steam--right {
  right: 4px;
}

.robot-head.is-loading .robot-steam--left {
  animation: robotSteamRise 0.95s ease-out infinite;
}

.robot-head.is-loading .robot-steam--center {
  animation: robotSteamRise 0.95s ease-out 0.18s infinite;
}

.robot-head.is-loading .robot-steam--right {
  animation: robotSteamRise 0.95s ease-out 0.34s infinite;
}

.robot-chat-shell {
  position: fixed;
  right: 26px;
  bottom: 24px;
  z-index: 40;
  display: grid;
  grid-template-columns: 140px minmax(320px, 420px);
  align-items: end;
  gap: 16px;
}

.robot-avatar-panel {
  padding: 18px 12px;
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(8, 21, 40, 0.96), rgba(11, 31, 60, 0.9));
  border: 1px solid rgba(125, 211, 252, 0.18);
  box-shadow: 0 24px 42px rgba(2, 6, 23, 0.36);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
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

.robot-chat-panel {
  min-height: 420px;
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
  align-items: center;
  justify-content: space-between;
  gap: 12px;
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

.robot-chat-close {
  padding: 8px 12px;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.16);
  background: rgba(148, 163, 184, 0.08);
  color: #cbd5e1;
}

.robot-chat-messages {
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow: auto;
}

.robot-message {
  max-width: 88%;
  padding: 12px 14px;
  border-radius: 18px;
  border: 1px solid rgba(125, 211, 252, 0.12);
}

.robot-message--robot {
  align-self: flex-start;
  background: rgba(14, 165, 233, 0.1);
}

.robot-message--system {
  align-self: flex-end;
  background: rgba(148, 163, 184, 0.08);
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
}

.robot-chat-actions {
  padding: 14px 18px 18px;
  border-top: 1px solid rgba(125, 211, 252, 0.12);
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.robot-chat-action {
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

.robot-chat-input {
  padding: 0 18px 18px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
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

.robot-chat-shell-enter-active,
.robot-chat-shell-leave-active {
  transition: opacity 0.24s ease, transform 0.24s ease;
}

.robot-chat-shell-enter-from,
.robot-chat-shell-leave-to {
  opacity: 0;
  transform: translateY(18px) scale(0.98);
}

@keyframes robotPulse {
  0% { transform: scale(1); }
  35% { transform: scale(1.08) rotate(-4deg); }
  70% { transform: scale(0.98) rotate(3deg); }
  100% { transform: scale(1); }
}

@keyframes robotHeadBoil {
  0% { transform: translate(0, 0) rotate(0deg); }
  20% { transform: translate(-1px, -1px) rotate(-2deg); }
  40% { transform: translate(1px, 0) rotate(2deg); }
  60% { transform: translate(-1px, 1px) rotate(-1deg); }
  80% { transform: translate(1px, -1px) rotate(1deg); }
  100% { transform: translate(0, 0) rotate(0deg); }
}

@keyframes robotEyeBoil {
  0%, 100% { transform: scaleY(1); }
  50% { transform: scaleY(0.35); }
}

@keyframes robotSteamRise {
  0% {
    opacity: 0;
    transform: translateY(0) scale(0.5);
  }
  20% {
    opacity: 0.85;
  }
  100% {
    opacity: 0;
    transform: translateY(-16px) scale(1.35);
  }
}

@keyframes robotHover {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-6px); }
}

@keyframes robotBlink {
  0%, 44%, 48%, 100% { transform: scaleY(1); }
  46% { transform: scaleY(0.15); }
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
  0% { opacity: 0; transform: translateX(-50%) translateY(-18px) scale(0.84); }
  100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}

@keyframes robotTorsoIn {
  0% { opacity: 0; transform: translateX(-50%) translateY(20px) scale(0.86); }
  100% { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
}

@keyframes robotArmIn {
  0% { opacity: 0; transform: translateY(-10px) rotate(0deg); }
  100% { opacity: 1; }
}

@keyframes robotLegIn {
  0% { opacity: 0; transform: translateY(14px) scaleY(0.7); }
  100% { opacity: 1; transform: translateY(0) scaleY(1); }
}

.hero-stats {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.stat-card {
  padding: 22px 22px 20px;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(11, 22, 41, 0.84), rgba(15, 23, 42, 0.62));
  border: 1px solid rgba(148, 163, 184, 0.16);
  box-shadow: 0 18px 34px rgba(2, 6, 23, 0.16);
}

.stat-card--accent {
  background:
    radial-gradient(circle at top right, rgba(56, 189, 248, 0.26), transparent 42%),
    linear-gradient(180deg, rgba(11, 22, 41, 0.9), rgba(15, 23, 42, 0.66));
}

.stat-card strong {
  display: block;
  font-size: 1.2rem;
  color: #f8fbff;
}

.control-surface {
  display: grid;
  grid-template-columns: minmax(0, 1.3fr) minmax(320px, 1fr);
  gap: 18px;
  margin-bottom: 22px;
}

.scope-panel,
.filter-panel {
  padding: 22px;
  border-radius: 28px;
  background:
    linear-gradient(180deg, rgba(10, 19, 35, 0.9), rgba(13, 26, 46, 0.82)),
    radial-gradient(circle at top left, rgba(56, 189, 248, 0.08), transparent 38%);
  border: 1px solid rgba(125, 211, 252, 0.12);
  box-shadow: 0 18px 38px rgba(2, 6, 23, 0.18);
}

.panel-kicker,
.filter-title {
  color: rgba(191, 219, 254, 0.62);
}

.scope-switch {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.scope-pill {
  padding: 16px 18px;
  border-radius: 22px;
  border: 1px solid rgba(56, 189, 248, 0.16);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.02));
  color: #e2e8f0;
  text-align: left;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.scope-pill:hover {
  transform: translateY(-2px);
  border-color: rgba(56, 189, 248, 0.34);
  box-shadow: 0 14px 28px rgba(14, 165, 233, 0.12);
}

.scope-pill.active {
  background: linear-gradient(135deg, rgba(14, 165, 233, 0.24), rgba(37, 99, 235, 0.2));
  border-color: rgba(56, 189, 248, 0.48);
  box-shadow: 0 18px 30px rgba(37, 99, 235, 0.16);
}

.scope-pill__title {
  display: block;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.scope-pill__meta {
  display: block;
  margin-top: 4px;
  color: rgba(191, 219, 254, 0.56);
  font-size: 0.78rem;
}

.filter-panel {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.filter-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.filter-chip {
  padding: 9px 14px;
  border-radius: 999px;
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.16);
  color: #dbeafe;
  font-size: 0.84rem;
}

.filter-chip--soft {
  background: rgba(148, 163, 184, 0.08);
  border-color: rgba(148, 163, 184, 0.12);
  color: #cbd5e1;
}

.filter-chip--button {
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
}

.filter-chip--button:hover {
  transform: translateY(-1px);
  border-color: rgba(125, 211, 252, 0.2);
}

.filter-chip--button.active {
  background: rgba(56, 189, 248, 0.16);
  border-color: rgba(56, 189, 248, 0.24);
  color: #e0f2fe;
  box-shadow: 0 10px 18px rgba(14, 165, 233, 0.12);
}

.results-card,
.state-panel {
  border-radius: 30px;
  border: 1px solid rgba(125, 211, 252, 0.1);
  background:
    linear-gradient(180deg, rgba(9, 18, 34, 0.96), rgba(12, 24, 44, 0.98)),
    radial-gradient(circle at top left, rgba(56, 189, 248, 0.08), transparent 40%);
  box-shadow: 0 28px 58px rgba(2, 6, 23, 0.24);
}

.results-card {
  overflow: hidden;
}

.results-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
  padding: 28px 28px 0;
}

.results-kicker {
  color: rgba(191, 219, 254, 0.6);
}

.results-head h2 {
  color: #f8fbff;
  font-size: clamp(1.5rem, 3vw, 2.2rem);
}

.results-date {
  margin: 0;
  color: rgba(191, 219, 254, 0.62);
  font-size: 0.92rem;
}

.district-overview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  padding: 22px 28px 0;
}

.district-card {
  padding: 18px;
  border-radius: 22px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.03), rgba(255, 255, 255, 0.02));
  border: 1px solid rgba(125, 211, 252, 0.1);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.district-card span {
  font-size: 0.8rem;
  color: rgba(191, 219, 254, 0.6);
}

.district-card strong {
  color: #f8fbff;
  font-size: 1.3rem;
}

.results-table-wrap {
  padding: 22px 28px 28px;
  overflow-x: auto;
}

.oportunidades-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
}

.oportunidades-table thead th {
  padding: 0 14px 14px 0;
  border-bottom: 1px solid rgba(125, 211, 252, 0.14);
  color: rgba(191, 219, 254, 0.62);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
}

.oportunidades-table tbody td {
  padding: 18px 14px 18px 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
  color: #cbd5e1;
  vertical-align: middle;
}

.rank-badge {
  display: inline-grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: 14px;
  background: linear-gradient(135deg, #0ea5e9, #2563eb);
  color: #f8fafc;
  font-weight: 700;
  box-shadow: 0 10px 20px rgba(37, 99, 235, 0.22);
}

.obra-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.obra-cell strong {
  color: #f8fbff;
  font-size: 0.98rem;
}

.obra-cell small {
  color: rgba(191, 219, 254, 0.56);
}

.faturamento-cell {
  font-weight: 800;
  color: #e0f2fe;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 8px 12px;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.12);
  color: #e2e8f0;
  font-size: 0.8rem;
  font-weight: 600;
}

.empty-row {
  text-align: center;
  color: rgba(191, 219, 254, 0.56);
}

.state-panel {
  padding: 28px;
  color: #cbd5e1;
}

.state-panel--error {
  border-color: rgba(239, 68, 68, 0.22);
  color: #991b1b;
  background: linear-gradient(180deg, rgba(254, 242, 242, 0.98), rgba(254, 226, 226, 0.94));
}

.text-end {
  text-align: right;
}

@media (max-width: 1120px) {
  .oportunidades-hero,
  .control-surface {
    grid-template-columns: 1fr;
  }

  .hero-copy {
    padding-right: clamp(26px, 4vw, 38px);
    padding-bottom: 170px;
  }

  .hero-robot-dock {
    left: 24px;
    right: 24px;
    justify-content: space-between;
  }

  .robot-bubble {
    width: min(100%, 420px);
  }

  .robot-chat-shell {
    right: 18px;
    left: 18px;
    grid-template-columns: 120px minmax(0, 1fr);
  }

  .scope-switch {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 820px) {
  .district-overview {
    grid-template-columns: 1fr;
  }

  .results-head {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 640px) {
  .oportunidades-frame {
    padding: 18px;
  }

  .hero-copy {
    min-height: auto;
    padding-bottom: 26px;
  }

  .hero-robot-dock {
    position: static;
    margin-top: 20px;
    align-items: stretch;
    flex-direction: column;
  }

  .robot-bubble {
    width: 100%;
  }

  .robot-chat-shell {
    left: 12px;
    right: 12px;
    bottom: 12px;
    grid-template-columns: 1fr;
  }

  .robot-avatar-panel {
    display: none;
  }

  .robot-chat-panel {
    min-height: 62vh;
  }

  .robot-chat-input {
    grid-template-columns: 1fr;
  }

  .scope-switch,
  .hero-stats {
    grid-template-columns: 1fr;
  }

  .results-head,
  .district-overview,
  .results-table-wrap {
    padding-left: 18px;
    padding-right: 18px;
  }
}
</style>
