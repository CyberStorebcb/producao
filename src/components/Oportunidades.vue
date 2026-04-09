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

            <div class="robot-trigger-wrapper" data-robot="true" aria-label="Robô assistente operacional">
              <button
                type="button"
                class="robot-trigger"
                :class="{ 'is-active': robotChatOpen, 'is-animating': robotAnimating, 'is-loading': loading }"
                @click.stop="toggleRobotChat($event)"
                :aria-label="robotChatOpen ? 'Fechar chat do robô' : 'Abrir chat do robô'"
              >
                <span class="robot-head" :class="{ 'is-loading': loading }">
                  <span class="robot-antenna" :class="{ 'robot-antenna--active': showFullListMode }"></span>
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
              <button
                type="button"
                class="robot-antenna-button"
                data-robot-antenna="true"
                @click.stop.prevent="toggleFullListMode"
                title="Clique para exibir lista completa"
                aria-label="Exibir a antena do robô e ativar exibição completa"
              ></button>
            </div>
          </div>
        </div>

        <div class="hero-stats" v-if="summary">
          <div class="stat-card stat-card--accent">
            <span class="stat-label">Distritais selecionadas</span>
            <strong>{{ selectedDistricts.length }}</strong>
          </div>
          <div class="stat-card">
            <span class="stat-label">Registros no top</span>
            <strong>{{ displayedTop.length }}</strong>
          </div>
          <div class="stat-card">
            <span class="stat-label">Valor consolidado</span>
            <strong>{{ formatCurrency(displayedVisibleValue) }}</strong>
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
              :class="{ active: selectedDistricts.includes(scope), 'is-chat-applied': chatAppliedFilters.districts.includes(scope) }"
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

          <div class="filter-group" :class="{ 'filter-group--chat-applied': chatAppliedFilters.statuses.length > 0 }">
            <span class="filter-title">Status da obra</span>
            <div class="filter-chips">
              <button
                v-for="status in statusOptions"
                :key="status"
                type="button"
                class="filter-chip filter-chip--soft filter-chip--button"
                :class="{ active: selectedStatuses.includes(status), 'is-chat-applied': chatAppliedFilters.statuses.includes(status) }"
                :aria-pressed="selectedStatuses.includes(status)"
                @click="toggleStatus(status)"
              >
                {{ status }}
              </button>
            </div>
          </div>

          <div class="filter-group" :class="{ 'filter-group--chat-applied': chatAppliedFilters.progress.length > 0 }">
            <span class="filter-title">Andamento em campo</span>
            <div class="filter-chips">
              <button
                v-for="progress in progressOptions"
                :key="progress"
                type="button"
                class="filter-chip filter-chip--soft filter-chip--button"
                :class="{ active: selectedProgressStates.includes(progress), 'is-chat-applied': chatAppliedFilters.progress.includes(progress) }"
                :aria-pressed="selectedProgressStates.includes(progress)"
                @click="toggleProgress(progress)"
              >
                {{ progress }}
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
            <p class="results-kicker">{{ resultModeLabel }}</p>
            <h2>Maiores valores após os filtros</h2>
          </div>
          <div class="results-head__meta">
            <div class="results-filter">
              <label class="results-filter__label" for="search-code">Buscar por NOTA ou PEP</label>
              <div class="filter-search">
                <input
                  id="search-code"
                  type="search"
                  v-model="searchCode"
                  class="filter-search__input"
                  placeholder="Digite número de NOTA ou PEP"
                  @keydown.enter.prevent="applySearchCode"
                  aria-label="Buscar por nota ou pep"
                />
                <button type="button" class="filter-search__button" @click="applySearchCode">
                  Buscar
                </button>
                <button
                  v-if="searchCode"
                  type="button"
                  class="filter-search__clear"
                  @click="clearSearchCode"
                  aria-label="Limpar busca"
                >
                  ×
                </button>
              </div>
            </div>
            <p class="results-date">{{ summary.summary.totalCandidates }} registros elegíveis após o filtro</p>
          </div>
        </header>

        <div v-if="minVisibleValue > 0 || maxVisibleValue > 0" class="results-cutoff" :class="{ 'results-cutoff--chat-applied': Boolean(chatAppliedFilters.value) }">
          <span v-if="minVisibleValue > 0 && maxVisibleValue > 0">
            Corte visível ativo: entre {{ formatCurrency(minVisibleValue) }} e {{ formatCurrency(maxVisibleValue) }}
          </span>
          <span v-else-if="minVisibleValue > 0">
            Corte visível ativo: acima de {{ formatCurrency(minVisibleValue) }}
          </span>
          <span v-else>
            Corte visível ativo: até {{ formatCurrency(maxVisibleValue) }}
          </span>
          <strong v-if="chatAppliedFilters.value" class="results-cutoff__badge">Aplicado pelo robô</strong>
        </div>

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
              <tr v-for="(item, idx) in displayedTop" :key="item.code">
                <td>
                  <span class="rank-badge">{{ idx + 1 }}</span>
                </td>
                <td>
                  <div class="obra-cell">
                    <strong>{{ item.display }}</strong>
                    <small v-if="item.displaySecondary">{{ item.displaySecondary }}</small>
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
              <tr v-if="displayedTop.length === 0">
                <td colspan="7" class="empty-row">Nenhuma obra encontrada com os filtros atuais.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>

      <transition name="robot-chat-shell">
        <aside v-if="robotChatOpen" class="robot-chat-shell" aria-label="Chat do robô de oportunidades">
          <div class="robot-avatar-panel" :class="{ 'is-animating': robotAnimating }" @click="toggleRobotChat($event)" role="button" tabindex="0">
            <div class="robot-full">
              <div class="robot-full__antenna" :class="{ 'robot-full__antenna--active': showFullListMode }"></div>
              <button
                type="button"
                class="robot-full-antenna-button"
                @click.stop.prevent="toggleFullListMode"
                aria-label="Exibir lista completa"
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

          <section class="robot-chat-panel">
            <header class="robot-chat-panel__head">
              <div>
                <span class="robot-chat-panel__eyebrow">Chat do robô</span>
                <strong>{{ currentRobotTip.title }}</strong>
                <p class="robot-chat-panel__meta">{{ robotChatMessages.length }} mensagens na sessão atual</p>
              </div>
              <div class="robot-chat-panel__controls">
                <button type="button" class="robot-chat-clear" @click="clearRobotChat">
                  Limpar
                </button>
                <button type="button" class="robot-chat-close" @click="closeRobotChat">
                  Fechar
                </button>
              </div>
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

            <div class="robot-chat-composer">
              <div class="robot-chat-section">
                <div class="robot-chat-section__head">
                  <span class="robot-chat-section__label">Ações rápidas</span>
                  <button
                    type="button"
                    class="robot-chat-section__toggle"
                    :aria-expanded="String(showRobotActions)"
                    @click="toggleRobotActions"
                  >
                    {{ showRobotActions ? 'Ocultar' : 'Mostrar' }}
                  </button>
                </div>
                <div v-if="showRobotActions" class="robot-chat-actions">
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
              </div>

              <div v-if="robotSuggestions.length" class="robot-chat-section">
                <span class="robot-chat-section__label">Sugestões</span>
                <div class="robot-chat-suggestions">
                  <button
                    v-for="suggestion in robotSuggestions"
                    :key="suggestion"
                    type="button"
                    class="robot-chat-suggestion"
                    @click="applyRobotSuggestion(suggestion)"
                    :title="suggestion"
                  >
                    {{ suggestion }}
                  </button>
                </div>
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
            </div>
          </section>
        </aside>
      </transition>

      <transition name="robot-follow">
        <button
          v-if="showFloatingRobot"
          type="button"
          class="robot-follower"
          :class="{ 'is-loading': loading, 'is-entering': robotFollowerEntering }"
          @click="openRobotChat"
          aria-label="Abrir chat do robô flutuante"
        >
          <span class="robot-follower__rotor"></span>
          <span class="robot-head robot-head--follower" :class="{ 'is-loading': loading }">
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
      </transition>
    </div>
  </section>
</template>

<script>
import { classify, generateResponse } from '../../shared/robotConversation.mjs';
import { addEntry as logAddEntry } from '../../shared/robotConversationLogs.mjs';
import { findDistrictsInText } from '../../shared/districts.mjs';
export default {
  name: 'Oportunidades',
  props: {
    topN: { type: Number, default: 10 }
  },
  data() {
    return {
      currentTopN: 10,
      showFullListMode: false,
      searchCode: '',
      selectedDistricts: ['BACABAL', 'ITAPECURU MIRIM', 'SANTA INÊS'],
      selectedStatuses: ['NAO LIBERADA', 'OBRA LIBERADA', 'PROGRAMADA', 'REPROGRAMAR'],
      selectedProgressStates: ['EM ANDAMENTO', 'SEM ANDAMENTO'],
      summary: null,
      loading: true,
      error: null,
      robotTipIndex: 0,
      robotChatOpen: false,
      robotAnimating: false,
      robotChatMessages: [],
      robotInput: '',
      robotLoggingEnabled: false,
      showRobotActions: false,
      chatAppliedFilters: {
        districts: [],
        statuses: [],
        progress: [],
        value: null,
      },
      pendingRobotReaction: null,
      minVisibleValue: 0,
      maxVisibleValue: 0,
      isRobotFollowing: false,
      robotFollowerEntering: false,
      robotSessionKey: 'oportunidades-robot-session-v2',
    };
  },
  computed: {
    districtOptions() {
      return ['BACABAL', 'ITAPECURU MIRIM', 'SANTA INÊS'];
    },
    statusOptions() {
      return ['NAO LIBERADA', 'OBRA LIBERADA', 'PROGRAMADA', 'REPROGRAMAR'];
    },
    progressOptions() {
      return ['EM ANDAMENTO', 'SEM ANDAMENTO'];
    },
    visibleDistrictTotals() {
      if (!this.displayedTop.length) return [];

      const totalsByDistrict = new Map();
      this.displayedTop.forEach((item) => {
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
    displayedTop() {
      const top = this.summary?.top || [];
      const searchTerm = String(this.searchCode || '').trim().toUpperCase();
      return top.filter((item) => {
        const total = Number(item.total) || 0;
        if (this.minVisibleValue > 0 && total < this.minVisibleValue) return false;
        if (this.maxVisibleValue > 0 && total > this.maxVisibleValue) return false;
        if (searchTerm) {
          const note = String(item.note || '').toUpperCase();
          const pep = String(item.pep || '').toUpperCase();
          const display = String(item.display || '').toUpperCase();
          if (!note.includes(searchTerm) && !pep.includes(searchTerm) && !display.includes(searchTerm)) {
            return false;
          }
        }
        return true;
      });
    },
    displayedVisibleValue() {
      return this.displayedTop.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    },
    robotTips() {
      const districtCount = this.selectedDistricts.length;
      const statusCount = this.selectedStatuses.length;
      const progressCount = this.selectedProgressStates.length;
      const visibleCount = this.displayedTop.length;
      const visibleValue = this.displayedVisibleValue || 0;
      const strongestDistrict = this.visibleDistrictTotals[0];

      return [
        {
          title: 'Radar ativo',
          text: `${districtCount} distritais, ${statusCount} status e ${progressCount} filtros de andamento estao compondo a leitura atual.`,
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
        { id: 'clear-min-value', label: 'Remover corte de valor' },
        { id: 'restore-filters', label: 'Restaurar filtros' },
      ];
    },
    baseSuggestionCatalog() {
      return [
        'Mostre Bacabal contra Santa Ines',
        'Quero so obras acima de 300 mil',
        'Resuma o top atual',
        'Compare as distritais ativas',
        'Quero so programada',
        'Restaurar filtros',
        'Qual a origem dos dados?',
        'Remover corte de valor',
      ];
    },
    contextSuggestionCatalog() {
      const suggestions = [];
      const strongestDistrict = this.visibleDistrictTotals[0];
      const cheapThreshold = this.getSuggestedCutoff('cheap');
      const expensiveThreshold = this.getSuggestedCutoff('expensive');

      if (this.selectedDistricts.length > 1 && strongestDistrict) {
        suggestions.push(`Sem ${strongestDistrict.label}`);
      }

      if (this.selectedStatuses.includes('PROGRAMADA')) {
        suggestions.push('Nao quero programadas');
      }

      if (this.selectedProgressStates.length > 1) {
        suggestions.push('Quero so obras em andamento');
      }

      if (!this.maxVisibleValue && cheapThreshold > 0) {
        suggestions.push(`Quero obras baratas ate ${this.formatSuggestionValue(cheapThreshold)}`);
      }

      if (!this.minVisibleValue && expensiveThreshold > 0) {
        suggestions.push(`Quero obras grandes acima de ${this.formatSuggestionValue(expensiveThreshold)}`);
      }

      if (this.displayedTop.length === 0) {
        suggestions.push('Restaurar filtros');
      }

      return Array.from(new Set(suggestions));
    },
    suggestionCatalog() {
      return [...this.contextSuggestionCatalog, ...this.baseSuggestionCatalog];
    },
    resultModeLabel() {
      return this.showFullListMode
        ? 'Exibição completa sem restrição'
        : `Top ${this.currentTopN} filtrado`;
    },
    robotSuggestions() {
      const query = this.normalizeText(this.robotInput || '');
      const suggestions = query
        ? this.suggestionCatalog.filter((item) => this.normalizeText(item).includes(query))
        : this.suggestionCatalog;
      return suggestions.slice(0, 5);
    },
    showFloatingRobot() {
      return this.isRobotFollowing && !this.robotChatOpen;
    },
  },
  mounted() {
    this.currentTopN = Number(this.topN) > 0 ? Number(this.topN) : 10;
    this.restoreRobotSession();
    this.loadAll();
    window.addEventListener('scroll', this.handleWindowScroll, { passive: true });
    this.handleWindowScroll();
  },
  beforeUnmount() {
    window.removeEventListener('scroll', this.handleWindowScroll);
    if (this.searchCodeTimer) {
      window.clearTimeout(this.searchCodeTimer);
      this.searchCodeTimer = null;
    }
  },
  methods: {
    async fetchOportunidades() {
      const query = new URLSearchParams({
        topN: String(this.showFullListMode ? 999999 : this.currentTopN),
        districts: this.selectedDistricts.join(','),
        statuses: this.selectedStatuses.join(','),
        progress: this.selectedProgressStates.join(','),
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
          if (this.robotChatMessages.length === 0) {
            this.robotChatMessages = this.createRobotContextMessages();
          }
        }
        this.persistRobotSession();
      } catch (err) {
        this.error = String(err.message || err);
      } finally {
        this.loading = false;
      }
    },
    applySearchCode() {
      this.pendingRobotReaction = null;
    },
    clearSearchCode() {
      this.searchCode = '';
    },
    toggleDistrict(scope) {
      const isSelected = this.selectedDistricts.includes(scope);
      if (isSelected && this.selectedDistricts.length === 1) return;

      this.selectedDistricts = isSelected
        ? this.selectedDistricts.filter((item) => item !== scope)
        : [...this.selectedDistricts, scope];
      this.clearChatAppliedFilter('districts');
      this.pendingRobotReaction = 'districts';
      this.loadAll();
    },
    toggleStatus(status) {
      const isSelected = this.selectedStatuses.includes(status);
      if (isSelected && this.selectedStatuses.length === 1) return;

      this.selectedStatuses = isSelected
        ? this.selectedStatuses.filter((item) => item !== status)
        : [...this.selectedStatuses, status];
      this.clearChatAppliedFilter('statuses');
      this.pendingRobotReaction = 'statuses';
      this.loadAll();
    },
    toggleProgress(progress) {
      const isSelected = this.selectedProgressStates.includes(progress);
      if (isSelected && this.selectedProgressStates.length === 1) return;

      this.selectedProgressStates = isSelected
        ? this.selectedProgressStates.filter((item) => item !== progress)
        : [...this.selectedProgressStates, progress];
      this.clearChatAppliedFilter('progress');
      this.pendingRobotReaction = 'progress';
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
          text: `Estou olhando ${this.displayedTop.length} obras do top visivel, com ${this.selectedDistricts.length} distritais, ${this.selectedStatuses.length} status e ${this.selectedProgressStates.length} filtros de andamento ativos.`,
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
          : source === 'progress'
            ? 'Atualizei o filtro de andamento.'
          : 'Recalculei o recorte.';
      const districtText = strongestDistrict
        ? `${strongestDistrict.label} lidera o top visivel com ${this.formatCurrency(strongestDistrict.totalValue)}.`
        : 'Nao encontrei concentracao relevante no top atual.';
      return `${prefix} Agora vejo ${this.displayedTop.length} obras somando ${this.formatCurrency(this.displayedVisibleValue || 0)}. ${districtText}`;
    },
    extractTopCountCommand(normalized) {
      const absoluteMatch = normalized.match(/(?:top|exiba|mostrar|mostre|listar|liste|quero)\s*(?:as|os)?\s*(?:top\s*)?(\d+)\s*(?:obras|itens|oportunidades)?/i);
      if (absoluteMatch) {
        const count = Number(absoluteMatch[1]);
        if (count > 0) {
          return { type: 'set', count };
        }
      }

      const relativeMatch = normalized.match(/(?:mais|adicione|acrescente|quero mais)\s*(\d+)\s*(?:obras|itens|oportunidades)?/i);
      if (relativeMatch) {
        const count = Number(relativeMatch[1]);
        if (count > 0) {
          return { type: 'add', count };
        }
      }

      return null;
    },
    async updateTopCount(requestedCount, mode = 'set') {
      const baseCount = Number(this.currentTopN) > 0 ? Number(this.currentTopN) : (Number(this.topN) > 0 ? Number(this.topN) : 10);
      const safeCount = Math.max(1, Math.min(50, Number(requestedCount) || baseCount));
      this.currentTopN = mode === 'add'
        ? Math.max(1, Math.min(50, baseCount + safeCount))
        : safeCount;
      this.pendingRobotReaction = null;
      await this.loadAll();
      this.appendRobotMessage(`Atualizei o ranking para top ${this.currentTopN} obras. Agora vejo ${this.displayedTop.length} obras, somando ${this.formatCurrency(this.displayedVisibleValue || 0)}.`);
      return true;
    },
    persistRobotSession() {
      try {
        const payload = {
          selectedDistricts: this.selectedDistricts,
          selectedStatuses: this.selectedStatuses,
          selectedProgressStates: this.selectedProgressStates,
          robotTipIndex: this.robotTipIndex,
          robotChatMessages: this.robotChatMessages.slice(-20),
          robotChatOpen: this.robotChatOpen,
          showRobotActions: this.showRobotActions,
          chatAppliedFilters: this.chatAppliedFilters,
          currentTopN: this.currentTopN,
          showFullListMode: this.showFullListMode,
          minVisibleValue: this.minVisibleValue,
          maxVisibleValue: this.maxVisibleValue,
        };
        window.sessionStorage.setItem(this.robotSessionKey, JSON.stringify(payload));
      } catch {
      }
    },
    restoreRobotSession() {
      try {
        const raw = window.sessionStorage.getItem(this.robotSessionKey);
        if (!raw) return;
        const payload = JSON.parse(raw);
        if (Array.isArray(payload.selectedDistricts) && payload.selectedDistricts.length) {
          this.selectedDistricts = payload.selectedDistricts;
        }
        if (Array.isArray(payload.selectedStatuses) && payload.selectedStatuses.length) {
          this.selectedStatuses = payload.selectedStatuses;
        }
        if (Array.isArray(payload.selectedProgressStates) && payload.selectedProgressStates.length) {
          this.selectedProgressStates = payload.selectedProgressStates;
        }
        if (Array.isArray(payload.robotChatMessages)) {
          this.robotChatMessages = payload.robotChatMessages;
        }
        if (Number.isInteger(payload.robotTipIndex)) {
          this.robotTipIndex = payload.robotTipIndex;
        }
        if (typeof payload.robotChatOpen === 'boolean') {
          this.robotChatOpen = payload.robotChatOpen;
        }
        if (typeof payload.showRobotActions === 'boolean') {
          this.showRobotActions = payload.showRobotActions;
        }
        if (payload.chatAppliedFilters && typeof payload.chatAppliedFilters === 'object') {
          this.chatAppliedFilters = {
            districts: Array.isArray(payload.chatAppliedFilters.districts) ? payload.chatAppliedFilters.districts : [],
            statuses: Array.isArray(payload.chatAppliedFilters.statuses) ? payload.chatAppliedFilters.statuses : [],
            progress: Array.isArray(payload.chatAppliedFilters.progress) ? payload.chatAppliedFilters.progress : [],
            value: payload.chatAppliedFilters.value || null,
          };
        }
        if (Number.isFinite(payload.currentTopN) && payload.currentTopN > 0) {
          this.currentTopN = Number(payload.currentTopN);
        }
        if (typeof payload.showFullListMode === 'boolean') {
          this.showFullListMode = payload.showFullListMode;
        }
        if (Number.isFinite(payload.minVisibleValue)) {
          this.minVisibleValue = payload.minVisibleValue;
        }
        if (Number.isFinite(payload.maxVisibleValue)) {
          this.maxVisibleValue = payload.maxVisibleValue;
        }
      } catch {
      }
    },
    handleWindowScroll() {
      const shouldFollow = window.scrollY > 160;
      if (shouldFollow && !this.isRobotFollowing) {
        this.robotFollowerEntering = true;
        window.setTimeout(() => {
          this.robotFollowerEntering = false;
        }, 1200);
      }
      this.isRobotFollowing = shouldFollow;
    },
    pulseRobot() {
      this.robotAnimating = true;
      window.setTimeout(() => {
        this.robotAnimating = false;
      }, 720);
    },
    restartRobotChatSession() {
      this.robotInput = '';
      this.pendingRobotReaction = null;
      this.showRobotActions = false;
      this.robotChatMessages = this.createRobotContextMessages();
    },
    async toggleFullListMode() {
      this.showFullListMode = !this.showFullListMode;
      this.pendingRobotReaction = null;
      await this.loadAll();
      if (this.showFullListMode) {
        this.appendRobotMessage('Modo exibição completa ativado: mostrando todas as linhas sem restrição.');
      } else {
        this.appendRobotMessage(`Modo top ativado: mostrando os ${this.currentTopN} principais itens.`);
      }
      this.persistRobotSession();
    },
    openRobotChat() {
      this.restartRobotChatSession();
      this.robotChatOpen = true;
      this.pulseRobot();
      this.persistRobotSession();
    },
    closeRobotChat() {
      this.robotChatOpen = false;
      this.persistRobotSession();
    },
    clearRobotChat() {
      this.robotChatMessages = this.createRobotContextMessages();
      this.persistRobotSession();
    },
    toggleRobotChat(event) {
      if (event?.detail === 2) {
        return;
      }
      if (this.robotChatOpen) {
        this.closeRobotChat();
        return;
      }
      this.openRobotChat();
    },
    toggleRobotActions() {
      this.showRobotActions = !this.showRobotActions;
      this.persistRobotSession();
    },
    clearChatAppliedFilter(filterKey) {
      if (filterKey === 'value') {
        this.chatAppliedFilters = { ...this.chatAppliedFilters, value: null };
      } else {
        this.chatAppliedFilters = { ...this.chatAppliedFilters, [filterKey]: [] };
      }
      this.persistRobotSession();
    },
    setChatAppliedFilters(applied = {}) {
      this.chatAppliedFilters = {
        districts: Array.isArray(applied.districts) ? applied.districts.slice() : [],
        statuses: Array.isArray(applied.statuses) ? applied.statuses.slice() : [],
        progress: Array.isArray(applied.progress) ? applied.progress.slice() : [],
        value: applied.value || null,
      };
      this.persistRobotSession();
    },
    buildAppliedFilterSummary(applied = {}) {
      const parts = [];
      if (Array.isArray(applied.districts) && applied.districts.length) {
        parts.push(`distrital ${applied.districts.join(', ')}`);
      }
      if (Array.isArray(applied.statuses) && applied.statuses.length) {
        parts.push(`status ${applied.statuses.join(', ')}`);
      }
      if (Array.isArray(applied.progress) && applied.progress.length) {
        parts.push(`andamento ${applied.progress.join(', ')}`);
      }
      if (applied.value?.type === 'range') {
        parts.push(`valor entre ${this.formatCurrency(applied.value.min)} e ${this.formatCurrency(applied.value.max)}`);
      } else if (applied.value?.type === 'max') {
        parts.push(`valor até ${this.formatCurrency(applied.value.max)}`);
      } else if (applied.value?.type === 'min') {
        parts.push(`valor acima de ${this.formatCurrency(applied.value.min)}`);
      }

      const intro = parts.length ? `Apliquei ${parts.join(' | ')}.` : 'Atualizei os filtros.';
      return `${intro} Agora vejo ${this.displayedTop.length} obras, somando ${this.formatCurrency(this.displayedVisibleValue || 0)}.`;
    },
    async applyCombinedFilters(applied = {}, options = {}) {
      const shouldAnnounce = options.announce !== false;
      const nextDistricts = Array.isArray(applied.districts) && applied.districts.length ? applied.districts : null;
      const nextStatuses = Array.isArray(applied.statuses) && applied.statuses.length ? applied.statuses : null;
      const nextProgress = Array.isArray(applied.progress) && applied.progress.length ? applied.progress : null;
      const nextValue = applied.value || null;

      const affectsServerFilters = Boolean(nextDistricts || nextStatuses || nextProgress);

      if (nextDistricts) this.selectedDistricts = nextDistricts;
      if (nextStatuses) this.selectedStatuses = nextStatuses;
      if (nextProgress) this.selectedProgressStates = nextProgress;

      if (nextValue?.type === 'range') {
        this.minVisibleValue = Number(nextValue.min) || 0;
        this.maxVisibleValue = Number(nextValue.max) || 0;
      } else if (nextValue?.type === 'max') {
        this.minVisibleValue = 0;
        this.maxVisibleValue = Number(nextValue.max) || 0;
      } else if (nextValue?.type === 'min') {
        this.minVisibleValue = Number(nextValue.min) || 0;
        this.maxVisibleValue = 0;
      }

      this.pendingRobotReaction = null;
      this.setChatAppliedFilters({
        districts: nextDistricts || [],
        statuses: nextStatuses || [],
        progress: nextProgress || [],
        value: nextValue,
      });

      if (affectsServerFilters) {
        await this.loadAll();
      } else {
        this.persistRobotSession();
      }

      if (shouldAnnounce) {
        this.appendRobotMessage(this.buildAppliedFilterSummary({
          districts: nextDistricts || [],
          statuses: nextStatuses || [],
          progress: nextProgress || [],
          value: nextValue,
        }));
      }

      return true;
    },
    appendRobotMessage(text, role = 'robot') {
      this.robotChatMessages = [
        ...this.robotChatMessages.slice(-19),
        {
          id: `${role}-${Date.now()}-${this.robotChatMessages.length}`,
          role,
          text,
        },
      ];
      // opt-in logging of interactions
      try {
        if (this.robotLoggingEnabled) {
          logAddEntry({ role, text, selectedDistricts: this.selectedDistricts.slice(), statuses: this.selectedStatuses.slice(), minVisibleValue: this.minVisibleValue }, true);
        }
      } catch {}
      this.persistRobotSession();
    },
    async setStatusesAndReload(statuses, successMessage) {
      this.pendingRobotReaction = null;
      this.selectedStatuses = statuses;
      await this.loadAll();
      this.appendRobotMessage(successMessage);
    },
    async runRobotAction(actionId) {
      if (actionId === 'summary') {
        this.appendRobotMessage(`O top atual soma ${this.formatCurrency(this.displayedVisibleValue || 0)} e mostra ${this.displayedTop.length} obras visiveis.`);
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

      if (actionId === 'clear-min-value') {
        this.minVisibleValue = 0;
        this.maxVisibleValue = 0;
        this.clearChatAppliedFilter('value');
        this.appendRobotMessage('Removi os cortes de valor do top visivel.');
        this.persistRobotSession();
        return;
      }

      if (actionId === 'restore-filters') {
        this.pendingRobotReaction = null;
        this.currentTopN = Number(this.topN) > 0 ? Number(this.topN) : 10;
        this.selectedDistricts = this.districtOptions.slice();
        this.selectedStatuses = this.statusOptions.slice();
        this.selectedProgressStates = this.progressOptions.slice();
        this.minVisibleValue = 0;
        this.maxVisibleValue = 0;
        this.setChatAppliedFilters({ districts: [], statuses: [], progress: [], value: null });
        await this.loadAll();
        this.appendRobotMessage('Restaurei o recorte padrao de distritais, status, andamento e valor.');
        return;
      }
    },
    normalizeText(value) {
      return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLowerCase();
    },
    normalizeOptionLabel(value) {
      return this.normalizeText(value).replace(/[^a-z0-9\s]/g, '');
    },
    getSuggestedCutoff(mode) {
      const values = this.displayedTop
        .map((item) => Number(item.total) || 0)
        .filter((value) => value > 0)
        .sort((left, right) => left - right);
      if (!values.length) return 0;
      if (mode === 'cheap') {
        return values[Math.max(0, Math.floor(values.length / 3))] || values[0];
      }
      return values[Math.min(values.length - 1, Math.floor((values.length * 2) / 3))] || values[values.length - 1];
    },
    formatSuggestionValue(value) {
      if (!(value > 0)) return '0';
      if (value >= 1000000) {
        return `${Math.round(value / 100000) / 10} milhao`;
      }
      if (value >= 1000) {
        return `${Math.round(value / 1000)} mil`;
      }
      return String(Math.round(value));
    },
    resolveOptionDirectives(normalized, options = []) {
      const include = [];
      const exclude = [];
      options.forEach((option) => {
        const label = this.normalizeOptionLabel(option);
        if (!label || !normalized.includes(label)) return;
        const negativePatterns = [
          `sem ${label}`,
          `nao quero ${label}`,
          `não quero ${label}`,
          `tirar ${label}`,
          `remover ${label}`,
          `exceto ${label}`,
        ];
        if (negativePatterns.some((pattern) => normalized.includes(pattern))) {
          exclude.push(option);
        } else {
          include.push(option);
        }
      });
      return {
        include: Array.from(new Set(include)),
        exclude: Array.from(new Set(exclude)),
      };
    },
    buildNextSelection(currentSelection, allOptions, directives) {
      const include = Array.isArray(directives?.include) ? directives.include : [];
      const exclude = Array.isArray(directives?.exclude) ? directives.exclude : [];
      if (!include.length && !exclude.length) return null;

      let nextSelection = include.length ? include.slice() : currentSelection.filter((item) => !exclude.includes(item));
      if (!nextSelection.length && exclude.length) {
        nextSelection = allOptions.filter((item) => !exclude.includes(item));
      }
      if (!nextSelection.length) {
        nextSelection = allOptions.slice();
      }
      return Array.from(new Set(nextSelection));
    },
    extractDistrictsFromCommand(normalized) {
      // Use a shared registry for more robust matching
      try {
        return findDistrictsInText(normalized);
      } catch {
        return [];
      }
    },
    extractMinValueFromCommand(normalized) {
      const match = normalized.match(/(\d+[\d.,]*)\s*(milhao|milhoes|mil)?/);
      if (!match) return 0;

      const raw = match[1].replace(/\./g, '').replace(',', '.');
      const base = Number(raw);
      if (!Number.isFinite(base)) return 0;
      const suffix = match[2] || '';
      if (suffix.startsWith('milhao') || suffix.startsWith('milhoes')) return base * 1000000;
      if (suffix === 'mil') return base * 1000;
      return base;
    },
    extractMaxValueFromCommand(normalized) {
      const match = normalized.match(/(?:ate|até|abaixo de|menor que|no maximo|no máximo)\s*(\d+[\d.,]*)\s*(milhao|milhoes|mil)?/);
      if (!match) return 0;

      const raw = match[1].replace(/\./g, '').replace(',', '.');
      const base = Number(raw);
      if (!Number.isFinite(base)) return 0;
      const suffix = match[2] || '';
      if (suffix.startsWith('milhao') || suffix.startsWith('milhoes')) return base * 1000000;
      if (suffix === 'mil') return base * 1000;
      return base;
    },
    extractStatusesFromCommand(normalized) {
      return this.resolveOptionDirectives(normalized, this.statusOptions);
    },
    extractProgressFromCommand(normalized) {
      const directives = this.resolveOptionDirectives(normalized, this.progressOptions);
      if (normalized.includes('sem andamento') || normalized.includes('sem execucao') || normalized.includes('sem execução') || normalized.includes('sem execucao em campo') || normalized.includes('sem execução em campo')) {
        directives.include = Array.from(new Set([...(directives.include || []), 'SEM ANDAMENTO']));
      }
      return directives;
    },
    async applyRobotResponseAction(resp) {
      if (!resp || !resp.action) return false;

      if (resp.action === 'apply_filter_min' && resp.params && resp.params.min) {
        return this.applyCombinedFilters({ value: { type: 'min', min: resp.params.min } });
      }

      if (resp.action === 'apply_filter_min_auto') {
        return this.applyCombinedFilters({ value: { type: 'min', min: this.getSuggestedCutoff('expensive') } });
      }

      if (resp.action === 'apply_filter_max' && resp.params && resp.params.max) {
        return this.applyCombinedFilters({ value: { type: 'max', max: resp.params.max } });
      }

      if (resp.action === 'apply_filter_max_auto') {
        return this.applyCombinedFilters({ value: { type: 'max', max: this.getSuggestedCutoff('cheap') } });
      }

      if (resp.action === 'apply_filter_range' && resp.params) {
        return this.applyCombinedFilters({ value: { type: 'range', min: resp.params.min, max: resp.params.max } });
      }

      if (resp.action === 'set_statuses' && Array.isArray(resp.params?.statuses) && resp.params.statuses.length) {
        return this.applyCombinedFilters({ statuses: resp.params.statuses });
      }

      if (resp.action === 'exclude_statuses' && Array.isArray(resp.params?.statuses) && resp.params.statuses.length) {
        const nextStatuses = this.buildNextSelection(this.selectedStatuses, this.statusOptions, { exclude: resp.params.statuses });
        return this.applyCombinedFilters({ statuses: nextStatuses || this.selectedStatuses });
      }

      if (resp.action === 'set_progress' && Array.isArray(resp.params?.progress) && resp.params.progress.length) {
        return this.applyCombinedFilters({ progress: resp.params.progress });
      }

      if (resp.action === 'exclude_progress' && Array.isArray(resp.params?.progress) && resp.params.progress.length) {
        const nextProgress = this.buildNextSelection(this.selectedProgressStates, this.progressOptions, { exclude: resp.params.progress });
        return this.applyCombinedFilters({ progress: nextProgress || this.selectedProgressStates });
      }

      if (resp.action === 'compare' && Array.isArray(resp.params?.districts) && resp.params.districts.length >= 2) {
        this.selectedDistricts = resp.params.districts;
        this.pendingRobotReaction = null;
        await this.loadAll();
        await this.runRobotAction('compare-districts');
        return true;
      }

      if (resp.action === 'summary') {
        await this.runRobotAction('summary');
        return true;
      }

      if (resp.action === 'restore_filters') {
        await this.runRobotAction('restore-filters');
        return true;
      }

      return false;
    },
    async applyNaturalCommand(normalized) {
      const topCountCommand = this.extractTopCountCommand(normalized);
      if (topCountCommand) {
        return this.updateTopCount(topCountCommand.count, topCountCommand.type);
      }

      const districtDirectives = this.resolveOptionDirectives(normalized, this.districtOptions);
      const mentionedDistricts = this.extractDistrictsFromCommand(normalized);
      const mentionedStatuses = this.extractStatusesFromCommand(normalized);
      const mentionedProgress = this.extractProgressFromCommand(normalized);
      const maxValue = this.extractMaxValueFromCommand(normalized);
      const minValue = this.extractMinValueFromCommand(normalized);
      const wantsCheap = /(barat|baratas|barato|pequen|pequenas|pequeno)/i.test(normalized);
      const wantsExpensive = /(caras|caros|caro|grandes|grande|alto valor|maiores)/i.test(normalized);

      if ((normalized.includes('contra') || normalized.includes('versus') || normalized.includes('compar')) && mentionedDistricts.length >= 2) {
        this.pendingRobotReaction = null;
        this.selectedDistricts = mentionedDistricts;
        await this.loadAll();
        await this.runRobotAction('compare-districts');
        return true;
      }

      const explicitDistrictIncludes = districtDirectives.include.length
        ? districtDirectives.include
        : districtDirectives.exclude.length
          ? []
          : mentionedDistricts;

      const nextDistrictSelection = this.buildNextSelection(
        this.selectedDistricts,
        this.districtOptions,
        {
          include: explicitDistrictIncludes,
          exclude: districtDirectives.exclude,
        }
      );
      const nextStatusSelection = this.buildNextSelection(this.selectedStatuses, this.statusOptions, mentionedStatuses);
      const nextProgressSelection = this.buildNextSelection(this.selectedProgressStates, this.progressOptions, mentionedProgress);

      const hasCompositeFilters = Boolean(nextDistrictSelection || nextStatusSelection || nextProgressSelection || minValue > 0 || maxValue > 0 || wantsCheap || wantsExpensive);
      if (hasCompositeFilters) {
        const applied = {
          districts: nextDistrictSelection,
          statuses: nextStatusSelection,
          progress: nextProgressSelection,
          value: null,
        };

        if (minValue > 0 && maxValue > 0 && (normalized.includes('entre') || (normalized.includes('de') && (normalized.includes('ate') || normalized.includes('até'))))) {
          applied.value = { type: 'range', min: Math.min(minValue, maxValue), max: Math.max(minValue, maxValue) };
        } else if (maxValue > 0 && (normalized.includes('ate') || normalized.includes('até') || normalized.includes('abaixo de') || normalized.includes('menor que') || normalized.includes('no maximo') || normalized.includes('no máximo'))) {
          applied.value = { type: 'max', max: maxValue };
        } else if (minValue > 0 && (normalized.includes('acima de') || normalized.includes('maior que') || normalized.includes('acima'))) {
          applied.value = { type: 'min', min: minValue };
        } else if (wantsCheap) {
          applied.value = { type: 'max', max: this.getSuggestedCutoff('cheap') };
        } else if (wantsExpensive) {
          applied.value = { type: 'min', min: this.getSuggestedCutoff('expensive') };
        }

        return this.applyCombinedFilters(applied);
      }

      if (normalized.includes('remover corte') || normalized.includes('sem corte')) {
        await this.runRobotAction('clear-min-value');
        return true;
      }

      return false;
    },
    applyRobotSuggestion(suggestion) {
      this.robotInput = suggestion;
      this.submitRobotInput();
    },
    async submitRobotInput() {
      const command = this.robotInput;
      if (!command) return;

      this.appendRobotMessage(command, 'system');
      this.robotInput = '';

      const normalized = this.normalizeText(command);

      if (await this.applyNaturalCommand(normalized)) {
        return;
      }

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
        this.appendRobotMessage('Estou lendo o arquivo ACOM-OBRAS.xlsx na aba OBRAS, usando os campos NOTA, DESCRITIVO, DISTRITAL, MUNICIPIO, STATUS OBRA e PROJETADO R$.');
        return;
      }

      // Try the lightweight classifier as a fallback to generate a friendly response
      try {
        const classification = classify(command || '');
        if (classification && classification.intent && classification.intent !== 'unknown') {
          // handle a couple of actionable intents
          if (classification.intent === 'compare' && classification.entities && Array.isArray(classification.entities.districts) && classification.entities.districts.length >= 2) {
            // try to map textual districts into known distritais and run compare
            const mentioned = this.extractDistrictsFromCommand(this.normalizeText(command));
            if (mentioned.length >= 2) {
              this.pendingRobotReaction = null;
              this.selectedDistricts = mentioned;
              await this.loadAll();
              await this.runRobotAction('compare-districts');
              return;
            }
          }

          // otherwise, reply with a generated response text (provide context)
          const ctx = { district: this.selectedDistricts.join(', '), count: this.displayedTop.length, value: this.displayedVisibleValue };
          const resp = generateResponse(classification.intent, classification.entities || {}, ctx);
          const replyText = resp && typeof resp === 'object' ? resp.text : String(resp);
          this.appendRobotMessage(replyText);

          try {
            await this.applyRobotResponseAction(resp);
          } catch (e) {
          }
          return;
        }
      } catch (e) {
        // classifier shouldn't break the UI; fall through to default fallback
        // console.warn('classify error', e);
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
  cursor: pointer;
  pointer-events: auto;
}

.robot-bubble {
  width: min(240px, 28vw);
  padding: 14px 16px;
  border-radius: 20px 20px 8px 20px;
  background: linear-gradient(180deg, rgba(12, 27, 49, 0.96), rgba(15, 23, 42, 0.86));
  border: 1px solid rgba(125, 211, 252, 0.18);
  box-shadow: 0 18px 28px rgba(2, 6, 23, 0.22);
  cursor: pointer;
  pointer-events: auto;
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
  cursor: pointer;
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

.hero-robot-dock:hover .robot-bubble {
  transform: translateY(-2px);
  border-color: rgba(125, 211, 252, 0.32);
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

.robot-trigger-wrapper {
  position: relative;
  display: inline-flex;
}

.robot-head.is-loading {
  animation: robotHeadBoil 0.42s ease-in-out infinite, robotHeadHeat 1.15s ease-in-out infinite;
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
  pointer-events: none;
}

.robot-antenna-button {
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
  z-index: 10;
  pointer-events: auto;
}

.robot-antenna-button:hover {
  background: rgba(132, 204, 22, 0.18);
}

.robot-antenna-button:focus-visible {
  outline: 2px solid rgba(56, 189, 248, 0.9);
  outline-offset: 2px;
}

.robot-antenna--active {
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.7);
}

.robot-antenna.robot-antenna--active::after {
  background: #4ade80;
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.9);
}

.robot-full__antenna--active {
  background: #22c55e;
  box-shadow: 0 0 8px rgba(34, 197, 94, 0.7);
}

.robot-full__antenna.robot-full__antenna--active::after {
  background: #4ade80;
  box-shadow: 0 0 20px rgba(34, 197, 94, 0.9);
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
  background: #7f1d1d;
  box-shadow: 0 0 12px rgba(251, 146, 60, 0.45);
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

.robot-head.is-loading .robot-mouth {
  background: rgba(127, 29, 29, 0.86);
  box-shadow: 0 0 10px rgba(248, 113, 113, 0.3);
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

.robot-follower {
  position: fixed;
  top: 92px;
  right: 18px;
  z-index: 35;
  width: 86px;
  height: 110px;
  border: 0;
  padding: 0;
  background: transparent;
  display: grid;
  place-items: center;
  pointer-events: auto;
}

.robot-follower.is-entering {
  animation: robotFollowerDescend 1.05s cubic-bezier(0.18, 0.84, 0.2, 1) both;
}

.robot-follower.is-loading .robot-head--follower {
  box-shadow: 0 18px 30px rgba(14, 165, 233, 0.34);
}

.robot-follower__rotor {
  position: absolute;
  top: 8px;
  left: 50%;
  width: 56px;
  height: 4px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(148, 163, 184, 0.06), rgba(224, 242, 254, 0.96), rgba(148, 163, 184, 0.06));
  box-shadow: 0 0 14px rgba(125, 211, 252, 0.34);
  animation: robotRotorSpin 0.16s linear infinite;
}

.robot-head--follower {
  margin-top: 22px;
  width: 48px;
  height: 40px;
  box-shadow: 0 18px 28px rgba(37, 99, 235, 0.24);
  animation: robotFollowerHover 2.4s ease-in-out infinite;
}

.robot-head--follower .robot-antenna {
  top: -14px;
}

.robot-head--follower .robot-steam {
  bottom: calc(100% - 2px);
}

.robot-follow-enter-active,
.robot-follow-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.robot-follow-enter-from,
.robot-follow-leave-to {
  opacity: 0;
  transform: translateY(-48px) scale(0.82);
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

@keyframes robotHeadHeat {
  0% {
    background: linear-gradient(180deg, #dbeafe, #93c5fd);
    box-shadow: 0 0 0 rgba(248, 113, 113, 0);
    filter: saturate(1);
  }
  35% {
    background: linear-gradient(180deg, #fde68a, #fb923c);
    box-shadow: 0 0 18px rgba(251, 146, 60, 0.35);
    filter: saturate(1.1);
  }
  70% {
    background: linear-gradient(180deg, #fca5a5, #ef4444);
    box-shadow: 0 0 26px rgba(239, 68, 68, 0.42);
    filter: saturate(1.18);
  }
  100% {
    background: linear-gradient(180deg, #dbeafe, #93c5fd);
    box-shadow: 0 0 0 rgba(248, 113, 113, 0);
    filter: saturate(1);
  }
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

@keyframes robotFollowerHover {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
}

@keyframes robotFollowerDescend {
  0% {
    opacity: 0;
    transform: translateY(-150px) scale(0.68);
  }
  55% {
    opacity: 1;
    transform: translateY(10px) scale(1.02);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes robotRotorSpin {
  0% { transform: translateX(-50%) rotate(0deg) scaleX(1); }
  50% { transform: translateX(-50%) rotate(180deg) scaleX(1.16); }
  100% { transform: translateX(-50%) rotate(360deg) scaleX(1); }
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

.scope-pill.is-chat-applied {
  border-color: rgba(251, 191, 36, 0.52);
  box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.24), 0 16px 28px rgba(245, 158, 11, 0.12);
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

.filter-group--chat-applied .filter-title {
  color: rgba(253, 224, 71, 0.92);
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

.filter-chip--button.is-chat-applied {
  border-color: rgba(251, 191, 36, 0.52);
  box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.24), 0 8px 16px rgba(245, 158, 11, 0.1);
}

.filter-search {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}

.filter-search__input {
  flex: 1 1 220px;
  min-width: 220px;
  padding: 14px 16px;
  border-radius: 18px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: rgba(255, 255, 255, 0.04);
  color: #e2e8f0;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
}

.filter-search__input:focus {
  outline: none;
  border-color: rgba(56, 189, 248, 0.6);
  box-shadow: 0 0 0 3px rgba(56, 189, 248, 0.12);
}

.filter-search__button,
.filter-search__clear {
  border: none;
  border-radius: 16px;
  padding: 12px 16px;
  cursor: pointer;
  color: #e2e8f0;
  background: rgba(56, 189, 248, 0.18);
  transition: transform 0.18s ease, background 0.18s ease;
}

.filter-search__button:hover,
.filter-search__clear:hover {
  transform: translateY(-1px);
  background: rgba(56, 189, 248, 0.26);
}

.filter-search__clear {
  width: 40px;
  height: 40px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  font-size: 1.1rem;
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
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  padding: 28px 28px 0;
  flex-wrap: wrap;
}

.results-head__meta {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 18px;
  justify-content: flex-end;
}

.results-filter {
  min-width: 260px;
  max-width: 420px;
}

.results-filter__label {
  display: block;
  margin-bottom: 8px;
  color: rgba(191, 219, 254, 0.62);
  font-size: 0.82rem;
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

.results-cutoff {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin: 18px 28px 0;
  padding: 12px 16px;
  border-radius: 18px;
  background: rgba(56, 189, 248, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.16);
  color: #dbeafe;
}

.results-cutoff--chat-applied {
  border-color: rgba(251, 191, 36, 0.52);
  box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.24), 0 14px 24px rgba(245, 158, 11, 0.08);
}

.results-cutoff__badge {
  flex: none;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(251, 191, 36, 0.16);
  border: 1px solid rgba(251, 191, 36, 0.36);
  color: #fde68a;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
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

  .robot-follower {
    right: 14px;
    top: 84px;
  }

  .scope-switch {
    grid-template-columns: 1fr 1fr;
  }
}

@media (max-width: 820px) {
  .robot-chat-actions,
  .robot-chat-suggestions {
    grid-template-columns: 1fr;
  }

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

  .robot-follower {
    right: 8px;
    top: 76px;
    transform: scale(0.9);
    transform-origin: top right;
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
