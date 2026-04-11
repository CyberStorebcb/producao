<template>
  <section class="producao-shell">
    <header ref="producaoHero" class="producao-hero">
      <div class="hero-copy">
        <p class="eyebrow">Centro de produção · {{ activeSheetLabel }}</p>
        <h1>Resumo executivo da produção</h1>
        <p class="subline">
          {{ executiveStatusLabel }} · Origem {{ originLabel }} · Atualizado {{ lastUpdatedLabel || 'há instantes' }}
        </p>
        <div class="hero-badges">
          <span class="hero-badge hero-badge--soft">
            <Icon class="hero-badge__icon" icon="solar:buildings-3-bold-duotone" width="16" height="16" />
            {{ selectedBase === ALL_BASE_KEY ? 'Bases' : 'Base' }} {{ activeBaseLabel }}
          </span>
          <span class="hero-badge hero-badge--strong">
            <Icon class="hero-badge__icon" icon="solar:chart-2-bold-duotone" width="16" height="16" />
            {{ rankingMode === 'period' ? 'Período completo' : 'Data selecionada' }}
          </span>
          <span class="hero-badge">
            <Icon class="hero-badge__icon" icon="solar:calendar-mark-linear" width="16" height="16" />
            Janela {{ importDateRangeLabel }}
          </span>
          <span class="hero-badge hero-badge--soft">
            <Icon class="hero-badge__icon" icon="solar:buildings-2-linear" width="16" height="16" />
            {{ activeSheetLabel }}
          </span>
        </div>
        <div class="hero-command-grid">
          <div class="robot-bubble">
            <span class="robot-bubble__eyebrow">Professor dos gráficos · Aprendizado ativo</span>
            <strong>{{ currentRobotTip.title }}</strong>
            <p>{{ currentRobotTip.text }}</p>
            <div class="robot-bubble__tag">Insight baseado em metas, alertas e histórico de produção</div>
            <button type="button" class="robot-bubble__next" @click="advanceRobotTip">
              Próxima dica
            </button>
          </div>

          <section class="hero-command-panel">
            <div class="hero-command-panel__section">
              <div class="hero-command-panel__head">
                <span class="hero-toolbar__label">Base</span>
                <small>{{ selectedBase === ALL_BASE_KEY ? 'Visão consolidada' : 'Unidade em foco' }}</small>
              </div>
              <nav class="tab-strip tab-strip--compact tab-strip--base" aria-label="Bases de produção">
                <button
                  v-for="base in baseOptions"
                  :key="base.key"
                  type="button"
                  class="tab-btn"
                  :class="{ active: selectedBase === base.key }"
                  @click="changeBase(base.key)"
                >
                  {{ base.label }}
                </button>
              </nav>
            </div>

            <div class="hero-command-panel__section">
              <div class="hero-command-panel__head">
                <span class="hero-toolbar__label">Categoria</span>
                <small>Frente operacional</small>
              </div>
              <nav class="tab-strip tab-strip--compact tab-strip--category" aria-label="Categorias de produção">
                <button
                  v-for="tab in tabs"
                  :key="tab"
                  type="button"
                  class="tab-btn"
                  :class="{ active: activeTab === tab }"
                  @click="activeTab = tab"
                >
                  {{ tab }}
                </button>
              </nav>
            </div>

            <div class="hero-command-panel__controls">
              <label class="input-stack input-stack--toolbar input-stack--compactbar">
                <span>Visão</span>
                <select v-model="rankingMode">
                  <option value="period">Período completo</option>
                  <option value="date">Data selecionada</option>
                </select>
              </label>
              <label class="input-stack input-stack--toolbar input-stack--compactbar">
                <span>Data</span>
                <select v-model="selectedDateKey" @change="handleDateChange" :disabled="!availableDates.length">
                  <option v-for="date in dateFilterOptions" :key="date.key" :value="date.key">
                    {{ date.label }}
                  </option>
                </select>
              </label>
              <button type="button" class="ghost-pill ghost-pill--toolbar ghost-pill--compactbar" @click="toggleAdvancedDetails">
                {{ detailToggleLabel }}
              </button>
              <button type="button" class="ghost-pill ghost-pill--toolbar ghost-pill--compactbar" @click="toggleExecutiveMode">
                {{ executiveMode ? 'Sair da visão executiva' : 'Entrar na visão executiva' }}
              </button>
            </div>
          </section>
        </div>
        <div class="hero-snapshot">
          <article v-for="item in heroSnapshotItems" :key="item.label" class="hero-snapshot__card">
            <div class="metric-card__head">
              <span class="metric-card__icon">
                <Icon :icon="item.icon" width="18" height="18" />
              </span>
              <span>{{ item.label }}</span>
            </div>
            <strong>{{ item.value }}</strong>
            <small>{{ item.detail }}</small>
          </article>
        </div>
      </div>
      <aside class="hero-focus">
        <p class="hero-focus__eyebrow">Painel executivo</p>
        <div class="hero-focus__headline">
          <strong>{{ formatCurrency(executiveRealizedTotal) }}</strong>
          <span>{{ executiveRealizedLabel }}</span>
        </div>
        <div class="hero-focus__grid">
          <article>
            <span>{{ targetScopeLabel }}</span>
            <strong>{{ formatCurrency(dailyReferenceTarget) }}</strong>
            <small>{{ dailyTargetStatusLabel }}</small>
          </article>
          <article>
            <span>Desvio</span>
            <strong>{{ executiveDeltaLabel }}</strong>
            <small>{{ dailyTargetSupportLabel }}</small>
          </article>
          <article>
            <span>Maior risco</span>
            <strong>{{ zeroPerformanceTeamsCount }}</strong>
            <small>equipes sem lançamento</small>
          </article>
          <article>
            <span>Meta mensal por equipe</span>
            <strong>{{ formatCurrency(monthlyTargetPerTeam) }}</strong>
            <small>{{ monthlyTargetPerTeamLabel }}</small>
          </article>
        </div>
      </aside>
    </header>

    <section v-if="!executiveMode" class="control-summary-dock">
      <div class="control-summary" :class="{ 'control-summary--with-filters': showAdvanced }">
        <div v-for="item in controlSummaryItems" :key="item.label" class="control-summary__item">
          <div class="metric-card__head">
            <span class="metric-card__icon metric-card__icon--soft">
              <Icon :icon="item.icon" width="18" height="18" />
            </span>
            <span>{{ item.label }}</span>
          </div>
          <strong>{{ item.value }}</strong>
        </div>
        <button
          type="button"
          class="control-summary__refresh"
          @click="syncFromDropbox"
          :disabled="loading || syncing || uploading"
        >
          <div class="metric-card__head">
            <span class="metric-card__icon metric-card__icon--soft">
              <Icon :icon="syncing ? 'solar:refresh-circle-bold' : 'solar:refresh-bold-duotone'" width="18" height="18" />
            </span>
            <span>Atualizar</span>
          </div>
          <strong>{{ syncing ? 'Sincronizando...' : 'Atualizar agora' }}</strong>
          <small>Sincroniza com o Dropbox e recarrega os valores</small>
        </button>
        <button
          type="button"
          class="control-summary__refresh control-summary__refresh--upload"
          @click="triggerFileUpload"
          :disabled="loading || syncing || uploading"
        >
          <div class="metric-card__head">
            <span class="metric-card__icon metric-card__icon--soft">
              <Icon :icon="uploading ? 'solar:upload-square-bold' : 'solar:upload-minimalistic-bold-duotone'" width="18" height="18" />
            </span>
            <span>Importar</span>
          </div>
          <strong>{{ uploading ? 'Importando...' : 'Importar Excel' }}</strong>
          <small>Envia o .xlsm diretamente, sem Dropbox</small>
        </button>
        <input
          ref="fileInput"
          type="file"
          accept=".xlsm,.xlsx"
          style="display:none"
          @change="handleFileUpload"
        />
        <section v-if="showAdvanced" class="control-summary-filters">
          <div class="control-summary-filters__grid">
            <label class="input-stack input-stack--toolbar input-stack--search control-summary-filters__field">
              <span>Buscar equipe</span>
              <input v-model.trim="searchQuery" type="text" placeholder="Prefixo, placa ou colaborador" />
            </label>
            <label class="input-stack input-stack--toolbar control-summary-filters__field">
              <span>Faixa</span>
              <select v-model="performanceFilter">
                <option v-for="option in performanceFilterOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </option>
              </select>
            </label>
          </div>
          <div class="control-summary-filters__actions">
            <button type="button" class="pill control-summary-filters__action" @click="syncFromDropbox" :disabled="loading || syncing || uploading">
              <span v-if="syncing">Sincronizando...</span>
              <span v-else>Sincronizar com Dropbox</span>
            </button>
            <button type="button" class="pill control-summary-filters__action" @click="triggerFileUpload" :disabled="loading || syncing || uploading">
              <Icon icon="solar:upload-minimalistic-bold-duotone" width="14" height="14" style="margin-right:4px" />
              <span v-if="uploading">Importando...</span>
              <span v-else>Importar Excel</span>
            </button>
            <button type="button" class="ghost-pill control-summary-filters__action" @click="showTeamFilter = !showTeamFilter">
              {{ showTeamFilter ? 'Ocultar equipes' : 'Filtrar equipes' }}
            </button>
          </div>
        </section>
      </div>
      <div v-if="showAdvanced && showTeamFilter" class="team-filter-panel control-summary-team-filter">
        <div class="team-filter-panel__header">
          <div>
            <span>Equipes exibidas</span>
            <strong>{{ teamFilterLabel }}</strong>
          </div>
          <div class="team-filter-panel__actions">
            <button type="button" class="team-filter-action" @click="selectAllTeams">Marcar todas</button>
            <button type="button" class="team-filter-action" @click="clearAllTeams">Desmarcar todas</button>
          </div>
        </div>
        <div class="team-filter-panel__grid">
          <label v-for="team in teamFilterOptions" :key="team.code" class="team-filter-option">
            <input type="checkbox" :checked="isTeamMarked(team.code)" @change="toggleTeamSelection(team.code)" />
            <div>
              <strong>{{ team.display }}</strong>
              <small>{{ team.plate || 'Sem placa' }}</small>
            </div>
          </label>
        </div>
      </div>
    </section>

    <section v-if="!executiveMode" class="summary-ribbon panel-appear panel-appear--1">
      <p>{{ narrativeSummary }}</p>
    </section>

    <section v-if="!executiveMode && operationalAlerts.length" class="alerts-ribbon panel-appear panel-appear--1">
      <article v-for="alert in operationalAlerts" :key="alert.id" :class="['alert-card', `alert-card--${alert.tone}`]">
        <div class="alert-card__head">
          <span class="alert-card__icon">
            <Icon :icon="alert.icon" width="18" height="18" />
          </span>
          <span class="alert-card__label">{{ alert.title }}</span>
        </div>
        <strong>{{ alert.text }}</strong>
      </article>
    </section>

    <div v-if="loading" class="state-panel">
      <div class="loader" aria-hidden="true"></div>
      <p>{{ syncing ? 'Sincronizando dados com o Dropbox...' : 'Carregando dados do Neon...' }}</p>
    </div>

    <div v-else-if="sampleRows" class="state-panel">
      <h2>Diagnóstico da planilha</h2>
      <p>O servidor não conseguiu normalizar automaticamente a planilha. Visualize abaixo e escolha a linha de cabeçalho.</p>
      <div style="max-height:240px; overflow:auto; margin: 12px 0;">
        <table style="width:100%; border-collapse:collapse;">
          <tbody>
            <tr v-for="(row, ri) in sampleRows" :key="ri" :style="{ background: ri === headerCandidate ? '#0f172a' : 'transparent' }">
              <td style="padding:6px; border-bottom:1px solid rgba(255,255,255,0.04); font-weight:600; width:64px;">{{ ri + 1 }}</td>
              <td style="padding:6px; border-bottom:1px solid rgba(255,255,255,0.04);">
                <div style="display:flex; gap:8px; flex-wrap:wrap;">
                  <span v-for="(cell, ci) in row" :key="ci" style="padding:4px 6px; background:rgba(255,255,255,0.03); border-radius:6px;">{{ cell }}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div style="display:flex; gap:8px; align-items:center;">
        <label style="display:flex; gap:6px; align-items:center;"><span>Linha cabeçalho</span>
          <select v-model.number="headerCandidate">
            <option v-for="c in headerCandidates" :key="c.idx" :value="c.idx">{{ c.label }}</option>
          </select>
        </label>
        <label style="display:flex; gap:6px; align-items:center;"><span>Coluna data inicial</span>
          <input type="number" v-model.number="dataStartColumn" style="width:80px;" />
        </label>
        <button class="pill" @click="applyClientSampleParse">Carregar usando esta configuração</button>
      </div>
    </div>

    <div v-else-if="errorMessage" class="state-panel error">
      <h2>Ops!</h2>
      <p>{{ errorMessage }}</p>
      <button type="button" class="pill" @click="loadFromDatabase">Tentar novamente</button>
    </div>

    <div v-else-if="!teamRows.length" class="state-panel empty">
      <h2>Nenhuma equipe encontrada</h2>
      <p>Revise se a aba DIÁRIO contém itens "Apontado R$".</p>
    </div>

    <template v-else>
      <section v-if="executiveMode" class="executive-direct panel-appear panel-appear--1">
        <header class="executive-direct__header">
          <div>
            <h2>Visão executiva</h2>
            <p>Somente informações diretas para decisão rápida da produção.</p>
          </div>
          <span :class="['status-pill', importStatusClass]">{{ importStatusText }}</span>
        </header>
        <div class="executive-direct__metrics">
          <article v-for="item in executiveQuickMetrics" :key="item.label" class="executive-direct__metric">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <small>{{ item.detail }}</small>
          </article>
        </div>
        <div class="executive-direct__toplist">
          <h3>Top equipes</h3>
          <article v-for="(team, index) in executiveQuickTeams" :key="team.code" class="executive-direct__team">
            <span class="executive-direct__order">#{{ index + 1 }}</span>
            <div>
              <strong>{{ team.display }}</strong>
              <small>{{ team.plate || 'Sem placa' }}</small>
            </div>
            <strong class="executive-direct__value">{{ formatCurrency(teamSortValue(team)) }}</strong>
          </article>
        </div>
      </section>

      <div v-else class="panel-stack">
      <section class="executive-ranking panel-appear panel-appear--1">
        <header>
          <div>
            <h2>Leitura principal</h2>
            <p>As equipes que mais puxam o resultado agora</p>
          </div>
          <span :class="['status-pill', importStatusClass]">{{ importStatusText }}</span>
        </header>
        <div class="executive-ranking__list">
          <article v-for="(team, index) in executiveRankingTeams" :key="team.code" class="executive-ranking__item">
            <span class="executive-ranking__order">#{{ index + 1 }}</span>
            <div class="executive-ranking__copy">
              <strong>
                <Icon class="executive-ranking__icon" :icon="performanceIconForBand(teamPerformanceBand(team))" width="18" height="18" />
                {{ team.display }}
              </strong>
              <small>{{ team.plate || 'Sem placa' }} · {{ performanceLabelForBand(teamPerformanceBand(team)) }}</small>
            </div>
            <div class="executive-ranking__value">
              <strong>{{ formatCurrency(teamSortValue(team)) }}</strong>
              <small>{{ teamShareLabel(team) }}</small>
            </div>
          </article>
        </div>
      </section>

      <section ref="trendPanel" class="trend-panel panel-appear panel-appear--2">
        <header>
          <div class="trend-panel__headline">
            <div>
              <h2>{{ chartPanelTitle }}</h2>
              <p>{{ chartPanelDescription }}</p>
              <small class="trend-panel__context">{{ chartPanelContext }}</small>
            </div>
            <div class="trend-robot-anchor">
              <button
                type="button"
                class="robot-trigger trend-robot-trigger"
                :class="{ 'is-active': robotChatOpen, 'is-loading': loading }"
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
          <div class="trend-panel__header-tools">
            <div class="chart-switcher" role="tablist" aria-label="Tipos de gráfico">
              <button
                v-for="option in chartTypeOptions"
                :key="option.value"
                type="button"
                class="chart-switcher__btn"
                :class="{ active: chartType === option.value }"
                @click="chartType = option.value"
              >
                <Icon class="chart-switcher__icon" :icon="option.icon" width="15" height="15" />
                {{ option.label }}
              </button>
            </div>
            <div class="chart-export-actions">
              <button type="button" class="chart-export-btn" @click="exportChartAsImage" :disabled="!!exportState || !hasActiveChart">
                {{ exportState === 'image' ? 'Gerando imagem...' : 'Imagem' }}
              </button>
              <button type="button" class="chart-export-btn" @click="exportChartAsPdf" :disabled="!!exportState || !hasActiveChart">
                {{ exportState === 'pdf' ? 'Gerando PDF...' : 'PDF' }}
              </button>
            </div>
          </div>
        </header>
        <transition name="robot-chat-shell">
          <section
            v-if="robotChatOpen"
            ref="robotAssistantDock"
            class="robot-assistant-dock"
            :style="robotDockStyle"
            aria-label="Chat do professor de graficos da producao"
          >
            <div
              class="robot-assistant-figure"
              :class="{ 'is-dragging': robotDragActive }"
              @pointerdown="startRobotDrag"
            >
              <span class="robot-assistant-figure__hint">Arraste o professor</span>
              <div class="robot-full" :class="{ 'is-speaking': robotSpeaking, 'is-loading': loading, 'is-entering': robotEntranceAnimating }">
                <svg class="robot-full__svg" viewBox="0 0 180 320" aria-hidden="true" focusable="false">
                  <defs>
                    <linearGradient id="robotHatGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                      <stop offset="0%" stop-color="#4277b6" />
                      <stop offset="100%" stop-color="#173456" />
                    </linearGradient>
                    <linearGradient id="robotGoldGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                      <stop offset="0%" stop-color="#f7dfa1" />
                      <stop offset="55%" stop-color="#d89a4b" />
                      <stop offset="100%" stop-color="#9a591f" />
                    </linearGradient>
                    <linearGradient id="robotFaceGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                      <stop offset="0%" stop-color="#fff2cf" />
                      <stop offset="100%" stop-color="#e4a650" />
                    </linearGradient>
                    <linearGradient id="robotCoatGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                      <stop offset="0%" stop-color="#f3b861" />
                      <stop offset="60%" stop-color="#c97b2c" />
                      <stop offset="100%" stop-color="#85461b" />
                    </linearGradient>
                    <linearGradient id="robotLimbGradient" x1="0%" x2="0%" y1="0%" y2="100%">
                      <stop offset="0%" stop-color="#f6c677" />
                      <stop offset="100%" stop-color="#94511f" />
                    </linearGradient>
                    <linearGradient id="robotScreenGradient" x1="0%" x2="100%" y1="0%" y2="100%">
                      <stop offset="0%" stop-color="#234c7a" />
                      <stop offset="100%" stop-color="#0f223a" />
                    </linearGradient>
                    <radialGradient id="robotEyeGradient" cx="50%" cy="40%" r="64%">
                      <stop offset="0%" stop-color="#ffffff" />
                      <stop offset="26%" stop-color="#a3f2ff" />
                      <stop offset="58%" stop-color="#39a7d0" />
                      <stop offset="100%" stop-color="#1b2637" />
                    </radialGradient>
                    <filter id="robotGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  <g class="robot-full__float">
                    <ellipse class="robot-full__shadow" cx="90" cy="302" rx="38" ry="10" />

                    <g class="robot-full__hat-group">
                      <ellipse cx="90" cy="42" rx="40" ry="10" fill="url(#robotHatGradient)" stroke="#17314d" stroke-width="4" />
                      <path d="M68 16 C68 8 74 4 82 4 L98 4 C106 4 112 8 112 16 L112 38 L68 38 Z" fill="url(#robotHatGradient)" stroke="#17314d" stroke-width="4" stroke-linejoin="round" />
                      <path d="M72 15 C78 10 102 10 108 15" fill="none" stroke="rgba(255,255,255,0.28)" stroke-width="3" stroke-linecap="round" />
                    </g>

                    <g class="robot-full__head-group">
                      <circle cx="50" cy="88" r="10" fill="#ecc788" stroke="#7a461a" stroke-width="4" />
                      <circle cx="130" cy="88" r="10" fill="#ecc788" stroke="#7a461a" stroke-width="4" />
                      <rect x="49" y="52" width="82" height="92" rx="30" fill="url(#robotGoldGradient)" stroke="#7a461a" stroke-width="4" />
                      <rect x="60" y="68" width="60" height="60" rx="22" fill="url(#robotFaceGradient)" stroke="#a76323" stroke-width="3" />
                      <path d="M72 84 Q90 74 108 84" fill="none" stroke="#6f3d18" stroke-width="5" stroke-linecap="round" />
                      <circle cx="78" cy="95" r="13" fill="url(#robotEyeGradient)" stroke="#734118" stroke-width="4" filter="url(#robotGlowFilter)" />
                      <circle cx="102" cy="95" r="13" fill="url(#robotEyeGradient)" stroke="#734118" stroke-width="4" filter="url(#robotGlowFilter)" />
                      <circle cx="74" cy="91" r="3" fill="#ffffff" opacity="0.95" />
                      <circle cx="98" cy="91" r="3" fill="#ffffff" opacity="0.95" />
                      <ellipse cx="90" cy="108" rx="7" ry="5" fill="#925325" opacity="0.92" />
                      <path class="robot-full__mouth" d="M74 119 Q90 132 106 119" fill="none" stroke="#4f2411" stroke-width="6" stroke-linecap="round" />
                      <path d="M64 112 C68 122 72 126 76 126" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="3" stroke-linecap="round" />
                    </g>

                    <rect x="84" y="144" width="12" height="15" rx="6" fill="url(#robotGoldGradient)" stroke="#7a461a" stroke-width="3" />

                    <g class="robot-full__torso-group">
                      <path d="M60 160 C60 148 69 140 81 140 L99 140 C111 140 120 148 120 160 L120 228 C120 241 111 250 98 250 L82 250 C69 250 60 241 60 228 Z" fill="url(#robotCoatGradient)" stroke="#7a461a" stroke-width="4" />
                      <circle cx="90" cy="178" r="14" fill="#ffdf96" stroke="#8e541f" stroke-width="4" />
                      <path d="M90 165 L93 173 L102 176 L94 181 L96 191 L90 186 L84 191 L86 181 L78 176 L87 173 Z" fill="#c37728" opacity="0.95" />
                      <rect x="74" y="202" width="32" height="22" rx="9" fill="url(#robotScreenGradient)" stroke="#9fdcff" stroke-width="3" />
                      <path d="M81 213 H98" stroke="#8de7ff" stroke-width="3.4" stroke-linecap="round" opacity="0.86" />
                      <circle cx="86" cy="233" r="3" fill="#f8e8ba" opacity="0.95" />
                      <circle cx="94" cy="233" r="3" fill="#f8e8ba" opacity="0.95" />
                    </g>

                    <path class="robot-full__arm robot-full__arm--left" d="M62 168 C44 178 38 192 43 211" fill="none" stroke="url(#robotLimbGradient)" stroke-width="14" stroke-linecap="round" />
                    <path class="robot-full__forearm robot-full__forearm--left" d="M43 210 C49 225 60 236 74 241" fill="none" stroke="url(#robotLimbGradient)" stroke-width="13" stroke-linecap="round" />
                    <circle cx="77" cy="242" r="7" fill="#f1cc86" stroke="#7a461a" stroke-width="3" />

                    <path class="robot-full__arm robot-full__arm--right" d="M118 168 C136 178 142 192 137 211" fill="none" stroke="url(#robotLimbGradient)" stroke-width="14" stroke-linecap="round" />
                    <path class="robot-full__forearm robot-full__forearm--right" d="M137 210 C131 225 120 236 106 241" fill="none" stroke="url(#robotLimbGradient)" stroke-width="13" stroke-linecap="round" />
                    <circle cx="103" cy="242" r="7" fill="#f1cc86" stroke="#7a461a" stroke-width="3" />

                    <path class="robot-full__leg robot-full__leg--left" d="M82 248 C78 266 78 281 80 292" fill="none" stroke="url(#robotLimbGradient)" stroke-width="14" stroke-linecap="round" />
                    <path class="robot-full__calf robot-full__calf--left" d="M80 291 C82 301 88 306 97 307" fill="none" stroke="url(#robotLimbGradient)" stroke-width="13" stroke-linecap="round" />
                    <ellipse cx="100" cy="308" rx="12" ry="6" fill="#15304f" />

                    <path class="robot-full__leg robot-full__leg--right" d="M98 248 C102 266 102 281 100 292" fill="none" stroke="url(#robotLimbGradient)" stroke-width="14" stroke-linecap="round" />
                    <path class="robot-full__calf robot-full__calf--right" d="M100 291 C98 301 92 306 83 307" fill="none" stroke="url(#robotLimbGradient)" stroke-width="13" stroke-linecap="round" />
                    <ellipse cx="80" cy="308" rx="12" ry="6" fill="#15304f" />
                  </g>
                </svg>
              </div>
            </div>
            <aside class="robot-chat-shell">
              <header class="robot-chat-shell__header">
                <div>
                  <span class="robot-chat-shell__eyebrow">Professor de graficos</span>
                  <strong>{{ currentRobotTip.title }}</strong>
                  <p class="robot-chat-shell__subtitle">Analiso datas, valores, picos, vales e pontos de atencao do painel.</p>
                </div>
                <div class="robot-chat-shell__actions">
                  <button type="button" class="robot-chat-clear" @click="robotChatMessages = createRobotContextMessages()">Reiniciar</button>
                  <button type="button" class="robot-chat-close" @click="closeRobotChat">Fechar</button>
                </div>
              </header>
              <div class="robot-chat-quick-actions">
                <button type="button" class="robot-quick-btn" @click="askRobotQuickAction('Faça uma análise do gráfico')">Análise</button>
                <button type="button" class="robot-quick-btn" @click="askRobotQuickAction('Qual é o pico?')">Pico</button>
                <button type="button" class="robot-quick-btn" @click="askRobotQuickAction('Qual é o vale?')">Vale</button>
                <button type="button" class="robot-quick-btn" @click="askRobotQuickAction('Qual é o total?')">Total</button>
                <button type="button" class="robot-quick-btn" @click="askRobotQuickAction('Quais são as datas?')">Datas</button>
                <button type="button" class="robot-quick-btn" @click="askRobotQuickAction('Quais são os alertas?')">Alertas</button>
              </div>
              <div ref="robotChatMessagesContainer" class="robot-chat-messages">
                <article
                  v-for="message in robotChatMessages"
                  :key="message.id"
                  class="robot-message"
                  :class="`robot-message--${message.role}`"
                >
                  <span class="robot-message__author">{{ message.role === 'robot' ? 'Professor' : 'Voce' }}</span>
                  <p>{{ message.text }}</p>
                </article>
              </div>
              <form class="robot-chat-input" @submit.prevent="submitRobotInput">
                <input
                  v-model.trim="robotInput"
                  type="text"
                  class="robot-chat-input__field"
                  placeholder="Pergunte sobre pico, vale, datas, total, alertas ou analise do grafico"
                />
                <button type="submit" class="robot-chat-input__submit">Enviar</button>
              </form>
            </aside>
          </section>
        </transition>
        <div v-if="!loading && tabFilteredTeams.length" class="perf-band-strip">
          <div class="perf-band-strip__item perf-band-strip__item--zero">
            <span class="perf-band-strip__label">Sem produção</span>
            <strong>{{ performanceBandStats.zero.count }}</strong>
            <small>equipes</small>
          </div>
          <div class="perf-band-strip__item perf-band-strip__item--low">
            <span class="perf-band-strip__label">Baixo</span>
            <strong>{{ performanceBandStats.low.count }}</strong>
            <small>{{ usesCountMetric ? 'equipes' : formatShort(performanceBandStats.low.value) }}</small>
          </div>
          <div class="perf-band-strip__item perf-band-strip__item--mid">
            <span class="perf-band-strip__label">Médio</span>
            <strong>{{ performanceBandStats.mid.count }}</strong>
            <small>{{ usesCountMetric ? 'equipes' : formatShort(performanceBandStats.mid.value) }}</small>
          </div>
          <div class="perf-band-strip__item perf-band-strip__item--high">
            <span class="perf-band-strip__label">Alto</span>
            <strong>{{ performanceBandStats.high.count }}</strong>
            <small>{{ usesCountMetric ? 'equipes' : formatShort(performanceBandStats.high.value) }}</small>
          </div>
          <div class="perf-band-strip__bar">
            <div class="perf-band-strip__bar-seg perf-band-strip__bar-seg--zero"
              :style="{ width: `${(performanceBandStats.zero.count / Math.max(tabFilteredTeams.length, 1)) * 100}%` }"></div>
            <div class="perf-band-strip__bar-seg perf-band-strip__bar-seg--low"
              :style="{ width: `${(performanceBandStats.low.count / Math.max(tabFilteredTeams.length, 1)) * 100}%` }"></div>
            <div class="perf-band-strip__bar-seg perf-band-strip__bar-seg--mid"
              :style="{ width: `${(performanceBandStats.mid.count / Math.max(tabFilteredTeams.length, 1)) * 100}%` }"></div>
            <div class="perf-band-strip__bar-seg perf-band-strip__bar-seg--high"
              :style="{ width: `${(performanceBandStats.high.count / Math.max(tabFilteredTeams.length, 1)) * 100}%` }"></div>
          </div>
        </div>

        <div v-if="hasActiveChart" ref="chartExportSurface" :class="['trend-chart-card', { 'trend-chart-card--gauge': chartType === 'gauge' }]">
          <apexchart
            v-if="isApexChartType && apexCanRender && chartType !== 'heatmap' && chartType !== 'gauge'"
            :key="chartType"
            class="trend-apex"
            :type="apexChartVisualType"
            :height="260"
            :options="apexTrendOptions"
            :series="apexTrendSeries"
          />
          <apexchart
            v-else-if="chartType === 'heatmap' && apexCanRender"
            key="heatmap"
            class="trend-apex trend-apex--heatmap"
            type="heatmap"
            :height="Math.max(280, tabFilteredTeams.slice(0, 20).length * 28 + 60)"
            :options="heatmapOptions"
            :series="apexTrendSeries"
          />
          <!-- ── Custom Gauge (Velocímetro) ── -->
          <div v-else-if="chartType === 'gauge' && gaugeCanRender" class="custom-gauge">
            <div class="gauge-canvas-wrap">
              <svg viewBox="0 0 400 270" class="gauge-canvas" role="img" :aria-label="`Velocímetro: ${Math.round(gaugeValuePercent)}% da meta`">
                <defs>
                  <filter id="gauge-glow" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="gauge-hub-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.6)" />
                  </filter>
                </defs>

                <!-- Background track (full semicircle) -->
                <path d="M 62 185 A 138 138 0 0 1 338 185"
                  fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="30" stroke-linecap="butt" />

                <!-- Zone: Red 0–50% -->
                <path d="M 62 185 A 138 138 0 0 1 200 47"
                  fill="none" stroke="rgba(239,68,68,0.22)" stroke-width="30" stroke-linecap="butt" />
                <!-- Zone: Amber 50–80% -->
                <path d="M 200 47 A 138 138 0 0 1 311.6 103.9"
                  fill="none" stroke="rgba(245,158,11,0.22)" stroke-width="30" stroke-linecap="butt" />
                <!-- Zone: Green 80–100% -->
                <path d="M 311.6 103.9 A 138 138 0 0 1 338 185"
                  fill="none" stroke="rgba(34,197,94,0.22)" stroke-width="30" stroke-linecap="butt" />

                <!-- Tick marks at 0, 25, 50, 75, 100% -->
                <line v-for="tick in gaugeTicks" :key="tick.pct"
                  :x1="tick.x1" :y1="tick.y1" :x2="tick.x2" :y2="tick.y2"
                  stroke="rgba(255,255,255,0.32)" stroke-width="1.5" />

                <!-- Active fill arc (glowing) -->
                <path v-if="gaugeValuePercent > 0"
                  :d="gaugeFillPath"
                  fill="none"
                  :stroke="gaugeFillColor"
                  stroke-width="30"
                  stroke-linecap="round"
                  filter="url(#gauge-glow)"
                />

                <!-- Zone reference labels -->
                <text x="46" y="207" class="gauge-ref" text-anchor="middle">0%</text>
                <text x="200" y="30" class="gauge-ref" text-anchor="middle">50%</text>
                <text x="354" y="207" class="gauge-ref" text-anchor="middle">100%</text>

                <!-- Needle (rotates around hub at 200,185) -->
                <g class="gauge-needle-g" :style="{ transform: `rotate(${gaugeNeedleRotation}deg)` }">
                  <polygon points="197.5,185 200,58 202.5,185" class="gauge-needle-poly" />
                  <polygon points="197.5,185 200,200 202.5,185" class="gauge-needle-tail" />
                </g>

                <!-- Hub circles (always on top, not rotated) -->
                <circle cx="200" cy="185" r="18" class="gauge-hub-ring" filter="url(#gauge-hub-shadow)" />
                <circle cx="200" cy="185" r="11" class="gauge-hub-dot" />

                <!-- Center readout (below arc baseline) -->
                <text x="200" y="222" class="gauge-pct-txt" text-anchor="middle">{{ Math.round(gaugeValuePercent) }}%</text>
                <text x="200" y="247" class="gauge-val-txt" text-anchor="middle">{{ gaugeValueLabel }}</text>
              </svg>

              <!-- Status badge -->
              <div :class="['gauge-badge', `gauge-badge--${gaugeZoneInfo.cls}`]">
                <Icon :icon="gaugeZoneInfo.icon" width="14" height="14" />
                {{ gaugeZoneInfo.label }}
              </div>
            </div>

            <!-- KPI row (4 cards) -->
            <div class="gauge-kpi-row">
              <article
                v-for="item in gaugeSummaryItems"
                :key="item.label"
                :class="['gauge-kpi', item.mod && `gauge-kpi--${item.mod}`]"
              >
                <Icon :icon="item.icon" width="20" height="20" class="gauge-kpi__icon" />
                <div class="gauge-kpi__body">
                  <span class="gauge-kpi__label">{{ item.label }}</span>
                  <strong class="gauge-kpi__value">{{ item.value }}</strong>
                  <small class="gauge-kpi__detail">{{ item.detail }}</small>
                </div>
              </article>
            </div>
          </div>

          <div v-else-if="chartType === 'target' && targetChartCanRender" class="target-chart-wrap">
            <apexchart
              key="target"
              class="trend-apex"
              type="line"
              :height="280"
              :options="targetChartOptions"
              :series="targetChartSeries"
            />
            <div class="target-chart-legend">
              <span class="target-chart-legend__item">
                <span class="target-chart-legend__dot" style="background:#38bdf8"></span>
                Realizado por dia
              </span>
              <span class="target-chart-legend__item">
                <span class="target-chart-legend__line" style="border-color:#f59e0b"></span>
                Meta diária ({{ formatShort(targetChartDailyTarget) }})
              </span>
            </div>
          </div>
          <div v-else-if="chartType === 'target' && !targetChartCanRender" class="chart-empty-state">
            <Icon icon="solar:target-bold-duotone" width="32" height="32" />
            <p>Meta vs Realizado disponível apenas para métricas de valor monetário.</p>
          </div>
          <div v-if="chartType === 'donut'" class="donut-chart">
            <div class="donut-chart__visual">
              <svg viewBox="0 0 100 100" class="donut-chart__svg" role="img" aria-label="Rosca de participação das equipes" @mouseleave="clearChartHover">
                <path
                  v-for="segment in donutChart.segments"
                  :key="segment.code"
                  :d="segment.path"
                  :fill="segment.color"
                  class="donut-chart__segment"
                  :class="{ 'is-other': segment.isOther, 'is-active': chartHover?.context === 'donut' && chartHover.code === segment.code }"
                  @mouseenter="setChartHover({ context: 'donut', code: segment.code, label: segment.display, value: segment.valueLabel, detail: `${segment.percentOfTotal.toFixed(1).replace('.', ',')}% do total` })"
                  @mouseleave="clearChartHover"
                >
                  <title>{{ segment.display }} · {{ segment.valueLabel }} · {{ segment.percentOfTotal.toFixed(1).replace('.', ',') }}%</title>
                </path>
              </svg>
              <div class="donut-chart__core">
                <div class="donut-chart__core-copy">
                  <strong>{{ donutCenterValue }}</strong>
                  <small>{{ donutCenterLabel }}</small>
                </div>
                <span>{{ donutCenterDetail }}</span>
              </div>
            </div>
            <div class="donut-chart__details">
              <div class="donut-chart__summary">
                <div class="donut-chart__summary-head">
                  <span>Resumo da participação</span>
                  <strong>{{ donutChart.rows.length }} fatias</strong>
                </div>
                <small>{{ donutCenterDetail }}</small>
                <span>Passe o mouse sobre as fatias ou itens para ver métricas detalhadas.</span>
              </div>
              <div class="donut-chart__legend">
                <article v-for="row in donutChart.rows" :key="row.code" class="donut-chart__item" :class="{ 'is-active': chartHover?.context === 'donut' && chartHover.code === row.code }" @mouseenter="setChartHover({ context: 'donut', code: row.code, label: row.display, value: row.valueLabel, detail: `${row.percentOfTotal.toFixed(1).replace('.', ',')}% do total` })" @mouseleave="clearChartHover">
                  <span class="donut-chart__swatch" :style="{ backgroundColor: row.color }"></span>
                  <div class="donut-chart__copy">
                    <strong>{{ row.display }}</strong>
                    <small>{{ row.valueLabel }} · {{ row.percentOfTotal.toFixed(1).replace('.', ',') }}%</small>
                  </div>
                </article>
              </div>
            </div>
          </div>
          <div v-else-if="chartType === 'composition'" class="composition-chart">
            <article v-for="row in compositionChart.rows" :key="row.code" class="composition-row" @mouseenter="setChartHover({ context: 'composition', label: row.display, value: row.valueLabel, detail: `${row.percentOfTotal.toFixed(1).replace('.', ',')}% do total` })" @mouseleave="clearChartHover">
              <div class="composition-row__head">
                <div>
                  <strong>{{ row.display }}</strong>
                  <small>{{ row.plate }}</small>
                </div>
                <div class="composition-row__value">
                  <strong>{{ row.valueLabel }}</strong>
                  <small>{{ row.percentOfTotal.toFixed(1).replace('.', ',') }}% da leitura</small>
                </div>
              </div>
              <div class="composition-row__bar">
                <span :style="{ width: `${row.percentOfLeader}%` }"></span>
              </div>
            </article>
          </div>
          <div v-if="chartHover && !isApexChartType" class="chart-hover-card">
            <span>{{ chartHover.label }}</span>
            <strong>{{ chartHover.value }}</strong>
            <small>{{ chartHover.detail }}</small>
          </div>
          <div class="trend-chart__footer" v-if="showTrendFooter">
            <span>{{ trendFooterStartLabel }}</span>
            <span>{{ trendFooterEndLabel }}</span>
          </div>
          <div class="trend-insights">
            <article v-for="item in trendInsightItems" :key="item.label">
              <div class="metric-card__head">
                <span class="metric-card__icon metric-card__icon--soft">
                  <Icon :icon="item.icon" width="18" height="18" />
                </span>
                <span>{{ item.label }}</span>
              </div>
              <strong>{{ item.value }}</strong>
              <small>{{ item.detail }}</small>
            </article>
          </div>
        </div>
        <div v-else class="trend-empty">
          <p>Não há dados suficientes para montar este gráfico.</p>
        </div>
      </section>

      <section v-if="showAdvanced" class="dates-panel panel-appear panel-appear--3">
        <header>
          <div>
            <h2>Todas as datas do período</h2>
            <p>{{ dateSummaries.length }} datas consolidadas · clique para focar no dia</p>
          </div>
          <p class="cards-total">Pico diário: {{ topDailySummary ? `${topDailySummary.label} · ${formatCurrency(topDailySummary.total)}` : '—' }}</p>
        </header>
        <div class="date-summary-grid">
          <button
            v-for="date in dateSummaries"
            :key="date.key"
            type="button"
            class="date-summary-card"
            :class="{ active: date.key === selectedDateKey }"
            @click="selectSummaryDate(date.key)"
          >
            <span class="date-summary-card__label">{{ date.label }}</span>
            <strong>{{ formatCurrency(date.total) }}</strong>
            <small>{{ date.activeTeams }} equipes com lançamento</small>
          </button>
        </div>
      </section>

      <section class="cards-section panel-appear panel-appear--4">
        <header>
          <div>
            <h2>{{ showAdvanced ? cardsTitle : 'Equipes em destaque' }}</h2>
            <p>{{ showAdvanced ? `${tabFilteredTeams.length} equipes listadas · ${cardsDescription}` : 'Clique em uma equipe para abrir o detalhe quando precisar aprofundar' }}</p>
          </div>
          <p class="cards-total">{{ formatCurrency(cardsTotalValue) }} {{ cardsTotalSuffix }}</p>
        </header>
        <div v-if="showAdvanced" class="performance-legend">
          <article v-for="item in performanceLegendItems" :key="item.id" :class="['legend-chip', item.className, { active: performanceFilter === item.id }]">
            <span>{{ item.label }}</span>
            <strong>{{ item.range }}</strong>
            <small>{{ item.count }} equipes</small>
          </article>
        </div>
        <div v-if="leadingTeam" class="leader-spotlight" :class="{ 'leader-spotlight--with-controls': showAdvanced }">
          <div class="leader-spotlight__copy">
            <span class="leader-spotlight__label">
              <Icon class="leader-spotlight__label-icon" icon="solar:crown-minimalistic-bold-duotone" width="16" height="16" />
              Equipe em destaque
            </span>
            <strong>{{ leadingTeam.display }}</strong>
            <small>{{ leadingTeam.plate || 'Sem placa' }} · {{ leadingTeam.type || 'Sem categoria' }}</small>
          </div>
          <div class="leader-spotlight__stats">
            <article v-for="item in leaderSpotlightStats" :key="item.label">
              <div class="metric-card__head">
                <span class="metric-card__icon metric-card__icon--soft">
                  <Icon :icon="item.icon" width="18" height="18" />
                </span>
                <span>{{ item.label }}</span>
              </div>
              <strong>{{ item.value }}</strong>
            </article>
          </div>
        </div>
        <div class="cards-grid">
          <article
            v-for="(team, index) in cardsTeams"
            :key="team.code"
            class="team-card"
            :class="[valueBadgeClass(teamSortValue(team)), { active: selectedTeam && selectedTeam.code === team.code }]"
            role="button"
            tabindex="0"
            @click="openTeamDrawer(team)"
            @keydown.enter.prevent="openTeamDrawer(team)"
            @keydown.space.prevent="openTeamDrawer(team)"
          >
            <div class="team-card__topline">
              <span class="team-rank">#{{ index + 1 }}</span>
              <button
                class="pin-button"
                :aria-pressed="isPinned(team.code)"
                @click.stop="togglePin(team.code)"
                title="Fixar equipe"
              >
                <Icon :icon="isPinned(team.code) ? 'solar:star-bold' : 'solar:star-linear'" width="18" height="18" aria-hidden="true" />
              </button>
            </div>
            <div class="team-card__meta">
              <div class="team-card__identity">
                <span class="team-code">{{ team.display }}</span>
                <span class="team-plate">{{ team.plate || '—' }}</span>
              </div>
              <span class="team-card__tone">{{ performanceLabelForBand(teamPerformanceBand(team)) }}</span>
            </div>
            <div class="team-card__details">
              <div>
                <span>{{ cardsPrimaryMetricLabel }}</span>
                <strong>{{ formatCurrency(teamSortValue(team)) }}</strong>
              </div>
              <div>
                <span>{{ cardsSecondaryMetricLabel }}</span>
                <strong>{{ formatCurrency(cardsSecondaryMetricValue(team)) }}</strong>
              </div>
            </div>
            <div class="team-card__share">
              <strong>{{ teamSharePercent(team).toFixed(1).replace('.', ',') }}%</strong>
              <span>{{ teamSharePercent(team) > 0 ? (rankingMode === 'period' ? 'do período' : 'do dia') : 'sem produção' }}</span>
            </div>
            <div class="team-card__bar">
              <span :style="{ width: `${teamSharePercent(team)}%` }"></span>
            </div>
            <div class="team-card__footer">
              <small class="team-card__hint">Abrir detalhe da equipe</small>
              <span class="team-card__cta">Ver mais</span>
            </div>
          </article>
        </div>
        <aside v-if="showAdvanced && selectedTeam" class="team-drawer">
          <header class="team-drawer__header">
            <div>
              <p class="overview-label">Drill-down da equipe</p>
              <h3>{{ selectedTeam.display }}</h3>
              <p class="team-drawer__subtitle">{{ selectedTeamNarrative }}</p>
            </div>
            <button type="button" class="team-drawer__close" @click="closeTeamDrawer">Fechar</button>
          </header>
          <div class="team-drawer__grid">
            <article v-for="item in selectedTeamDrawerMetrics" :key="item.label">
              <div class="team-drawer__metric-head">
                <span class="team-drawer__metric-icon">
                  <Icon :icon="item.icon" width="18" height="18" />
                </span>
                <span>{{ item.label }}</span>
              </div>
              <strong>{{ item.value }}</strong>
              <small>{{ item.detail }}</small>
            </article>
          </div>
          <div class="team-drawer__chart" v-if="selectedTeamTrend.hasData">
            <svg viewBox="0 0 100 42" class="trend-chart" role="img" aria-label="Evolução da equipe selecionada">
              <defs>
                <linearGradient id="teamTrendArea" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stop-color="rgba(251, 191, 36, 0.36)" />
                  <stop offset="100%" stop-color="rgba(251, 191, 36, 0.02)" />
                </linearGradient>
              </defs>
              <path :d="selectedTeamTrend.areaPath" fill="url(#teamTrendArea)" opacity="0.35" />
              <path :d="selectedTeamTrend.path" class="trend-chart__line" />
              <g v-for="point in selectedTeamTrend.points" :key="point.key">
                <circle
                  :cx="point.x"
                  :cy="point.y"
                  :r="!isAllDatesSelected && point.key === selectedDateKey ? 1.9 : 1.2"
                  :class="['trend-chart__point', { 'is-active': !isAllDatesSelected && point.key === selectedDateKey }]"
                />
              </g>
            </svg>
          </div>
          <div class="team-drawer__footer">
            <article v-for="item in selectedTeamFooterMetrics" :key="item.label">
              <div class="team-drawer__metric-head">
                <span class="team-drawer__metric-icon team-drawer__metric-icon--soft">
                  <Icon :icon="item.icon" width="18" height="18" />
                </span>
                <span>{{ item.label }}</span>
              </div>
              <strong>{{ item.value }}</strong>
              <small>{{ item.detail }}</small>
            </article>
          </div>
        </aside>
      </section>

        <section v-if="showAdvanced" class="history-panel panel-appear panel-appear--5">
              <header>
                <div>
                  <h2>Histórico resumido</h2>
                  <p>Últimas {{ historyColumns.length }} datas</p>
                </div>
                <div class="history-toolbar">
                  <div class="chart-export-actions">
                    <button type="button" class="chart-export-btn" @click="exportTableAsCsv" :disabled="!!tableExportState || !tabFilteredTeams.length">
                      {{ tableExportState === 'csv' ? 'Gerando CSV...' : 'CSV' }}
                    </button>
                    <button type="button" class="chart-export-btn" @click="exportTableAsExcel" :disabled="!!tableExportState || !tabFilteredTeams.length">
                      {{ tableExportState === 'excel' ? 'Gerando Excel...' : 'Excel' }}
                    </button>
                  </div>
                  <div class="history-nav">
                    <button type="button" @click="shiftHistory(-1)" :disabled="!canShiftPrev">
                      ‹
                    </button>
                    <button type="button" @click="shiftHistory(1)" :disabled="!canShiftNext">
                      ›
                    </button>
                  </div>
                </div>
              </header>

              <HistoryTable
                :teams="tabFilteredTeams"
                :dates="historyColumns"
                :value-getter="valueFor"
                :format-short="formatShort"
                :badge-class="valueBadgeClass"
                :pinned-checker="isPinned"
              />
            </section>
        </div>
    </template>
  </section>
</template>

<script>
import { defineAsyncComponent, nextTick } from 'vue';
import { Icon } from '@iconify/vue';
import HistoryTable from './HistoryTable.vue';

const ApexChart = defineAsyncComponent(() => import('vue3-apexcharts'));
const PIN_STORAGE_KEY = 'producao_pinned_teams_v1';
const LAST_DATE_STORAGE_KEY = 'producao_last_date_key_v1';
const CHART_TYPE_STORAGE_KEY = 'producao_chart_type_v1';
const ROBOT_DOCK_STORAGE_KEY = 'producao_robot_dock_v1';
const BASE_STORAGE_KEY = 'producao_selected_base_v1';
const EXECUTIVE_MODE_STORAGE_KEY = 'producao_executive_mode_v1';
const ALL_DATES_KEY = '__ALL_DATES__';
const DEFAULT_BASE_KEY = 'BCB';
const ALL_BASE_KEY = 'ALL';
const PRODUCTION_BASES = [
  { key: ALL_BASE_KEY, label: 'Todas' },
  { key: 'BCB', label: 'BCB' },
  { key: 'ITM', label: 'ITM' },
  { key: 'STI', label: 'STI' },
];
const PRODUCTION_SHEET_PLAN = {
  BCB: ['OBRAS', 'EME', 'CUSTEIO'],
  ITM: ['OBRAS', 'EME', 'CUSTEIO'],
  STI: ['OBRAS', 'EME', 'CUSTEIO'],
};
const DEFAULT_TEAM_DAILY_TARGET = 9752.47;
const BASE_CACHE_TTL_MS = 5 * 60 * 1000;
const TEAM_DAILY_TARGET_OVERRIDES = {
  'MA-BCB-T001M': 3258.83,
};
const PERFORMANCE_FILTER_LABELS = {
  all: 'Todas',
  zero: 'Sem produção',
  low: 'Baixa',
  mid: 'Média',
  high: 'Alta',
};

const DONUT_COLORS = ['#ff6b6b', '#ffd166', '#06d6a0', '#4cc9f0', '#7b61ff', '#f72585'];
const AVAILABLE_CHART_TYPES = ['line', 'bar', 'donut', 'gauge', 'heatmap', 'target'];

const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
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

const buildTrendGeometry = (items = [], selectedKey = '', formatCurrency = (value) => value) => {
  if (!items.length) {
    return {
      hasData: false,
      points: [],
      path: '',
      areaPath: '',
      firstLabel: '—',
      lastLabel: '—',
      selectedLabel: '—',
      selectedValue: '—',
      bestLabel: '—',
      bestValue: '—',
      averageValue: '—',
      selectedPoint: null,
    };
  }

  const values = items.map((item) => Number(item.total) || 0);
  const maxValue = Math.max(...values, 0);
  const minValue = Math.min(...values, 0);
  const range = maxValue - minValue || 1;
  const step = items.length > 1 ? 88 / (items.length - 1) : 0;

  const points = items.map((item, index) => {
    const x = 6 + (step * index);
    const normalized = (item.total - minValue) / range;
    const y = 34 - (normalized * 24);
    return {
      ...item,
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
    };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} 36 L ${points[0].x} 36 Z`;
  const selectedPoint = points.find((point) => point.key === selectedKey) || points[points.length - 1];
  const bestPoint = points.reduce((best, current) => (current.total > best.total ? current : best), points[0]);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;

  return {
    hasData: true,
    points,
    path: linePath,
    areaPath,
    firstLabel: points[0].label,
    lastLabel: points[points.length - 1].label,
    selectedLabel: selectedPoint.label,
    selectedValue: formatCurrency(selectedPoint.total),
    bestLabel: bestPoint.label,
    bestValue: formatCurrency(bestPoint.total),
    averageValue: formatCurrency(average),
    selectedPoint,
  };
};

const buildBarGeometry = (items = [], selectedKey = '', formatCurrency = (value) => value) => {
  if (!items.length) {
    return {
      hasData: false,
      bars: [],
      selectedLabel: '—',
      selectedValue: '—',
      maxLabel: '—',
      maxValue: '—',
    };
  }

  const maxTotal = Math.max(...items.map((item) => Number(item.total) || 0), 1);
  const gap = 2;
  const width = items.length > 0 ? (88 - gap * (items.length - 1)) / items.length : 0;
  const bars = items.map((item, index) => {
    const total = Number(item.total) || 0;
    const height = maxTotal ? Math.max(2, (total / maxTotal) * 26) : 2;
    return {
      ...item,
      x: Number((6 + index * (width + gap)).toFixed(2)),
      y: Number((34 - height).toFixed(2)),
      width: Number(width.toFixed(2)),
      height: Number(height.toFixed(2)),
      isActive: item.key === selectedKey,
    };
  });

  const selectedBar = bars.find((bar) => bar.key === selectedKey) || bars[bars.length - 1];
  const maxBar = bars.reduce((best, current) => (current.total > best.total ? current : best), bars[0]);

  return {
    hasData: true,
    bars,
    selectedLabel: selectedBar.label,
    selectedValue: formatCurrency(selectedBar.total),
    maxLabel: maxBar.label,
    maxValue: formatCurrency(maxBar.total),
  };
};

const buildCompositionData = (teams = [], metricGetter = (team) => team, formatCurrency = (value) => value) => {
  const allRows = teams
    .map((team) => ({
      code: team.code,
      display: team.display,
      plate: team.plate || '—',
      value: Number(metricGetter(team)) || 0,
    }))
    .filter((team) => team.value > 0)
    .sort((left, right) => right.value - left.value);

  const rows = allRows
    .slice(0, 6);
  const omittedRows = allRows.slice(6);

  if (!rows.length) {
    return {
      hasData: false,
      rows: [],
      total: '—',
      leaderLabel: '—',
      leaderValue: '—',
    };
  }

  const total = allRows.reduce((sum, row) => sum + row.value, 0);
  const coveredTotal = rows.reduce((sum, row) => sum + row.value, 0);
  const otherValue = Math.max(0, total - coveredTotal);
  const maxValue = rows[0].value || 1;

  return {
    hasData: true,
    rows: rows.map((row) => ({
      ...row,
      percentOfLeader: Math.max(6, (row.value / maxValue) * 100),
      percentOfTotal: total ? (row.value / total) * 100 : 0,
      valueLabel: formatCurrency(row.value),
    })),
    total: formatCurrency(total),
    totalValue: total,
    coveredTotal: formatCurrency(coveredTotal),
    coveredPercent: total ? (coveredTotal / total) * 100 : 0,
    otherValue,
    otherValueLabel: formatCurrency(otherValue),
    otherPercent: total ? (otherValue / total) * 100 : 0,
    omittedRows,
    leaderLabel: rows[0].display,
    leaderValue: formatCurrency(rows[0].value),
  };
};

const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

const buildDonutSegmentPath = (centerX, centerY, outerRadius, innerRadius, startAngle, endAngle) => {
  const outerStart = polarToCartesian(centerX, centerY, outerRadius, endAngle);
  const outerEnd = polarToCartesian(centerX, centerY, outerRadius, startAngle);
  const innerStart = polarToCartesian(centerX, centerY, innerRadius, endAngle);
  const innerEnd = polarToCartesian(centerX, centerY, innerRadius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';

  return [
    `M ${outerStart.x} ${outerStart.y}`,
    `A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${outerEnd.x} ${outerEnd.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${innerStart.x} ${innerStart.y}`,
    'Z',
  ].join(' ');
};

const buildDonutChart = (composition) => {
  if (!composition?.hasData || !composition.rows.length) {
    return {
      hasData: false,
      rows: [],
      segments: [],
    };
  }

  const allRows = [...composition.rows];
  if (composition.otherValue > 0) {
    if ((composition.omittedRows || []).length === 1) {
      const onlyRow = composition.omittedRows[0];
      allRows.push({
        ...onlyRow,
        valueLabel: composition.otherValueLabel,
        percentOfTotal: composition.otherPercent,
      });
    } else {
      allRows.push({
        code: 'others',
        display: 'Demais equipes',
        plate: '—',
        value: composition.otherValue,
        valueLabel: composition.otherValueLabel,
        percentOfTotal: composition.otherPercent,
        isOther: true,
      });
    }
  }

  let offset = 0;
  const rows = allRows.map((row, index) => {
    const percent = Number(row.percentOfTotal) || 0;
    const color = row.isOther ? 'rgba(148, 163, 184, 0.35)' : DONUT_COLORS[index % DONUT_COLORS.length];
    const start = offset;
    const end = offset + percent;
    offset = end;
    return {
      ...row,
      color,
      start,
      end,
    };
  });

  const segments = rows
    .filter((row) => row.end > row.start)
    .map((row) => ({
      ...row,
      path: buildDonutSegmentPath(50, 50, 44, 22, (row.start / 100) * 360, (row.end / 100) * 360),
    }));

  return {
    hasData: true,
    rows,
    segments,
  };
};

export default {
  name: 'ProducaoView',
  components: {
    Icon,
    HistoryTable,
    apexchart: ApexChart,
  },
  data() {
    return {
      teamRows: [],
      // diagnostic sample returned when server couldn't normalize
      sampleRows: null,
      headerCandidate: null,
      headerCandidates: [],
      dataStartColumn: 6,
      tabs: ['GERAL', 'OBRAS', 'EME', 'CUSTEIO'],
      activeTab: 'GERAL',
      loadedTab: 'GERAL',
      executiveMode: this.loadExecutiveMode(),
      selectedBase: this.loadSelectedBase(),
      tabPayloadCache: {},
      basePayloadCache: {},
      loading: true,
      syncing: false,
      uploading: false,
      errorMessage: '',
      importSummary: {},
      availableDates: [],
      selectedDateKey: '',
      rankingMode: 'period',
      performanceFilter: 'all',
      showAdvanced: false,
      showTeamFilter: false,
      chartType: this.loadChartType(),
      exportState: '',
      tableExportState: '',
      chartHover: null,
      lastUpdatedLabel: '',
      originLabel: '—',
      searchQuery: '',
      selectedTeamCodes: [],
      pinnedTeams: this.loadPinnedTeams(),
      selectedTeamCode: '',
      robotTipIndex: 0,
      robotChatOpen: false,
      robotChatMessages: [],
      robotInput: '',
      robotSpeaking: false,
      robotSpeakTimer: null,
      robotEntranceAnimating: false,
      robotEntranceTimer: null,
      robotDockPosition: {
        top: 132,
        left: null,
      },
      robotDockPreferredTop: 132,
      robotDragActive: false,
      robotDragOffsetX: 0,
      robotDragOffsetY: 0,
      robotScrollTicking: false,
      lastDateKey: this.loadLastDateKey(this.loadSelectedBase()),
      historyWindowStart: 0,
      historyWindowSize: 8,
    };
  },
  computed: {
    baseOptions() {
      return PRODUCTION_BASES;
    },
    activeBaseLabel() {
      const base = PRODUCTION_BASES.find((item) => item.key === this.selectedBase);
      return base ? base.label : this.selectedBase;
    },
    isAllBasesSelected() {
      return this.selectedBase === ALL_BASE_KEY;
    },
    metricKind() {
      return this.importSummary.metricKind || 'currency';
    },
    metricLabel() {
      return this.importSummary.metricLabel || (this.metricKind === 'count' ? 'programacoes' : 'valor programado');
    },
    usesCountMetric() {
      return this.metricKind === 'count';
    },
    activeSheetLabel() {
      const baseScope = this.selectedBase === ALL_BASE_KEY ? ' (todas as bases)' : '';
      return this.activeTab === 'GERAL'
        ? `OBRAS + EME + CUSTEIO${baseScope}`
        : `${this.activeTab}${baseScope}`;
    },
    rawTabTeams() {
      if (this.activeTab === 'GERAL') return this.teamRows;
      if (this.loadedTab === this.activeTab) return this.teamRows;
      return this.teamRows.filter((team) => this.matchesTab(team, this.activeTab));
    },
    dateFilterOptions() {
      return [
        { key: ALL_DATES_KEY, label: 'Todas as datas' },
        ...this.availableDates,
      ];
    },
    isAllDatesSelected() {
      return !this.selectedDateKey || this.selectedDateKey === ALL_DATES_KEY;
    },
    selectedDate() {
      if (this.isAllDatesSelected) return null;
      return this.availableDates.find((c) => c.key === this.selectedDateKey) || null;
    },
    selectedDateSummary() {
      if (this.isAllDatesSelected) return null;
      return this.dateSummaries.find((date) => date.key === this.selectedDateKey) || null;
    },
    robotTips() {
      const selectedRange = this.isAllDatesSelected
        ? `todo o período ${this.importDateRangeLabel}`
        : `${this.selectedDateContextLabel} na janela ${this.importDateRangeLabel}`;

      return [
        {
          title: 'Leitura do gráfico',
          text: `Estou interpretando o gráfico ${this.chartPanelTitle.toLowerCase()} para ${selectedRange}, com total de ${this.formatCurrency(this.selectedDateTotal)}.`,
        },
        {
          title: 'Tendência atual',
          text: this.rankingMode === 'period'
            ? `No período completo, a performance média diária está em ${this.formatCurrency(this.averageDailyTotal)} e mostra o comportamento consolidado das equipes.`
            : `Na data selecionada, comparamos ${this.selectedDateContextLabel} ao restante da janela ${this.importDateRangeLabel} para identificar desvios.`,
        },
        {
          title: 'Pico e vale',
          text: this.topDailySummary && this.lowestDailySummary
            ? `O maior pico está em ${this.topDailySummary.label} com ${this.formatCurrency(this.topDailySummary.total)} e o vale está em ${this.lowestDailySummary.label} com ${this.formatCurrency(this.lowestDailySummary.total)}.`
            : 'Ainda não há dados suficientes para determinar um pico e um vale confiáveis.',
        },
        {
          title: 'Pontos de atenção',
          text: this.operationalAlerts.length
            ? `Aviso: ${this.operationalAlerts[0].text}`
            : `Sem alertas críticos no momento. Há ${this.zeroPerformanceTeamsCount} equipes sem lançamento no recorte atual.`,
        },
        {
          title: 'Atenção à meta',
          text: this.usesCountMetric
            ? 'Neste modo de contagem, foco em volume e agendas, sem meta financeira específica.'
            : `A performance está ${this.dailyTargetDeltaPercent >= 0 ? 'acima' : 'abaixo'} da meta em ${Math.abs(this.dailyTargetDeltaPercent).toFixed(1).replace('.', ',')}%. ${this.dailyTargetSupportLabel}.`,
        },
        {
          title: 'Treinamento contínuo',
          text: `Estou aprendendo com os dados do painel para sugerir diagnósticos rápidos e manter a leitura do gráfico alinhada ao contexto operacional atual.`,
        },
      ];
    },
    currentRobotTip() {
      return this.robotTips[this.robotTipIndex] || { title: 'Professor de gráficos', text: 'Estou pronto para analisar gráficos, datas e pontos de atenção do painel.' };
    },
    robotDockStyle() {
      return {
        top: `${this.robotDockPosition.top}px`,
        left: `${this.robotDockPosition.left ?? 24}px`,
      };
    },
    sourceSheetLabels() {
      const summarySheets = Array.isArray(this.importSummary.sourceSheets) ? this.importSummary.sourceSheets : [];
      if (summarySheets.length) return summarySheets;
      if (this.activeTab === 'GERAL') return ['OBRAS', 'EME', 'CUSTEIO'];
      return this.activeTab ? [this.activeTab] : [];
    },
    chartTypeOptions() {
      return [
        { value: 'line', label: 'Linha', icon: 'solar:graph-up-linear' },
        { value: 'bar', label: 'Barras', icon: 'solar:chart-2-linear' },
        { value: 'donut', label: 'Rosca', icon: 'solar:pie-chart-2-linear' },
        { value: 'gauge', label: 'Velocímetro', icon: 'solar:speedometer' },
        { value: 'heatmap', label: 'Mapa de calor', icon: 'solar:heatmap-linear' },
        { value: 'target', label: 'Meta × Real', icon: 'solar:target-bold-duotone' },
      ];
    },
    teamFilterOptions() {
      return [...this.rawTabTeams].sort((left, right) => left.display.localeCompare(right.display));
    },
    teamFilterLabel() {
      if (!this.rawTabTeams.length) return 'Sem equipes';
      if (this.selectedTeamCodes.length === this.rawTabTeams.length) return 'Todas as equipes';
      if (!this.selectedTeamCodes.length) return 'Nenhuma equipe';
      return `${this.selectedTeamCodes.length} equipes marcadas`;
    },
    executiveQuickMetrics() {
      return [
        {
          label: 'Produção total',
          value: this.formatCurrency(this.executiveRealizedTotal),
          detail: this.executiveRealizedLabel,
        },
        {
          label: 'Meta referência',
          value: this.formatCurrency(this.dailyReferenceTarget),
          detail: this.dailyTargetStatusLabel,
        },
        {
          label: 'Desvio',
          value: this.executiveDeltaLabel,
          detail: this.dailyTargetSupportLabel,
        },
        {
          label: 'Equipes sem lançamento',
          value: String(this.zeroPerformanceTeamsCount),
          detail: this.selectedDateContextLabel,
        },
      ];
    },
    executiveQuickTeams() {
      return this.executiveRankingTeams.slice(0, 5);
    },
    selectedTeamCodeSet() {
      return new Set(this.selectedTeamCodes);
    },
    filteredTeams() {
      if (!this.teamRows.length) return [];
      const term = this.searchQuery.toLowerCase();
      const matches = this.rawTabTeams.filter((team) => {
        if (this.selectedTeamCodes.length && !this.selectedTeamCodeSet.has(team.code)) {
          return false;
        }
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
    baseTabTeams() {
      return this.filteredTeams;
    },
    performanceThresholds() {
      const positiveValues = this.baseTabTeams
        .map((team) => this.teamSortValue(team))
        .filter((value) => value > 0)
        .sort((left, right) => left - right);

      if (!positiveValues.length) {
        return {
          lowMax: 0,
          midMax: 0,
        };
      }

      const lowMax = this.pickThresholdValue(positiveValues, 0.33);
      const midMax = Math.max(lowMax, this.pickThresholdValue(positiveValues, 0.66));

      return {
        lowMax,
        midMax,
      };
    },
    performanceLegendItems() {
      return ['zero', 'low', 'mid', 'high'].map((band) => ({
        id: band,
        label: PERFORMANCE_FILTER_LABELS[band],
        range: this.performanceRangeLabel(band),
        count: this.baseTabTeams.filter((team) => this.teamPerformanceBand(team) === band).length,
        className: `legend-chip--${band}`,
      }));
    },
    performanceFilterOptions() {
      return [
        { value: 'all', label: PERFORMANCE_FILTER_LABELS.all },
        ...this.performanceLegendItems.map((item) => ({ value: item.id, label: item.label })),
      ];
    },
    performanceFilterLabel() {
      return PERFORMANCE_FILTER_LABELS[this.performanceFilter] || PERFORMANCE_FILTER_LABELS.all;
    },
    cardsTeams() {
      const sorted = [...this.tabFilteredTeams].sort((left, right) => {
        const leftPinned = this.isPinned(left.code) ? 1 : 0;
        const rightPinned = this.isPinned(right.code) ? 1 : 0;
        if (leftPinned !== rightPinned) return rightPinned - leftPinned;

        const leftValue = this.teamSortValue(left);
        const rightValue = this.teamSortValue(right);
        if (leftValue !== rightValue) return rightValue - leftValue;

        return left.display.localeCompare(right.display);
      });
      return sorted.slice(0, 12);
    },
    tabFilteredTeams() {
      if (this.performanceFilter === 'all') return this.baseTabTeams;
      return this.baseTabTeams.filter((team) => this.teamPerformanceBand(team) === this.performanceFilter);
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
    selectedDateTotal() {
      if (this.isAllDatesSelected) return this.periodTotal;
      return this.tabFilteredTeams.reduce((total, team) => total + this.valueFor(team, this.selectedDateKey), 0);
    },
    selectedDateActiveTeams() {
      if (this.isAllDatesSelected) return this.productiveTeamsCount;
      return this.tabFilteredTeams.filter((team) => this.valueFor(team, this.selectedDateKey) > 0).length;
    },
    dateSummaries() {
      return this.availableDates.map((date) => {
        const total = this.tabFilteredTeams.reduce((sum, team) => sum + this.valueFor(team, date.key), 0);
        const activeTeams = this.tabFilteredTeams.filter((team) => this.valueFor(team, date.key) > 0).length;
        return {
          ...date,
          total,
          activeTeams,
        };
      });
    },
    periodTotal() {
      return this.tabFilteredTeams.reduce((total, team) => total + this.teamTotal(team), 0);
    },
    productiveTeamsCount() {
      return this.tabFilteredTeams.filter((team) => this.teamTotal(team) > 0).length;
    },
    baseProductiveTeamsCount() {
      return this.baseTabTeams.filter((team) => this.teamTotal(team) > 0).length;
    },
    zeroPerformanceTeamsCount() {
      return this.baseTabTeams.filter((team) => this.teamPerformanceBand(team) === 'zero').length;
    },
    averageDailyTotal() {
      if (!this.dateSummaries.length) return 0;
      return this.dateSummaries.reduce((sum, date) => sum + date.total, 0) / this.dateSummaries.length;
    },
    selectedDateContextLabel() {
      if (this.isAllDatesSelected) return 'Todas as datas';
      return this.selectedDate?.label || 'Data selecionada';
    },
    scopeStartDateKey() {
      const firstAvailableKey = this.availableDates[0]?.key || '';
      if (!firstAvailableKey) return '';
      if (this.rankingMode === 'period' || this.isAllDatesSelected) {
        return this.monthStartKey(firstAvailableKey);
      }
      return this.monthStartKey(this.selectedDateKey || firstAvailableKey);
    },
    scopeEndDateKey() {
      if (this.rankingMode === 'period' || this.isAllDatesSelected) {
        return this.availableDates[this.availableDates.length - 1]?.key || '';
      }
      return this.selectedDateKey || '';
    },
    scopeWeekdaysCount() {
      return this.countWeekdaysInRange(this.scopeStartDateKey, this.scopeEndDateKey);
    },
    activeDateCount() {
      if (this.isAllDatesSelected) return Math.max(this.availableDates.length, 1);
      return 1;
    },
    targetScopeLabel() {
      if (this.usesCountMetric) return 'Meta não aplicada';
      return this.rankingMode === 'period' || this.isAllDatesSelected
        ? 'Meta acumulada do período'
        : 'Meta acumulada do mês';
    },
    executiveRealizedTotal() {
      if (!this.scopeEndDateKey) return 0;
      if (this.rankingMode === 'period' || this.isAllDatesSelected) return this.periodTotal;
      return this.tabFilteredTeams.reduce((sum, team) => sum + this.sumTeamValueInRange(team, this.scopeStartDateKey, this.scopeEndDateKey), 0);
    },
    executiveRealizedLabel() {
      return this.rankingMode === 'period' || this.isAllDatesSelected
        ? 'Realizado no período'
        : 'Realizado acumulado no mês';
    },
    topDailySummary() {
      return this.dateSummaries.reduce((top, current) => {
        if (!top) return current;
        return current.total > top.total ? current : top;
      }, null);
    },
    lowestDailySummary() {
      return this.dateSummaries.reduce((lowest, current) => {
        if (!lowest) return current;
        return current.total < lowest.total ? current : lowest;
      }, null);
    },
    operationalSummaryTitle() {
      if (this.activeTab === 'GERAL') {
        return 'Consolidado operacional das frentes ativas';
      }
      return `Desempenho operacional de ${this.activeSheetLabel}`;
    },
    operationalFootnote() {
      if (!this.topDailySummary) {
        return `Cobertura atual: ${this.importDateRangeLabel}`;
      }
      return `Janela ${this.importDateRangeLabel} · pico em ${this.topDailySummary.label} com ${this.formatCurrency(this.topDailySummary.total)}`;
    },
    dailyReferenceTarget() {
      if (this.usesCountMetric) return 0;
      const weekdayTarget = this.tabFilteredTeams.reduce((sum, team) => sum + this.teamDailyTarget(team), 0);
      return weekdayTarget * this.scopeWeekdaysCount;
    },
    monthlyTargetReferenceDateKey() {
      return this.scopeEndDateKey || this.availableDates[this.availableDates.length - 1]?.key || '';
    },
    monthlyTargetWeekdaysCount() {
      if (!this.monthlyTargetReferenceDateKey) return 0;
      return this.countWeekdaysInRange(
        this.monthStartKey(this.monthlyTargetReferenceDateKey),
        this.monthEndKey(this.monthlyTargetReferenceDateKey),
      );
    },
    monthlyTargetPerTeam() {
      if (this.usesCountMetric) return 0;
      return DEFAULT_TEAM_DAILY_TARGET * this.monthlyTargetWeekdaysCount;
    },
    monthlyTargetPerTeamLabel() {
      if (this.usesCountMetric) return 'Sem meta financeira para esta base';
      const customTargets = this.tabFilteredTeams.filter((team) => this.teamDailyTarget(team) !== DEFAULT_TEAM_DAILY_TARGET).length;
      const weekdayLabel = `${this.monthlyTargetWeekdaysCount} dias úteis no mês`;
      if (!customTargets) return weekdayLabel;
      return `${weekdayLabel} · ${customTargets} equipes com meta própria`;
    },
    dailyTargetDelta() {
      return this.executiveRealizedTotal - this.dailyReferenceTarget;
    },
    dailyTargetDeltaPercent() {
      if (!this.dailyReferenceTarget) return 0;
      return (this.dailyTargetDelta / this.dailyReferenceTarget) * 100;
    },
    dailyTargetTone() {
      if (this.dailyTargetDeltaPercent >= 10) return 'good';
      if (this.dailyTargetDeltaPercent <= -10) return 'critical';
      return 'neutral';
    },
    dailyTargetStatusLabel() {
      if (this.usesCountMetric) return 'Sem meta financeira para esta base';
      if (!this.tabFilteredTeams.length) return 'Meta indisponível';
      if (this.dailyTargetTone === 'good') return `Acima da ${this.targetScopeLabel.toLowerCase()}`;
      if (this.dailyTargetTone === 'critical') return `Abaixo da ${this.targetScopeLabel.toLowerCase()}`;
      return `Em linha com a ${this.targetScopeLabel.toLowerCase()}`;
    },
    dailyTargetSupportLabel() {
      if (this.usesCountMetric) return 'Comparativo por quantidade de programações';
      if (!this.tabFilteredTeams.length) return 'Sem base suficiente para comparação';
      const direction = this.dailyTargetDelta >= 0 ? '+' : '−';
      return `${direction}${this.formatCurrency(Math.abs(this.dailyTargetDelta))} vs ${this.targetScopeLabel.toLowerCase()}`;
    },
    executiveDeltaLabel() {
      if (this.usesCountMetric) return this.formatCurrency(this.executiveRealizedTotal);
      const prefix = this.dailyTargetDelta >= 0 ? '+' : '−';
      return `${prefix}${this.formatCurrency(Math.abs(this.dailyTargetDelta))}`;
    },
    executiveStatusLabel() {
      if (this.usesCountMetric) return 'Leitura por quantidade de programações';
      if (!this.tabFilteredTeams.length) return 'Sem leitura';
      if (this.dailyTargetTone === 'good') return 'Resultado acima da meta';
      if (this.dailyTargetTone === 'critical') return 'Resultado abaixo da meta';
      return 'Resultado em linha';
    },
    heroSnapshotItems() {
      return [
        {
          icon: 'solar:calendar-search-linear',
          label: 'Recorte',
          value: this.selectedDateContextLabel,
          detail: this.isAllDatesSelected ? `${this.availableDates.length} datas no intervalo` : (this.selectedDateSummary ? this.formatCurrency(this.selectedDateSummary.total) : '—'),
        },
        {
          icon: 'solar:users-group-rounded-linear',
          label: 'Equipes exibidas',
          value: String(this.tabFilteredTeams.length),
          detail: `${this.zeroPerformanceTeamsCount} sem lançamento`,
        },
        {
          icon: 'solar:crown-star-linear',
          label: 'Líder atual',
          value: this.leadingTeam ? this.leadingTeam.display : 'Sem produção',
          detail: this.leadingTeam ? this.formatCurrency(this.teamSortValue(this.leadingTeam)) : '—',
        },
      ];
    },
    controlSummaryItems() {
      return [
        {
          label: 'Realizado',
          value: this.formatCurrency(this.executiveRealizedTotal),
          icon: 'solar:wallet-money-linear',
        },
        {
          label: 'Meta',
          value: this.formatCurrency(this.dailyReferenceTarget),
          icon: 'solar:target-linear',
        },
        {
          label: 'Desvio',
          value: this.executiveDeltaLabel,
          icon: 'solar:chart-square-linear',
        },
      ];
    },
    executiveRankingTeams() {
      return this.cardsTeams.slice(0, 5);
    },
    trendInsightItems() {
      const isComposition = this.chartType === 'composition' || this.chartType === 'donut';
      const isTeamComparison = this.chartTracksTeams;
      const isPeriodFocus = this.rankingMode === 'period' || this.isAllDatesSelected;

      if (isComposition) {
        return [
          {
            label: 'Equipe líder',
            value: this.compositionChart.leaderLabel,
            detail: this.compositionChart.leaderValue,
            icon: 'solar:crown-star-bold-duotone',
          },
          {
            label: 'Recorte total',
            value: this.compositionChart.total,
            detail: `${this.compositionChart.rows.length} equipes comparadas`,
            icon: 'solar:document-text-bold-duotone',
          },
          {
            label: 'Modo de leitura',
            value: this.cardsPrimaryMetricLabel,
            detail: `${this.compositionChart.rows.length} equipes líderes`,
            icon: 'solar:eye-bold-duotone',
          },
        ];
      }

      if (isPeriodFocus && !isTeamComparison) {
        return [
          {
            label: 'Período em foco',
            value: this.formatCurrency(this.periodTotal),
            detail: `${this.availableDates.length} datas no período`,
            icon: 'solar:calendar-date-bold-duotone',
          },
          {
            label: 'Melhor dia',
            value: this.trendChart.bestLabel,
            detail: this.trendChart.bestValue,
            icon: 'solar:medal-ribbon-star-bold-duotone',
          },
          {
            label: 'Média diária',
            value: this.trendChart.averageValue,
            detail: `${this.trendChart.points.length} datas no período`,
            icon: 'solar:pulse-2-bold-duotone',
          },
        ];
      }

      return [
        {
          label: isTeamComparison ? 'Equipe em foco' : 'Data em foco',
          value: this.chartType === 'bar' ? this.barChart.selectedLabel : this.trendChart.selectedLabel,
          detail: this.chartType === 'bar' ? this.barChart.selectedValue : this.trendChart.selectedValue,
          icon: isTeamComparison ? 'solar:users-group-rounded-bold-duotone' : 'solar:calendar-date-bold-duotone',
        },
        {
          label: isTeamComparison ? 'Equipe líder' : 'Melhor dia',
          value: this.chartType === 'bar' ? this.barChart.maxLabel : this.trendChart.bestLabel,
          detail: this.chartType === 'bar' ? this.barChart.maxValue : this.trendChart.bestValue,
          icon: isTeamComparison ? 'solar:medal-ribbon-star-bold-duotone' : 'solar:medal-ribbon-star-bold-duotone',
        },
        {
          label: isTeamComparison ? 'Média por equipe' : 'Média diária',
          value: this.trendChart.averageValue,
          detail: `${this.trendChart.points.length} ${isTeamComparison ? 'equipes comparadas' : 'datas no período'}`,
          icon: 'solar:pulse-2-bold-duotone',
        },
      ];
    },
    detailToggleLabel() {
      return this.showAdvanced ? 'Ocultar detalhes' : 'Mostrar detalhes';
    },
    topTeamsSharePercent() {
      const totals = this.baseTabTeams
        .map((team) => this.teamSortValue(team))
        .filter((value) => value > 0)
        .sort((left, right) => right - left);
      const total = totals.reduce((sum, value) => sum + value, 0);
      if (!total) return 0;
      return (totals.slice(0, 3).reduce((sum, value) => sum + value, 0) / total) * 100;
    },
    operationalAlerts() {
      const alerts = [];

      if (this.availableDates.length) {
        if (this.dailyTargetDeltaPercent <= -15) {
          alerts.push({
            id: 'target-drop',
            tone: 'critical',
            icon: 'solar:danger-triangle-bold-duotone',
            title: 'Ritmo abaixo da meta',
            text: `${this.selectedDateContextLabel} está ${Math.abs(this.dailyTargetDeltaPercent).toFixed(1).replace('.', ',')}% abaixo da meta acumulada prevista em dias úteis.`,
          });
        } else if (this.dailyTargetDeltaPercent >= 15) {
          alerts.push({
            id: 'target-rise',
            tone: 'positive',
            icon: 'solar:verified-check-bold-duotone',
            title: 'Ritmo acima da meta',
            text: `${this.selectedDateContextLabel} abriu ${this.dailyTargetDeltaPercent.toFixed(1).replace('.', ',')}% acima da meta acumulada prevista em dias úteis.`,
          });
        }
      }

      if (this.topTeamsSharePercent >= 70) {
        alerts.push({
          id: 'concentration',
          tone: 'warning',
          icon: 'solar:siren-bold-duotone',
          title: 'Concentração elevada',
          text: `As 3 maiores equipes concentram ${this.topTeamsSharePercent.toFixed(1).replace('.', ',')}% do valor da visão atual.`,
        });
      }

      if (this.zeroPerformanceTeamsCount > 0) {
        alerts.push({
          id: 'idle-teams',
          tone: this.zeroPerformanceTeamsCount >= Math.max(2, Math.ceil(this.baseTabTeams.length * 0.3)) ? 'warning' : 'info',
          icon: this.zeroPerformanceTeamsCount >= Math.max(2, Math.ceil(this.baseTabTeams.length * 0.3)) ? 'solar:alarm-bold-duotone' : 'solar:info-circle-bold-duotone',
          title: 'Equipes sem lançamento',
          text: `${this.zeroPerformanceTeamsCount} equipes estão sem produção ${this.rankingMode === 'period' ? 'no período carregado' : 'na data em foco'}.`,
        });
      }

      if ((this.importSummary.skippedRows || 0) > 0) {
        alerts.push({
          id: 'import-quality',
          tone: 'warning',
          icon: 'solar:file-warning-bold-duotone',
          title: 'Linhas ignoradas na importação',
          text: `${this.importSummary.skippedRows} linhas ficaram fora da leitura e merecem conferência.`,
        });
      }

      return alerts.slice(0, 4);
    },
    narrativeSummary() {
      if (!this.baseTabTeams.length) return 'Sem dados suficientes para gerar um resumo narrativo.';

      const modeLabel = this.rankingMode === 'period'
        ? 'no período carregado'
        : `na data ${this.selectedDate?.label || 'em foco'}`;
      const peakLabel = this.topDailySummary
        ? `${this.topDailySummary.label} com ${this.formatCurrency(this.topDailySummary.total)}`
        : 'sem pico identificado';
      const filterLabel = this.performanceFilter === 'all'
        ? ''
        : ` Filtro ativo: ${this.performanceFilterLabel.toLowerCase()}.`;
      const leaderLine = this.leadingTeam
        ? `${this.leadingTeam.display} lidera a leitura com ${this.formatCurrency(this.teamSortValue(this.leadingTeam))}.`
        : 'Nenhuma equipe lidera a leitura atual.';

      return `${this.activeSheetLabel} ${modeLabel}: pico em ${peakLabel}, ${this.baseProductiveTeamsCount} equipes com produção e ${this.zeroPerformanceTeamsCount} sem lançamento. ${leaderLine}${filterLabel}`;
    },
    ALL_BASE_KEY() {
      return ALL_BASE_KEY;
    },
    contentTransitionKey() {
      return `${this.activeTab}:${this.loadedTab}:${this.importSummary.layout || 'default'}`;
    },
    chartTracksTeams() {
      return this.rankingMode === 'date' && !this.isAllDatesSelected;
    },
    activeTrendSelectedKey() {
      return this.chartTracksTeams ? this.selectedTeamCode : this.selectedDateKey;
    },
    activeTrendItems() {
      if (!this.chartTracksTeams) return this.dateSummaries;

      return this.cardsTeams
        .map((team) => {
          const total = this.valueFor(team, this.selectedDateKey);
          return {
            key: team.code,
            label: team.display,
            total,
            activeTeams: total > 0 ? 1 : 0,
            plate: team.plate || 'Sem placa',
            team,
          };
        })
        .filter((item) => item.total > 0);
    },
    activeTrendTotal() {
      return this.activeTrendItems.reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    },
    trendChart() {
      return buildTrendGeometry(this.activeTrendItems, this.activeTrendSelectedKey, this.formatCurrency);
    },
    barChart() {
      return buildBarGeometry(this.activeTrendItems, this.activeTrendSelectedKey, this.formatCurrency);
    },
    compositionChart() {
      return buildCompositionData(this.tabFilteredTeams, (team) => this.teamSortValue(team), this.formatCurrency);
    },
    allBasesDonutComposition() {
      if (!this.isAllBasesSelected) return null;

      const baseMap = new Map();
      this.tabFilteredTeams.forEach((team) => {
        const code = String(team.code || '').toUpperCase();
        const parts = code.split('-');
        const baseKey = parts[1] || 'OUTRO';
        const current = baseMap.get(baseKey) || {
          code: baseKey,
          display: baseKey,
          plate: baseKey,
          value: 0,
        };
        current.value += Number(this.teamSortValue(team)) || 0;
        baseMap.set(baseKey, current);
      });

      const rows = Array.from(baseMap.values())
        .filter((base) => base.value > 0)
        .sort((left, right) => right.value - left.value);

      return buildCompositionData(rows, (row) => row.value, this.formatCurrency);
    },
    donutChart() {
      const composition = this.isAllBasesSelected ? this.allBasesDonutComposition : this.compositionChart;
      return buildDonutChart(composition);
    },
    donutCenterValue() {
      if (this.chartHover?.context === 'donut') return this.chartHover.value;
      return this.compositionChart.total;
    },
    donutCenterLabel() {
      if (this.chartHover?.context === 'donut') return this.chartHover.label;
      return this.isAllBasesSelected ? 'Valor geral' : 'Valor do período';
    },
    donutCenterDetail() {
      if (this.chartHover?.context === 'donut') return this.chartHover.detail;
      if (this.compositionChart.coveredPercent) {
        const topCount = Math.min(6, this.compositionChart.rows.length);
        return `Top ${topCount} representam ${this.compositionChart.coveredPercent.toFixed(1).replace('.', ',')}%`;
      }
      return this.cardsPrimaryMetricLabel;
    },
    isApexChartType() {
      return this.chartType === 'line' || this.chartType === 'area' || this.chartType === 'bar' || this.chartType === 'gauge' || this.chartType === 'heatmap';
    },
    apexChartVisualType() {
      if (this.chartType === 'gauge') return 'radialBar';
      if (this.chartType === 'heatmap') return 'heatmap';
      return this.chartType === 'bar' ? 'bar' : this.chartType;
    },
    apexTrendSeries() {
      if (this.chartType === 'gauge') {
        return [this.gaugeValuePercent];
      }
      if (this.chartType === 'heatmap') {
        const dates = this.availableDates;
        return this.tabFilteredTeams.slice(0, 20).map((team) => ({
          name: team.display || team.code,
          data: dates.map((d) => ({
            x: d.label,
            y: Math.round(Number(team.valuesByDate?.[d.key]) || 0),
          })),
        }));
      }
      return [
        {
          name: this.chartTracksTeams ? 'Equipes' : this.rankingMode === 'period' ? 'Período' : 'Data',
          data: this.apexTrendData,
        },
      ];
    },
    apexTrendData() {
      return this.activeTrendItems.map((item) => {
        const value = Number(item.total);
        return Number.isFinite(value) ? value : 0;
      });
    },
    gaugeTarget() {
      return this.dailyReferenceTarget;
    },
    gaugeValuePercent() {
      if (!Number.isFinite(this.gaugeTarget) || this.gaugeTarget <= 0) return 0;
      return Math.min(100, Math.max(0, (this.executiveRealizedTotal / this.gaugeTarget) * 100));
    },
    gaugeValueLabel() {
      return this.formatCurrency(this.executiveRealizedTotal);
    },
    gaugeTitle() {
      return this.gaugeTarget > 0 ? `Meta ${this.formatCurrency(this.gaugeTarget)}` : 'Meta indisponível';
    },
    gaugeCanRender() {
      return Number.isFinite(this.gaugeValuePercent);
    },

    // ── Custom SVG Gauge computed helpers ────────────────────────────────────
    gaugeRemaining() {
      return Math.max(0, this.gaugeTarget - this.executiveRealizedTotal);
    },
    gaugeFillColor() {
      const p = this.gaugeValuePercent;
      if (p >= 100) return '#34d399';
      if (p >= 80) return '#a3e635';
      if (p >= 50) return '#fbbf24';
      return '#f87171';
    },
    gaugeNeedleRotation() {
      const p = Math.min(Math.max(this.gaugeValuePercent, 0), 100);
      return (p / 100) * 180 - 90;
    },
    gaugeFillPath() {
      const p = Math.min(Math.max(this.gaugeValuePercent, 0.01), 99.9);
      const cx = 200; const cy = 185; const r = 138;
      const rad = ((180 - p * 1.8) * Math.PI) / 180;
      const ex = cx + r * Math.cos(rad);
      const ey = cy - r * Math.sin(rad);
      return `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${ex.toFixed(2)} ${ey.toFixed(2)}`;
    },
    gaugeTicks() {
      const cx = 200; const cy = 185; const ri = 110; const ro = 155;
      return [0, 25, 50, 75, 100].map((pct) => {
        const rad = ((180 - pct * 1.8) * Math.PI) / 180;
        const c = Math.cos(rad); const s = Math.sin(rad);
        return {
          pct,
          x1: cx + ri * c, y1: cy - ri * s,
          x2: cx + ro * c, y2: cy - ro * s,
        };
      });
    },
    gaugeZoneInfo() {
      const p = this.gaugeValuePercent;
      if (p >= 100) return { label: 'Meta atingida!', icon: 'solar:medal-star-bold-duotone', cls: 'success' };
      if (p >= 80) return { label: 'Próximo da meta', icon: 'solar:graph-up-bold-duotone', cls: 'good' };
      if (p >= 50) return { label: 'Em andamento', icon: 'solar:clock-circle-bold-duotone', cls: 'warning' };
      return { label: 'Abaixo da meta', icon: 'solar:danger-triangle-bold-duotone', cls: 'danger' };
    },

    gaugeSummaryItems() {
      if (this.chartType !== 'gauge') return [];

      const isAhead = this.executiveRealizedTotal >= this.gaugeTarget;
      const remaining = this.gaugeRemaining;
      return [
        {
          label: 'META',
          value: this.formatCurrency(this.gaugeTarget),
          detail: this.targetScopeLabel,
          icon: 'solar:target-bold-duotone',
          mod: '',
        },
        {
          label: 'REALIZADO',
          value: this.gaugeValueLabel,
          detail: `${Math.round(this.gaugeValuePercent)}% do objetivo`,
          icon: 'solar:graph-up-bold-duotone',
          mod: 'positive',
        },
        {
          label: 'DESVIO',
          value: this.executiveDeltaLabel,
          detail: this.executiveStatusLabel,
          icon: isAhead ? 'solar:check-circle-bold-duotone' : 'solar:arrow-down-bold-duotone',
          mod: isAhead ? 'positive' : 'negative',
        },
        {
          label: 'FALTAM',
          value: remaining > 0 ? this.formatCurrency(remaining) : 'Atingida',
          detail: remaining > 0 ? 'para atingir a meta' : 'Objetivo cumprido',
          icon: remaining > 0 ? 'solar:flag-bold-duotone' : 'solar:medal-star-bold-duotone',
          mod: remaining > 0 ? '' : 'positive',
        },
      ];
    },
    apexCanRender() {
      if (this.chartType === 'gauge') return this.gaugeCanRender;
      if (this.chartType === 'heatmap') return this.tabFilteredTeams.length > 0 && this.availableDates.length > 0;
      return this.activeTrendItems.length > 0
        && this.apexTrendData.length === this.activeTrendItems.length
        && this.apexTrendData.every((value) => Number.isFinite(value));
    },
    heatmapOptions() {
      const vm = this;
      return {
        chart: {
          type: 'heatmap',
          toolbar: { show: false },
          animations: { enabled: true, easing: 'easeinout', speed: 600 },
          foreColor: '#cbd5e1',
        },
        dataLabels: { enabled: false },
        colors: ['#f59e0b'],
        plotOptions: {
          heatmap: {
            shadeIntensity: 0.6,
            radius: 4,
            useFillColorAsStroke: false,
            colorScale: {
              ranges: [
                { from: 0, to: 0, color: '#1e293b', name: 'Sem produção' },
                { from: 1, to: 15000, color: '#78350f', name: 'Baixo' },
                { from: 15001, to: 40000, color: '#b45309', name: 'Médio' },
                { from: 40001, to: 999999999, color: '#f59e0b', name: 'Alto' },
              ],
            },
          },
        },
        xaxis: {
          labels: {
            rotate: -45,
            style: { colors: '#94a3b8', fontSize: '10px' },
          },
        },
        yaxis: {
          labels: {
            style: { colors: '#cbd5e1', fontSize: '11px' },
          },
        },
        tooltip: {
          theme: 'dark',
          y: {
            formatter(value) {
              return vm.formatCurrency(value);
            },
          },
        },
        legend: {
          show: true,
          position: 'top',
          horizontalAlign: 'right',
          labels: { colors: '#cbd5e1' },
        },
        grid: { borderColor: 'rgba(148,163,184,0.08)' },
      };
    },
    targetChartCanRender() {
      return this.dateSummaries.length > 0 && !this.usesCountMetric;
    },
    targetChartDailyTarget() {
      return this.tabFilteredTeams.reduce((sum, team) => sum + this.teamDailyTarget(team), 0);
    },
    targetChartSeries() {
      const dates = this.dateSummaries;
      const dailyTarget = this.targetChartDailyTarget;
      return [
        {
          name: 'Realizado',
          type: 'column',
          data: dates.map((d) => Math.round(d.total)),
        },
        {
          name: 'Meta diária',
          type: 'line',
          data: dates.map(() => Math.round(dailyTarget)),
        },
      ];
    },
    targetChartOptions() {
      const vm = this;
      const categories = this.dateSummaries.map((d) => d.label);
      return {
        chart: {
          type: 'line',
          toolbar: { show: false },
          animations: { enabled: true, easing: 'easeinout', speed: 600 },
          foreColor: '#cbd5e1',
        },
        colors: ['#38bdf8', '#f59e0b'],
        stroke: {
          width: [0, 3],
          curve: 'smooth',
          dashArray: [0, 6],
        },
        fill: {
          opacity: [0.88, 1],
        },
        plotOptions: {
          bar: {
            columnWidth: '55%',
            borderRadius: 6,
          },
        },
        xaxis: {
          categories,
          labels: {
            rotate: -45,
            style: { colors: '#94a3b8', fontSize: '10px' },
          },
        },
        yaxis: {
          labels: {
            style: { colors: '#94a3b8', fontSize: '11px' },
            formatter(value) {
              return vm.formatAxisTick(value);
            },
          },
        },
        tooltip: {
          theme: 'dark',
          shared: true,
          intersect: false,
          y: {
            formatter(value) {
              return vm.formatCurrency(value);
            },
          },
        },
        legend: {
          show: true,
          position: 'top',
          horizontalAlign: 'right',
          labels: { colors: '#cbd5e1' },
        },
        grid: {
          borderColor: 'rgba(148,163,184,0.12)',
          strokeDashArray: 4,
        },
        dataLabels: { enabled: false },
        markers: {
          size: [0, 4],
          colors: ['#f59e0b'],
          strokeColors: '#0f172a',
          strokeWidth: 2,
        },
      };
    },
    performanceBandStats() {
      const bands = { zero: { count: 0, value: 0 }, low: { count: 0, value: 0 }, mid: { count: 0, value: 0 }, high: { count: 0, value: 0 } };
      this.tabFilteredTeams.forEach((team) => {
        const band = this.teamPerformanceBand(team);
        const value = this.teamSortValue(team);
        bands[band].count += 1;
        bands[band].value += value;
      });
      return bands;
    },
    apexYAxisMax() {
      const maxValue = Math.max(...this.apexTrendData, 0);
      if (maxValue <= 0) return 1;
      return Number((maxValue * 1.1).toFixed(2));
    },
    apexTrendOptions() {
      const vm = this;
      if (this.chartType === 'gauge') {
        return {
          chart: {
            id: 'producao-gauge-chart',
            background: 'transparent',
            toolbar: { show: false },
            sparkline: { enabled: true },
          },
          plotOptions: {
            radialBar: {
              startAngle: -90,
              endAngle: 90,
              hollow: {
                size: '60%',
              },
              track: {
                background: 'rgba(255,255,255,0.08)',
                strokeWidth: '100%',
              },
              dataLabels: {
                name: {
                  show: false,
                },
                value: {
                  show: true,
                  color: '#ffffff',
                  fontSize: '2.4rem',
                  fontWeight: 700,
                  offsetY: -10,
                  formatter(value) {
                    return `${Math.round(value)}%`;
                  },
                },
                total: {
                  show: true,
                  label: 'Realizado',
                  color: 'rgba(255,255,255,0.72)',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  formatter() {
                    return vm.gaugeValueLabel;
                  },
                },
              },
            },
          },
          fill: {
            type: 'gradient',
            gradient: {
              shade: 'dark',
              shadeIntensity: 0.6,
              gradientToColors: ['#fbbf24'],
              inverseColors: false,
              opacityFrom: 0.95,
              opacityTo: 0.9,
              stops: [0, 100],
            },
          },
          stroke: {
            lineCap: 'round',
          },
          labels: [this.gaugeTitle],
          tooltip: {
            enabled: false,
          },
        };
      }

      const categories = this.activeTrendItems.map((item) => item.label);
      const selectedIndex = this.activeTrendItems.findIndex((item) => item.key === this.activeTrendSelectedKey);

      return {
        chart: {
          id: 'producao-trend-chart',
          background: 'transparent',
          toolbar: { show: false },
          zoom: { enabled: false },
          foreColor: 'rgba(255,255,255,0.72)',
          animations: {
            enabled: false,
          },
          events: {
            dataPointSelection(event, chartContext, config) {
              const row = vm.activeTrendItems[config.dataPointIndex];
              if (!row) return;
              if (vm.chartTracksTeams && row.team) {
                vm.openTeamDrawer(row.team);
                return;
              }
              vm.selectSummaryDate(row.key);
            },
            click(event, chartContext, config) {
              if (vm.chartType !== 'bar' || event?.detail !== 2) return;
              vm.selectedDateKey = ALL_DATES_KEY;
              vm.rankingMode = 'period';
              vm.handleDateChange();
            },
            dataPointMouseEnter(event, chartContext, config) {
              const row = vm.activeTrendItems[config.dataPointIndex];
              if (row) {
                vm.setChartHover({
                  context: vm.chartType,
                  label: row.label,
                  value: vm.formatCurrency(row.total),
                  detail: vm.chartTracksTeams
                    ? `${row.plate} · ${vm.performanceLabelForBand(vm.teamPerformanceBand(row.team))}`
                    : `${row.activeTeams} equipes com lançamento`,
                });
              }
            },
            mouseLeave() {
              vm.clearChartHover();
            },
          },
        },
        colors: ['#fbbf24'],
        fill: this.chartType === 'area'
          ? {
              type: 'gradient',
              gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.4,
                opacityTo: 0.04,
                stops: [0, 95, 100],
              },
            }
          : { opacity: 1 },
        stroke: {
          curve: 'smooth',
          width: this.chartType === 'bar' ? 0 : 4,
        },
        plotOptions: {
          bar: {
            borderRadius: 6,
            columnWidth: '48%',
          },
        },
        grid: {
          borderColor: 'rgba(255,255,255,0.08)',
          strokeDashArray: 4,
          padding: {
            left: 8,
            right: 8,
            top: 6,
            bottom: 0,
          },
        },
        markers: {
          size: this.chartType === 'bar' ? 0 : this.chartType === 'line' ? 0 : 4,
          hover: { size: 6 },
          strokeWidth: 0,
          discrete: selectedIndex >= 0 && this.chartType !== 'bar' && this.chartType !== 'line'
            ? [{
                seriesIndex: 0,
                dataPointIndex: selectedIndex,
                fillColor: '#f97316',
                strokeColor: '#ffffff',
                size: 6,
              }]
            : [],
        },
        dataLabels: { enabled: false },
        xaxis: {
          categories,
          axisBorder: { show: false },
          axisTicks: { show: false },
          labels: {
            style: {
              colors: 'rgba(255,255,255,0.56)',
              fontSize: '11px',
            },
          },
          tooltip: { enabled: false },
        },
        yaxis: {
          min: 0,
          max: this.apexYAxisMax,
          tickAmount: 4,
          forceNiceScale: false,
          decimalsInFloat: 0,
          labels: {
            style: {
              colors: 'rgba(255,255,255,0.52)',
              fontSize: '11px',
            },
            formatter(value) {
              return vm.formatAxisTick(value);
            },
          },
        },
        tooltip: {
          theme: 'dark',
          x: { show: true },
          y: {
            formatter(value) {
              return vm.formatCurrency(value);
            },
          },
        },
        legend: { show: false },
        states: {
          hover: {
            filter: { type: 'lighten', value: 0.08 },
          },
          active: {
            filter: { type: 'darken', value: 0.12 },
          },
        },
      };
    },
    hasActiveChart() {
      if (this.chartType === 'composition') return this.compositionChart.hasData;
      if (this.chartType === 'donut') return this.donutChart.hasData;
      if (this.chartType === 'target') return this.targetChartCanRender;
      if (this.isApexChartType) return this.apexCanRender;
      if (this.chartType === 'bar') return this.barChart.hasData;
      return this.trendChart.hasData;
    },
    showTrendFooter() {
      return this.isApexChartType && this.hasActiveChart;
    },
    trendFooterStartLabel() {
      if (this.chartTracksTeams) {
        return this.trendChart.firstLabel !== '—' ? `Maior leitura: ${this.trendChart.firstLabel}` : 'Maior leitura: —';
      }
      return this.trendChart.firstLabel;
    },
    trendFooterEndLabel() {
      if (this.chartTracksTeams) {
        return this.trendChart.lastLabel !== '—' ? `Última do recorte: ${this.trendChart.lastLabel}` : 'Última do recorte: —';
      }
      return this.trendChart.lastLabel;
    },
    chartPanelTitle() {
      if (this.chartTracksTeams && this.chartType === 'line') return 'Curva das equipes na data';
      if (this.chartTracksTeams && this.chartType === 'area') return 'Área comparativa das equipes';
      if (this.chartTracksTeams && this.chartType === 'bar') return 'Comparativo das equipes na data';
      if (this.chartType === 'line') return 'Curva de evolução diária';
      if (this.chartType === 'area') return 'Área acumulada por data';
      if (this.chartType === 'bar') return 'Comparativo diário em barras';
      if (this.chartType === 'donut') return 'Rosca de participação das equipes';
      if (this.chartType === 'gauge') return 'Velocímetro de desempenho';
      if (this.chartType === 'heatmap') return 'Mapa de calor da produção';
      if (this.chartType === 'target') return 'Meta × Realizado por dia';
      return 'Composição das equipes líderes';
    },
    chartPanelDescription() {
      const baseScope = this.selectedBase === ALL_BASE_KEY ? 'Visão consolidada de todas as bases.' : `Base ${this.selectedBase} no intervalo ${this.importDateRangeLabel}.`;
      if (this.chartTracksTeams && this.chartType === 'line') return `Leitura contínua das equipes com maior impacto na data selecionada. ${baseScope}`;
      if (this.chartTracksTeams && this.chartType === 'area') return `Volume relativo das equipes líderes na data em foco. ${baseScope}`;
      if (this.chartTracksTeams && this.chartType === 'bar') return `Comparação direta entre as equipes na data selecionada. ${baseScope}`;
      if (this.chartType === 'line') return `Leitura contínua da variação de produção ao longo do período. ${baseScope}`;
      if (this.chartType === 'area') return `Ênfase visual no volume acumulado de cada dia. ${baseScope}`;
      if (this.chartType === 'bar') return `Comparação direta entre os totais de cada data. ${baseScope}`;
      if (this.chartType === 'donut') return `Participação relativa das equipes líderes na visão atual. ${baseScope}`;
      if (this.chartType === 'gauge') return `Velocímetro que compara o realizado vs a meta ativa. ${baseScope}`;
      if (this.chartType === 'heatmap') return `Intensidade de produção por equipe e data — identifica padrões e ausências. ${baseScope}`;
      if (this.chartType === 'target') return `Barras do realizado diário vs linha da meta por equipe — identifica gaps operacionais. ${baseScope}`;
      return `Distribuição das equipes com maior impacto na visão ativa. ${baseScope}`;
    },
    chartPanelContext() {
      if (this.selectedBase === ALL_BASE_KEY) {
        return `Visão consolidada de todas as bases · ${this.rankingMode === 'period' ? 'Período completo' : `Data ${this.selectedDate?.label || 'selecionada'}`}`;
      }
      return `${this.activeBaseLabel} · ${this.rankingMode === 'period' ? 'Período completo' : `Data ${this.selectedDate?.label || 'selecionada'}`}`;
    },
    trendSummaryNote() {
      if (this.chartType === 'composition' || this.chartType === 'donut') {
        return this.compositionChart.coveredPercent
          ? `${this.compositionChart.coveredPercent.toFixed(1).replace('.', ',')}% dos principais lançamentos` : 'Participação por equipe no recorte atual';
      }
      if (this.chartTracksTeams) {
        return this.selectedDate ? `Equipes na data ${this.selectedDate.label}` : 'Equipe em foco';
      }
      if (this.rankingMode === 'period') {
        return `${this.availableDates.length} datas no período`; 
      }
      return `Total da data ${this.selectedDate?.label || 'selecionada'}`;
    },
    trendSummaryLabel() {
      if (this.chartType === 'composition' || this.chartType === 'donut') {
        return this.rankingMode === 'period' ? `Participação das equipes em ${this.metricLabel}` : `Participação das equipes na data por ${this.metricLabel}`;
      }
      if (this.chartTracksTeams) return `Total representado em ${this.selectedDate?.label || 'data selecionada'}`;
      return this.rankingMode === 'period' ? `Total consolidado de ${this.metricLabel}` : `Total da data em foco por ${this.metricLabel}`;
    },
    trendSummaryValue() {
      if (this.chartType === 'composition' || this.chartType === 'donut') return this.compositionChart.total;
      if (this.chartType === 'gauge') return this.formatCurrency(this.executiveRealizedTotal);
      if (this.chartTracksTeams) return this.formatCurrency(this.activeTrendTotal);
      return this.formatCurrency(this.rankingMode === 'period' ? this.periodTotal : this.selectedDateTotal);
    },
    chartExportFilename() {
      return `grafico-${this.activeTab.toLowerCase()}-${this.chartType}-${this.rankingMode}`;
    },
    chartExportTitle() {
      return `Relatorio grafico de producao - ${this.activeSheetLabel}`;
    },
    chartExportSubtitle() {
      const modeLabel = this.rankingMode === 'period' ? 'Periodo completo' : `Data em foco: ${this.selectedDate?.label || 'sem data'}`;
      return `${modeLabel} | Janela: ${this.importDateRangeLabel}`;
    },
    tableExportFilename() {
      return `tabela-producao-${this.activeTab.toLowerCase()}-${this.rankingMode}`;
    },
    cardsTitle() {
      return this.rankingMode === 'period'
        ? `Visão rápida do período (${this.importDateRangeLabel})`
        : `Visão rápida (${this.selectedDate?.label || 'sem data'})`;
    },
    cardsDescription() {
      const baseDescription = this.rankingMode === 'period'
        ? 'cards ordenados pelo acumulado do período carregado'
        : 'cards ordenados pelo valor da data selecionada';
      return this.performanceFilter === 'all'
        ? baseDescription
        : `${baseDescription} · filtro ${this.performanceFilterLabel.toLowerCase()}`;
    },
    cardsTotalValue() {
      return this.rankingMode === 'period' ? this.periodTotal : this.selectedDateTotal;
    },
    cardsTotalSuffix() {
      return this.rankingMode === 'period' ? 'no período' : 'no dia';
    },
    cardsPrimaryMetricLabel() {
      if (this.usesCountMetric) {
        if (this.rankingMode === 'date' && this.isAllDatesSelected) return 'Programações das datas';
        return this.rankingMode === 'period' ? 'Programações do período' : 'Programações da data';
      }
      if (this.rankingMode === 'date' && this.isAllDatesSelected) return 'Valor das datas';
      return this.rankingMode === 'period' ? 'Valor do período' : 'Valor da data';
    },
    cardsSecondaryMetricLabel() {
      if (this.rankingMode === 'date' && this.isAllDatesSelected) return 'Melhor dia';
      return this.rankingMode === 'period' ? 'Melhor dia' : 'Acumulado';
    },
    leadingTeam() {
      return this.tabFilteredTeams.reduce((leader, team) => {
        if (this.teamSortValue(team) <= 0) return leader;
        if (!leader) return team;
        const leaderValue = this.teamSortValue(leader);
        const currentValue = this.teamSortValue(team);
        if (currentValue !== leaderValue) return currentValue > leaderValue ? team : leader;
        return team.display.localeCompare(leader.display) < 0 ? team : leader;
      }, null);
    },
    emptyStateLabel() {
      if (this.usesCountMetric) {
        return this.rankingMode === 'period' ? 'Nenhuma programação encontrada no período carregado' : 'Nenhuma programação lançada na data selecionada';
      }
      return this.rankingMode === 'period' ? 'Nenhuma produção encontrada no período carregado' : 'Nenhum valor lançado na data selecionada';
    },
    importStatusText() {
      return (this.importSummary.skippedRows || 0) > 0 ? 'Atenção' : 'Conferido';
    },
    importStatusClass() {
      return (this.importSummary.skippedRows || 0) > 0 ? 'status-pill--warn' : 'status-pill--ok';
    },
    importStatusTitle() {
      if (this.importSummary.layout === 'combined-service') {
        return 'Consolidado de OBRAS, EME e CUSTEIO';
      }
      return (this.importSummary.layout || 'summary') === 'service'
        ? 'Arquivo consolidado por serviços e datas'
        : 'Arquivo consolidado por resumo diário';
    },
    importDateRangeLabel() {
      if (!this.importSummary.firstDateKey || !this.importSummary.lastDateKey) return 'intervalo não identificado';
      return `${this.formatDateKey(this.importSummary.firstDateKey)} até ${this.formatDateKey(this.importSummary.lastDateKey)}`;
    },
    selectedTeam() {
      if (!this.selectedTeamCode) return null;
      return this.tabFilteredTeams.find((team) => team.code === this.selectedTeamCode) || this.cardsTeams[0] || null;
    },
    selectedTeamSeries() {
      if (!this.selectedTeam) return [];
      return this.availableDates.map((date) => ({
        ...date,
        total: this.valueFor(this.selectedTeam, date.key),
      }));
    },
    selectedTeamTrend() {
      return buildTrendGeometry(this.selectedTeamSeries, this.selectedDateKey, this.formatCurrency);
    },
    selectedTeamBestDay() {
      return this.selectedTeamSeries.reduce((best, current) => {
        if (!best) return current;
        return current.total > best.total ? current : best;
      }, null);
    },
    selectedTeamWorstDay() {
      return this.selectedTeamSeries.reduce((worst, current) => {
        if (!worst) return current;
        return current.total < worst.total ? current : worst;
      }, null);
    },
    selectedTeamAverageActive() {
      if (!this.selectedTeam) return 0;
      const activeValues = this.selectedTeamSeries.filter((entry) => entry.total > 0);
      if (!activeValues.length) return 0;
      return activeValues.reduce((sum, entry) => sum + entry.total, 0) / activeValues.length;
    },
    selectedTeamShareOfView() {
      if (!this.selectedTeam || !this.cardsTotalValue) return 0;
      return (this.teamSortValue(this.selectedTeam) / this.cardsTotalValue) * 100;
    },
    selectedTeamReferenceTarget() {
      if (!this.selectedTeam) return 0;
      return this.teamDailyTarget(this.selectedTeam) * this.scopeWeekdaysCount;
    },
    selectedTeamNarrative() {
      if (!this.selectedTeam) return '';
      const bestDay = this.selectedTeamBestDay
        ? `${this.selectedTeamBestDay.label} com ${this.formatCurrency(this.selectedTeamBestDay.total)}`
        : 'sem melhor dia identificado';
      return `${this.selectedTeam.display} acumula ${this.formatCurrency(this.teamTotal(this.selectedTeam))}, tem meta prevista de ${this.formatCurrency(this.selectedTeamReferenceTarget)} no recorte atual, pico em ${bestDay} e participa com ${this.selectedTeamShareOfView.toFixed(1).replace('.', ',')}% da leitura atual.`;
    },
    leaderSpotlightStats() {
      if (!this.leadingTeam) return [];
      return [
        {
          label: this.cardsPrimaryMetricLabel,
          value: this.formatCurrency(this.teamSortValue(this.leadingTeam)),
          icon: 'solar:chart-2-bold-duotone',
        },
        {
          label: this.cardsSecondaryMetricLabel,
          value: this.formatCurrency(this.cardsSecondaryMetricValue(this.leadingTeam)),
          icon: 'solar:bill-list-bold-duotone',
        },
        {
          label: 'Participação',
          value: this.teamShareLabel(this.leadingTeam),
          icon: 'solar:pie-chart-2-bold-duotone',
        },
      ];
    },
    selectedTeamDrawerMetrics() {
      if (!this.selectedTeam) return [];
      return [
        {
          label: this.cardsPrimaryMetricLabel,
          value: this.formatCurrency(this.teamSortValue(this.selectedTeam)),
          detail: this.performanceLabelForBand(this.teamPerformanceBand(this.selectedTeam)),
          icon: 'solar:chart-2-bold-duotone',
        },
        {
          label: 'Acumulado',
          value: this.formatCurrency(this.teamTotal(this.selectedTeam)),
          detail: this.selectedTeam.plate || 'Sem placa',
          icon: 'solar:bill-list-bold-duotone',
        },
        {
          label: this.targetScopeLabel,
          value: this.formatCurrency(this.selectedTeamReferenceTarget),
          detail: `${this.scopeWeekdaysCount} dias úteis considerados`,
          icon: 'solar:target-bold-duotone',
        },
        {
          label: 'Melhor dia',
          value: this.selectedTeamBestDay ? this.selectedTeamBestDay.label : '—',
          detail: this.selectedTeamBestDay ? this.formatCurrency(this.selectedTeamBestDay.total) : 'Sem lançamento',
          icon: 'solar:medal-ribbon-star-bold-duotone',
        },
        {
          label: 'Média ativa',
          value: this.formatCurrency(this.selectedTeamAverageActive),
          detail: this.selectedTeam.sourceSheets?.join(' + ') || this.selectedTeam.type || 'Sem origem',
          icon: 'solar:pulse-2-bold-duotone',
        },
      ];
    },
    selectedTeamFooterMetrics() {
      if (!this.selectedTeam) return [];
      return [
        {
          label: 'Participação',
          value: `${this.selectedTeamShareOfView.toFixed(1).replace('.', ',')}%`,
          detail: 'Na leitura atual',
          icon: 'solar:pie-chart-2-bold-duotone',
        },
        {
          label: 'Pior dia',
          value: this.selectedTeamWorstDay ? this.selectedTeamWorstDay.label : '—',
          detail: this.selectedTeamWorstDay ? this.formatCurrency(this.selectedTeamWorstDay.total) : 'Sem dados',
          icon: 'solar:sort-from-top-to-bottom-bold-duotone',
        },
        {
          label: 'Últimos lançamentos',
          value: this.selectedTeamRecentRows[0] ? this.selectedTeamRecentRows[0].label : '—',
          detail: this.selectedTeamRecentRows[0] ? this.formatCurrency(this.selectedTeamRecentRows[0].total) : 'Sem dados',
          icon: 'solar:history-bold-duotone',
        },
      ];
    },
    selectedTeamRecentRows() {
      return this.selectedTeamSeries.slice(-6).reverse();
    },
  },
  watch: {
    activeTab(newTab, oldTab) {
      if (newTab === oldTab) return;
      this.applyCachedTabPayload(newTab);
    },
    chartType(newType) {
      this.persistChartType(newType);
    },
    tabFilteredTeams: {
      handler(newTeams) {
        if (!newTeams.length) {
          this.selectedTeamCode = '';
          return;
        }
        if (!newTeams.some((team) => team.code === this.selectedTeamCode)) {
          this.selectedTeamCode = newTeams[0].code;
        }
      },
      immediate: true,
    },
    rawTabTeams: {
      handler(newTeams) {
        const nextCodes = newTeams.map((team) => team.code);
        if (!nextCodes.length) {
          this.selectedTeamCodes = [];
          return;
        }
        if (!this.selectedTeamCodes.length) {
          this.selectedTeamCodes = nextCodes;
          return;
        }
        const selected = new Set(this.selectedTeamCodes);
        const intersected = nextCodes.filter((code) => selected.has(code));
        this.selectedTeamCodes = intersected.length ? intersected : nextCodes;
      },
      immediate: true,
    },
  },
  methods: {
    buildTabPayloadCache(results) {
      const perTab = {};
      const sheetGroups = results.reduce((groups, result) => {
        const key = result.sheetName || 'GERAL';
        if (!groups[key]) groups[key] = [];
        groups[key].push(result);
        return groups;
      }, {});

      const mergedResults = Object.entries(sheetGroups).map(([sheetName, group]) => {
        if (group.length === 1) {
          perTab[sheetName] = {
            normalized: group[0].normalized,
            origin: group[0].payload?.origin || group[0].origin || 'desconhecida',
            generatedAt: group[0].payload?.generatedAt || group[0].generatedAt,
          };
          return {
            sheetName,
            normalized: group[0].normalized,
          };
        }

        const normalized = this.mergeNormalizedSheets(group);
        perTab[sheetName] = {
          normalized,
          origin: 'mixed',
          generatedAt: group
            .map((result) => result.payload?.generatedAt || result.generatedAt)
            .filter(Boolean)
            .sort()
            .pop(),
        };
        return {
          sheetName,
          normalized,
        };
      });

      const merged = this.mergeNormalizedSheets(mergedResults);
      const origins = Array.from(new Set(results.map((result) => result.payload?.origin || result.origin || 'desconhecida')));
      perTab.GERAL = {
        normalized: merged,
        origin: origins.length === 1 ? origins[0] : 'mixed',
        generatedAt: results
          .map((result) => result.payload?.generatedAt || result.generatedAt)
          .filter(Boolean)
          .sort()
          .pop(),
      };

      return perTab;
    },
    applyCachedTabPayload(tabKey = this.activeTab) {
      const entry = this.tabPayloadCache[tabKey] || this.tabPayloadCache.GERAL;
      if (!entry) return;
      this.applyNormalizedPayload(tabKey, entry.normalized, entry.origin, entry.generatedAt);
    },
    clonePayload(payload) {
      try {
        return JSON.parse(JSON.stringify(payload));
      } catch (error) {
        return payload;
      }
    },
    isCacheFresh(cacheEntry) {
      if (!cacheEntry?.cachedAt) return false;
      return (Date.now() - cacheEntry.cachedAt) <= BASE_CACHE_TTL_MS;
    },
    saveBasePayloadCache(baseKey, payloadCache = this.tabPayloadCache) {
      if (!baseKey || !payloadCache || !Object.keys(payloadCache).length) return;
      this.basePayloadCache = {
        ...this.basePayloadCache,
        [baseKey]: {
          cachedAt: Date.now(),
          payload: this.clonePayload(payloadCache),
        },
      };
    },
    applyBasePayloadCache(baseKey = this.selectedBase) {
      const cacheEntry = this.basePayloadCache[baseKey];
      if (!cacheEntry?.payload) return false;
      this.tabPayloadCache = this.clonePayload(cacheEntry.payload);
      this.errorMessage = '';
      this.sampleRows = null;
      this.applyCachedTabPayload(this.activeTab);
      return true;
    },
    loadExecutiveMode() {
      try {
        return localStorage.getItem(EXECUTIVE_MODE_STORAGE_KEY) === '1';
      } catch (error) {
        return false;
      }
    },
    persistExecutiveMode(value) {
      try {
        localStorage.setItem(EXECUTIVE_MODE_STORAGE_KEY, value ? '1' : '0');
      } catch (error) {
        console.warn('Falha ao persistir visão executiva', error);
      }
    },
    toggleExecutiveMode() {
      this.executiveMode = !this.executiveMode;
      this.persistExecutiveMode(this.executiveMode);
    },
    loadSelectedBase() {
      try {
        const storedBase = String(localStorage.getItem(BASE_STORAGE_KEY) || DEFAULT_BASE_KEY).trim().toUpperCase();
        return PRODUCTION_BASES.some((base) => base.key === storedBase) ? storedBase : DEFAULT_BASE_KEY;
      } catch (err) {
        return DEFAULT_BASE_KEY;
      }
    },
    persistSelectedBase(baseKey) {
      try {
        localStorage.setItem(BASE_STORAGE_KEY, baseKey);
      } catch (err) {
        console.warn('Falha ao persistir base selecionada', err);
      }
    },
    getSelectedBaseKeys(baseKey = this.selectedBase) {
      if (baseKey === ALL_BASE_KEY) {
        return PRODUCTION_BASES.filter((base) => base.key !== ALL_BASE_KEY).map((base) => base.key);
      }
      return [baseKey];
    },
    getBaseSheetPlan(baseKey = this.selectedBase) {
      if (baseKey === ALL_BASE_KEY) {
        return Array.from(new Set(Object.values(PRODUCTION_SHEET_PLAN).flat()));
      }
      return PRODUCTION_SHEET_PLAN[baseKey] || PRODUCTION_SHEET_PLAN[DEFAULT_BASE_KEY];
    },
    async changeBase(baseKey) {
      if (!baseKey || baseKey === this.selectedBase || this.loading || this.syncing) return;
      this.selectedBase = baseKey;
      this.persistSelectedBase(baseKey);
      this.lastDateKey = this.loadLastDateKey(baseKey);
      this.activeTab = 'GERAL';

      const appliedFromCache = this.applyBasePayloadCache(baseKey);
      const cacheEntry = this.basePayloadCache[baseKey];
      const shouldBackgroundRefresh = !appliedFromCache || !this.isCacheFresh(cacheEntry);

      if (shouldBackgroundRefresh) {
        if (appliedFromCache) {
          this.loadFromDatabase({ forceRefresh: true, silent: true }).catch((error) => {
            console.warn('Falha ao atualizar base em segundo plano:', error);
          });
          return;
        }
        await this.loadFromDatabase({ forceRefresh: true });
      }
    },
    loadChartType() {
      try {
        const storedType = localStorage.getItem(CHART_TYPE_STORAGE_KEY) || 'line';
        return AVAILABLE_CHART_TYPES.includes(storedType) ? storedType : 'line';
      } catch (err) {
        return 'line';
      }
    },
    persistChartType(value) {
      try {
        if (AVAILABLE_CHART_TYPES.includes(value)) localStorage.setItem(CHART_TYPE_STORAGE_KEY, value);
      } catch (err) {
        console.warn('Falha ao persistir tipo de gráfico', err);
      }
    },
    emitToast(message, type = 'info') {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message, type } }));
    },
    setChartHover(payload) {
      this.chartHover = payload;
    },
    clearChartHover() {
      this.chartHover = null;
    },
    async getExportUtilsModule() {
      return import('../utils/producaoExporters.js');
    },
    pickThresholdValue(values, percentile) {
      if (!values.length) return 0;
      const index = Math.max(0, Math.min(values.length - 1, Math.floor((values.length - 1) * percentile)));
      return values[index];
    },
    performanceRangeLabel(band) {
      if (band === 'zero') return this.formatCurrency(0);
      if (band === 'low') return `acima de ${this.formatCurrency(0)} ate ${this.formatCurrency(this.performanceThresholds.lowMax)}`;
      if (band === 'mid') return `acima de ${this.formatCurrency(this.performanceThresholds.lowMax)} ate ${this.formatCurrency(this.performanceThresholds.midMax)}`;
      return `acima de ${this.formatCurrency(this.performanceThresholds.midMax)}`;
    },
    performanceLabelForBand(band) {
      return PERFORMANCE_FILTER_LABELS[band] || PERFORMANCE_FILTER_LABELS.all;
    },
    performanceIconForBand(band) {
      if (band === 'high') return 'solar:medal-star-bold-duotone';
      if (band === 'mid') return 'solar:fire-bold-duotone';
      if (band === 'low') return 'solar:bolt-bold-duotone';
      return 'solar:ghost-bold-duotone';
    },
    async captureChartDataUrl() {
      const target = this.$refs.chartExportSurface;
      if (!target) {
        throw new Error('Área do gráfico não encontrada para exportação.');
      }
      const { captureElementAsPng } = await this.getExportUtilsModule();
      return captureElementAsPng(target);
    },
    async exportChartAsImage() {
      if (this.exportState) return;
      this.exportState = 'image';
      try {
        const dataUrl = await this.captureChartDataUrl();
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${this.chartExportFilename}.png`;
        link.click();
        this.emitToast('Gráfico exportado em imagem.', 'success');
      } catch (error) {
        console.error(error);
        this.emitToast(`Erro ao exportar imagem: ${error.message}`, 'error');
      } finally {
        this.exportState = '';
      }
    },
    async exportChartAsPdf() {
      if (this.exportState) return;
      this.exportState = 'pdf';
      try {
        const dataUrl = await this.captureChartDataUrl();
        const { saveChartPdf } = await this.getExportUtilsModule();
        await saveChartPdf({
          dataUrl,
          filename: `${this.chartExportFilename}.pdf`,
          title: this.chartExportTitle,
          subtitle: this.chartExportSubtitle,
          infoLine: `Aba: ${this.activeSheetLabel} | Grafico: ${this.chartPanelTitle} | Exportado em: ${this.lastUpdatedLabel || 'agora'}`,
        });
        this.emitToast('Gráfico exportado em PDF.', 'success');
      } catch (error) {
        console.error(error);
        this.emitToast(`Erro ao exportar PDF: ${error.message}`, 'error');
      } finally {
        this.exportState = '';
      }
    },
    buildTableExportRows() {
      return this.tabFilteredTeams.map((team) => {
        const row = {
          Equipe: team.display,
          Placa: team.plate || '',
          Categoria: team.type || '',
          Faixa: PERFORMANCE_FILTER_LABELS[this.teamPerformanceBand(team)] || '—',
          [this.cardsPrimaryMetricLabel]: Number(this.teamSortValue(team).toFixed(2)),
          Acumulado: Number(this.teamTotal(team).toFixed(2)),
          Participacao: `${this.teamSharePercent(team).toFixed(1).replace('.', ',')}%`,
        };

        this.historyColumns.forEach((date) => {
          row[date.label] = Number(this.valueFor(team, date.key).toFixed(2));
        });

        return row;
      });
    },
    downloadBlob(blob, filename) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    },
    escapeCsvValue(value) {
      const text = value == null ? '' : String(value);
      if (/[;\n\"]/g.test(text)) {
        return `"${text.replace(/"/g, '""')}"`;
      }
      return text;
    },
    async exportTableAsCsv() {
      if (this.tableExportState) return;
      this.tableExportState = 'csv';
      try {
        const rows = this.buildTableExportRows();
        if (!rows.length) throw new Error('Não há linhas para exportar.');
        const headers = Object.keys(rows[0]);
        const csvLines = [
          headers.map((header) => this.escapeCsvValue(header)).join(';'),
          ...rows.map((row) => headers.map((header) => this.escapeCsvValue(row[header])).join(';')),
        ];
        const content = `\uFEFF${csvLines.join('\n')}`;
        this.downloadBlob(new Blob([content], { type: 'text/csv;charset=utf-8;' }), `${this.tableExportFilename}.csv`);
        this.emitToast('Tabela exportada em CSV.', 'success');
      } catch (error) {
        console.error(error);
        this.emitToast(`Erro ao exportar CSV: ${error.message}`, 'error');
      } finally {
        this.tableExportState = '';
      }
    },
    async exportTableAsExcel() {
      if (this.tableExportState) return;
      this.tableExportState = 'excel';
      try {
        const rows = this.buildTableExportRows();
        if (!rows.length) throw new Error('Não há linhas para exportar.');
        const { createExcelBuffer } = await this.getExportUtilsModule();
        const buffer = await createExcelBuffer(rows, 'Historico');
        this.downloadBlob(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `${this.tableExportFilename}.xlsx`);
        this.emitToast('Tabela exportada em Excel.', 'success');
      } catch (error) {
        console.error(error);
        this.emitToast(`Erro ao exportar Excel: ${error.message}`, 'error');
      } finally {
        this.tableExportState = '';
      }
    },
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
    loadLastDateKey(baseKey = this.selectedBase) {
      try {
        const raw = localStorage.getItem(LAST_DATE_STORAGE_KEY) || '';
        if (!raw) return '';
        if (raw.startsWith('{')) {
          const parsed = JSON.parse(raw);
          if (baseKey && typeof parsed?.[baseKey] === 'string') return parsed[baseKey];
          return typeof parsed?.default === 'string' ? parsed.default : '';
        }
        return raw;
      } catch (err) {
        return '';
      }
    },
    persistLastDateKey(key, baseKey = this.selectedBase) {
      try {
        if (key) {
          let nextState = { default: key };
          const raw = localStorage.getItem(LAST_DATE_STORAGE_KEY) || '';
          if (raw && raw.startsWith('{')) {
            nextState = { ...JSON.parse(raw), default: key };
          } else if (raw) {
            nextState.default = raw;
          }
          if (baseKey) nextState[baseKey] = key;
          localStorage.setItem(LAST_DATE_STORAGE_KEY, JSON.stringify(nextState));
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
      const numericValue = Number(value) || 0;
      if (this.usesCountMetric) {
        return numericValue.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
      }
      return currencyFormatter.format(numericValue);
    },
    formatShort(value) {
      const num = Number(value) || 0;
      if (!num) return '—';
      return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    formatAxisTick(value) {
      const num = Number(value) || 0;
      return num.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
    },
    formatDateKey(dateKey) {
      if (!dateKey) return '—';
      const date = new Date(`${dateKey}T00:00:00Z`);
      if (Number.isNaN(date.getTime())) return dateKey;
      return dateFormatter.format(date);
    },
    monthStartKey(dateKey) {
      if (!dateKey) return '';
      const [year, month] = String(dateKey).split('-');
      if (!year || !month) return '';
      return `${year}-${month}-01`;
    },
    monthEndKey(dateKey) {
      if (!dateKey) return '';
      const [year, month] = String(dateKey).split('-');
      if (!year || !month) return '';
      const endOfMonth = new Date(Date.UTC(Number(year), Number(month), 0));
      return Number.isNaN(endOfMonth.getTime()) ? '' : endOfMonth.toISOString().slice(0, 10);
    },
    isWeekday(dateKey) {
      if (!dateKey) return false;
      const date = new Date(`${dateKey}T00:00:00Z`);
      if (Number.isNaN(date.getTime())) return false;
      const weekDay = date.getUTCDay();
      return weekDay >= 1 && weekDay <= 5;
    },
    countWeekdaysInRange(startKey, endKey) {
      if (!startKey || !endKey || startKey > endKey) return 0;
      let cursor = new Date(`${startKey}T00:00:00Z`);
      const end = new Date(`${endKey}T00:00:00Z`);
      if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) return 0;

      let count = 0;
      while (cursor <= end) {
        const weekDay = cursor.getUTCDay();
        if (weekDay >= 1 && weekDay <= 5) count += 1;
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }

      return count;
    },
    sumTeamValueInRange(team, startKey, endKey) {
      if (!team || !startKey || !endKey || startKey > endKey) return 0;
      return this.availableDates.reduce((sum, date) => {
        if (date.key < startKey || date.key > endKey) return sum;
        return sum + this.valueFor(team, date.key);
      }, 0);
    },
    teamDailyTarget(team) {
      if (!team) return 0;
      if (this.usesCountMetric) return 0;
      const teamKey = String(team.code || team.display || '').trim().toUpperCase();
      return TEAM_DAILY_TARGET_OVERRIDES[teamKey] || DEFAULT_TEAM_DAILY_TARGET;
    },
    teamTotal(team) {
      return Object.values(team?.valuesByDate || {}).reduce((total, value) => total + (Number(value) || 0), 0);
    },
    bestDayValue(team) {
      return Object.values(team?.valuesByDate || {}).reduce((best, value) => Math.max(best, Number(value) || 0), 0);
    },
    teamSortValue(team) {
      if (this.rankingMode === 'period' || this.isAllDatesSelected) return this.teamTotal(team);
      return this.valueFor(team, this.selectedDateKey);
    },
    cardsSecondaryMetricValue(team) {
      return this.rankingMode === 'period' ? this.bestDayValue(team) : this.teamTotal(team);
    },
    teamSharePercent(team) {
      const currentValue = this.teamSortValue(team);
      const totalBase = this.cardsTotalValue;
      if (!currentValue || !totalBase) return 0;
      return Math.min(100, (currentValue / totalBase) * 100);
    },
    teamShareLabel(team) {
      const percent = this.teamSharePercent(team);
      if (percent <= 0) {
        return this.rankingMode === 'period' ? 'Sem produção no período' : 'Sem produção na data';
      }
      return `${percent.toFixed(1).replace('.', ',')}% ${this.rankingMode === 'period' ? 'do período' : 'do dia'}`;
    },
    teamPerformanceBand(team) {
      const value = this.teamSortValue(team);
      if (value <= 0) return 'zero';
      if (value <= this.performanceThresholds.lowMax) return 'low';
      if (value <= this.performanceThresholds.midMax) return 'mid';
      return 'high';
    },
    valueBadgeClass(value) {
      if (value <= 0) return 'badge-zero';
      if (value <= this.performanceThresholds.lowMax) return 'badge-low';
      if (value <= this.performanceThresholds.midMax) return 'badge-mid';
      return 'badge-high';
    },
    handleDateChange() {
      if (this.selectedDateKey === ALL_DATES_KEY) {
        this.persistLastDateKey(this.selectedDateKey, this.selectedBase);
        this.lastDateKey = this.selectedDateKey;
        return;
      }
      const column = this.availableDates.find((col) => col.key === this.selectedDateKey);
      if (!column && this.availableDates.length) {
        this.selectedDateKey = this.availableDates[this.availableDates.length - 1].key;
      }
      this.persistLastDateKey(this.selectedDateKey, this.selectedBase);
      this.lastDateKey = this.selectedDateKey;
    },
    toggleAdvancedDetails() {
      this.showAdvanced = !this.showAdvanced;
      if (this.showAdvanced) {
        this.openRobotChat();
        return;
      }
      this.showTeamFilter = false;
    },
    advanceRobotTip() {
      this.robotTipIndex = (this.robotTipIndex + 1) % Math.max(this.robotTips.length, 1);
    },
    createRobotContextMessages() {
      return [
        {
          id: 'robot-intro',
          role: 'robot',
          text: 'Sou um assistente inteligente de gráficos. Fui treinado para ajudar a ler tendências, picos, vales e alertas do painel de produção.',
        },
        {
          id: 'robot-training',
          role: 'robot',
          text: 'Uso os dados selecionados para gerar observações atuais e sugerir onde focar a atenção operacional.',
        },
        {
          id: 'robot-context',
          role: 'robot',
          text: `${this.currentRobotTip.title}: ${this.currentRobotTip.text}`,
        },
      ];
    },
    appendRobotMessage(text, role = 'robot') {
      this.robotChatMessages = [
        ...this.robotChatMessages,
        {
          id: `${role}-${Date.now()}-${this.robotChatMessages.length}`,
          role,
          text,
        },
      ].slice(-12);
      if (role === 'robot') {
        this.triggerRobotSpeech(String(text || '').length);
      }
      nextTick(() => {
        const container = this.$refs.robotChatMessagesContainer;
        if (container?.scrollTo) {
          container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
        }
      });
    },
    normalizeText(value) {
      return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9\s-]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    },
    toggleRobotChat() {
      if (this.robotChatOpen) {
        this.closeRobotChat();
        return;
      }
      this.openRobotChat();
    },
    openRobotChat() {
      if (!this.robotChatMessages.length) {
        this.robotChatMessages = this.createRobotContextMessages();
      }
      this.robotChatOpen = true;
      this.ensureRobotDockPosition();
      this.triggerRobotEntrance();
    },
    closeRobotChat() {
      this.robotChatOpen = false;
      this.stopRobotDrag();
    },
    resolveRobotDockBounds() {
      const viewportWidth = window.innerWidth || 1280;
      const viewportHeight = window.innerHeight || 800;
      const dock = this.$refs.robotAssistantDock;
      const dockWidth = Math.min(dock?.offsetWidth || 620, Math.max(viewportWidth - 32, 280));
      const dockHeight = Math.min(dock?.offsetHeight || 420, Math.max(viewportHeight - 32, 220));
      const verticalBounds = this.resolveRobotVerticalBounds({ dockHeight, viewportHeight });
      return {
        minLeft: 16,
        maxLeft: Math.max(viewportWidth - dockWidth - 16, 16),
        minTop: verticalBounds.minTop,
        maxTop: verticalBounds.maxTop,
      };
    },
    resolveRobotVerticalBounds({ dockHeight, viewportHeight }) {
      const padding = window.innerWidth <= 767 ? 12 : 16;
      const maxViewportTop = Math.max(padding, viewportHeight - dockHeight - padding);
      const heroRect = this.$refs.producaoHero?.getBoundingClientRect?.();
      const trendRect = this.$refs.trendPanel?.getBoundingClientRect?.();
      const heroLimit = heroRect ? heroRect.top + padding : padding;
      const trendLimit = trendRect ? trendRect.top - dockHeight - padding : maxViewportTop;
      const minTop = Math.max(padding, Math.min(maxViewportTop, heroLimit));
      const maxTop = Math.max(minTop, Math.min(maxViewportTop, trendLimit));
      return { minTop, maxTop };
    },
    ensureRobotDockPosition() {
      const viewportWidth = window.innerWidth || 1280;
      const dockWidth = Math.min(620, Math.max(420, viewportWidth - 48));
      const bounds = this.resolveRobotDockBounds();
      const nextLeft = this.robotDockPosition.left == null
        ? Math.min(Math.max(viewportWidth - dockWidth - 24, bounds.minLeft), bounds.maxLeft)
        : Math.min(Math.max(this.robotDockPosition.left, bounds.minLeft), bounds.maxLeft);
      const preferredTop = this.robotDragActive ? this.robotDockPosition.top : this.robotDockPreferredTop;
      const nextTop = Math.min(Math.max(preferredTop, Math.max(bounds.minTop, 88)), bounds.maxTop);
      this.robotDockPosition = {
        top: nextTop,
        left: nextLeft,
      };
    },
    loadRobotDockPosition() {
      try {
        const raw = localStorage.getItem(ROBOT_DOCK_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (typeof parsed?.top === 'number' && typeof parsed?.left === 'number') {
          this.robotDockPosition = {
            top: parsed.top,
            left: parsed.left,
          };
          this.robotDockPreferredTop = parsed.top;
        }
      } catch (err) {
        console.warn('Falha ao carregar posição do robô', err);
      }
    },
    persistRobotDockPosition() {
      try {
        localStorage.setItem(ROBOT_DOCK_STORAGE_KEY, JSON.stringify(this.robotDockPosition));
      } catch (err) {
        console.warn('Falha ao salvar posição do robô', err);
      }
    },
    handleRobotScroll() {
      if (!this.robotChatOpen || this.robotDragActive || this.robotScrollTicking) return;
      this.robotScrollTicking = true;
      window.requestAnimationFrame(() => {
        this.ensureRobotDockPosition();
        this.robotScrollTicking = false;
      });
    },
    triggerRobotSpeech(textLength = 0) {
      if (this.robotSpeakTimer) clearTimeout(this.robotSpeakTimer);
      this.robotSpeaking = true;
      const duration = Math.min(3200, Math.max(1400, textLength * 16));
      this.robotSpeakTimer = window.setTimeout(() => {
        this.robotSpeaking = false;
        this.robotSpeakTimer = null;
      }, duration);
    },
    triggerRobotEntrance() {
      if (this.robotEntranceTimer) clearTimeout(this.robotEntranceTimer);
      this.robotEntranceAnimating = true;
      this.robotEntranceTimer = window.setTimeout(() => {
        this.robotEntranceAnimating = false;
        this.robotEntranceTimer = null;
      }, 1100);
    },
    startRobotDrag(event) {
      if (!this.robotChatOpen) return;
      const dock = this.$refs.robotAssistantDock;
      if (!dock) return;
      const rect = dock.getBoundingClientRect();
      this.robotDragActive = true;
      this.robotDragOffsetX = event.clientX - rect.left;
      this.robotDragOffsetY = event.clientY - rect.top;
      event.preventDefault();
    },
    handleRobotDrag(event) {
      if (!this.robotDragActive) return;
      const bounds = this.resolveRobotDockBounds();
      const nextLeft = Math.min(Math.max(bounds.minLeft, event.clientX - this.robotDragOffsetX), bounds.maxLeft);
      const nextTop = Math.min(Math.max(bounds.minTop, event.clientY - this.robotDragOffsetY), bounds.maxTop);
      this.robotDockPosition = {
        left: nextLeft,
        top: nextTop,
      };
      this.robotDockPreferredTop = nextTop;
      this.persistRobotDockPosition();
    },
    stopRobotDrag() {
      this.robotDragActive = false;
      this.persistRobotDockPosition();
    },
    runRobotCommand(command) {
      const normalized = this.normalizeText(command);
      if (normalized.includes('periodo') || normalized.includes('todas as datas')) {
        this.selectedDateKey = ALL_DATES_KEY;
        this.rankingMode = 'period';
        this.handleDateChange();
        this.appendRobotMessage('Voltei a visualização para o período completo e todas as datas.');
        return;
      }
      if (normalized.includes('pico') || normalized.includes('mais alto') || normalized.includes('maior valor')) {
        if (this.topDailySummary) {
          this.appendRobotMessage(`O ponto mais alto do recorte esta em ${this.topDailySummary.label}, com ${this.formatCurrency(this.topDailySummary.total)}.`);
        } else {
          this.appendRobotMessage('Ainda nao tenho dados suficientes para identificar o ponto mais alto.');
        }
        return;
      }
      if (normalized.includes('vale') || normalized.includes('mais baixo') || normalized.includes('menor valor')) {
        if (this.lowestDailySummary) {
          this.appendRobotMessage(`O ponto mais baixo do recorte esta em ${this.lowestDailySummary.label}, com ${this.formatCurrency(this.lowestDailySummary.total)}.`);
        } else {
          this.appendRobotMessage('Ainda nao tenho dados suficientes para identificar o ponto mais baixo.');
        }
        return;
      }
      if (normalized.includes('data') || normalized.includes('datas')) {
        this.appendRobotMessage(`A janela analisada vai de ${this.importDateRangeLabel} e possui ${this.dateSummaries.length} datas consolidadas.`);
        return;
      }
      if (normalized.includes('equipe') && normalized.includes('ativa')) {
        this.appendRobotMessage(`Hoje tenho ${this.selectedDateActiveTeams} equipes com lançamento no recorte atual.`);
        return;
      }
      if (normalized.includes('total')) {
        this.appendRobotMessage(`O total atual é ${this.formatCurrency(this.selectedDateTotal)}.`);
        return;
      }
      if (normalized.includes('atencao') || normalized.includes('alerta') || normalized.includes('meta')) {
        if (this.operationalAlerts.length) {
          this.appendRobotMessage(`Ponto de atencao principal: ${this.operationalAlerts[0].text}`);
        } else {
          this.appendRobotMessage(`Nao ha alertas criticos agora. O desvio atual contra a meta esta em ${this.executiveDeltaLabel}.`);
        }
        return;
      }
      if (normalized.includes('grafico') || normalized.includes('analise') || normalized.includes('avaliar')) {
        this.appendRobotMessage(`${this.currentRobotTip.text} ${this.narrativeSummary}`);
        return;
      }
      this.appendRobotMessage(`Como professor de graficos, minha leitura atual e: ${this.currentRobotTip.text}`);
    },
    askRobotQuickAction(command) {
      this.appendRobotMessage(command, 'user');
      this.runRobotCommand(command);
    },
    submitRobotInput() {
      const command = this.robotInput;
      if (!command) return;

      this.appendRobotMessage(command, 'user');
      this.robotInput = '';
      this.runRobotCommand(command);
    },
    selectSummaryDate(dateKey) {
      this.selectedDateKey = dateKey;
      this.rankingMode = 'date';
      this.handleDateChange();
    },
    toggleTeamSelection(code) {
      if (!code) return;
      const selected = new Set(this.selectedTeamCodes);
      if (selected.has(code)) selected.delete(code);
      else selected.add(code);
      this.selectedTeamCodes = this.teamFilterOptions
        .map((team) => team.code)
        .filter((teamCode) => selected.has(teamCode));
    },
    selectAllTeams() {
      this.selectedTeamCodes = this.teamFilterOptions.map((team) => team.code);
    },
    clearAllTeams() {
      this.selectedTeamCodes = [];
    },
    isTeamMarked(code) {
      return this.selectedTeamCodeSet.has(code);
    },
    openTeamDrawer(team) {
      if (!team) return;
      this.selectedTeamCode = team.code;
    },
    closeTeamDrawer() {
      this.selectedTeamCode = '';
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
    matchesTab(team, tab) {
      const type = String(team?.type || '').toUpperCase();
      // build a fallback searchable string from other source columns
      const altFields = [team?.display, team?.code, team?.plate, team?.colD, team?.colL, team?.colAH]
        .filter((v) => v != null)
        .join(' ')
        .toString()
        .toUpperCase();

      if (tab === 'OBRAS') {
        if (!type && !altFields) return true;
        return type.includes('OBRA') || type.includes('CONST') || altFields.includes('OBRA') || altFields.includes('CONST');
      }
      if (tab === 'EME') {
        return type.includes('EME') || altFields.includes('EME');
      }
      if (tab === 'CUSTEIO') {
        return type.includes('CUSTEIO') || altFields.includes('CUSTEIO');
      }
      return true;
    },
    buildEndpointCandidates(primary, sheetName, baseKey = this.selectedBase) {
      const params = new URLSearchParams();
      if (sheetName) params.set('sheet', sheetName);
      if (baseKey) params.set('base', baseKey);
      const query = params.toString() ? `?${params.toString()}` : '';
      const endpoints = [`${primary}${query}`];
      if (primary.startsWith('http') && !primary.includes('/api/')) {
        endpoints.push(`/api/dropbox-diario${query}`);
      }
      return endpoints;
    },
    resolveRequestTimeout(primary) {
      if (primary.includes('/api/dropbox-diario')) return 90000;
      if (primary.includes('/api/get-producao-from-db')) return 90000;
      return 30000;
    },
    async requestNormalizedSheet(primary, sheetName, baseKey = this.selectedBase) {
      const endpoints = this.buildEndpointCandidates(primary, sheetName, baseKey);
      const timeoutMs = this.resolveRequestTimeout(primary);
      let response = null;
      let lastError = null;

      for (const endpoint of endpoints) {
        let timeoutId;
        try {
          const controller = new AbortController();
          timeoutId = setTimeout(() => controller.abort(), timeoutMs);
          response = await fetch(endpoint, { cache: 'no-store', signal: controller.signal });
          clearTimeout(timeoutId);
          break;
        } catch (error) {
          if (timeoutId) clearTimeout(timeoutId);
          if (error?.name === 'AbortError') {
            const timeoutError = new Error(`A consulta da base ${baseKey} na aba ${sheetName} excedeu ${Math.round(timeoutMs / 1000)}s.`);
            timeoutError.name = 'TimeoutError';
            timeoutError.sheetName = sheetName;
            timeoutError.endpoint = endpoint;
            lastError = timeoutError;
          } else {
            lastError = error;
          }
          console.warn('fetch failed for', endpoint, lastError);
        }
      }

      if (!response) {
        throw lastError || new Error(`Falha ao contatar o servidor para a aba ${sheetName}`);
      }

      let payload;
      try {
        payload = await response.json();
      } catch (error) {
        throw new Error(`Resposta inválida do servidor (${response.url}): ${error.message || error}`);
      }

      if (!response.ok) {
        const detail = payload?.detail || payload?.error || `Falha ao buscar dados da aba ${sheetName}`;
        const error = new Error(detail);
        error.payload = payload;
        error.sheetName = sheetName;
        error.status = response.status;
        throw error;
      }

      const normalized = payload?.data || {};
      if (!Array.isArray(normalized.dates) || !Array.isArray(normalized.teams)) {
        throw new Error(`Formato inesperado recebido do servidor para a aba ${sheetName}.`);
      }

      return {
        sheetName,
        baseKey,
        payload,
        normalized,
      };
    },
    async requestSheetsWithConcurrency(primary, baseKeys, sheets, concurrency = 3) {
      const tasks = baseKeys.flatMap((baseKey) =>
        sheets.map((sheet) => ({ baseKey, sheet }))
      );
      if (!tasks.length) return [];

      const settled = new Array(tasks.length);
      let cursor = 0;

      const worker = async () => {
        while (true) {
          const current = cursor;
          cursor += 1;
          if (current >= tasks.length) return;

          const task = tasks[current];
          try {
            const value = await this.requestNormalizedSheet(primary, task.sheet, task.baseKey);
            settled[current] = { status: 'fulfilled', value };
          } catch (reason) {
            settled[current] = { status: 'rejected', reason };
          }
        }
      };

      const workers = Array.from(
        { length: Math.max(1, Math.min(concurrency, tasks.length)) },
        () => worker()
      );
      await Promise.all(workers);
      return settled;
    },
    mergeNormalizedSheets(results) {
      const dateMap = new Map();
      const teamMap = new Map();
      const sourceSheets = [];
      const metricKinds = new Set();
      const metricLabels = new Set();
      const totals = {
        rowCount: 0,
        processedRows: 0,
        skippedRows: 0,
        missingTeamRows: 0,
        missingDateRows: 0,
        zeroValueRows: 0,
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
            type: team.type || 'GERAL',
            plate: team.plate || '',
            valuesByDate: {},
            sourceSheets: [],
            categories: [],
            colD: team.colD ?? null,
            colL: team.colL ?? null,
            colAH: team.colAH ?? null,
          };

          if (!existing.plate && team.plate) existing.plate = team.plate;
          if (team.type && !existing.categories.includes(team.type)) existing.categories.push(team.type);
          if (existing.colD == null && team.colD != null) existing.colD = team.colD;
          if (existing.colL == null && team.colL != null) existing.colL = team.colL;
          if (existing.colAH == null && team.colAH != null) existing.colAH = team.colAH;
          if (!existing.sourceSheets.includes(sheetName)) existing.sourceSheets.push(sheetName);

          Object.entries(team.valuesByDate || {}).forEach(([dateKey, value]) => {
            existing.valuesByDate[dateKey] = Number(((Number(existing.valuesByDate[dateKey]) || 0) + (Number(value) || 0)).toFixed(2));
          });

          teamMap.set(team.code, existing);
        });

        const summary = normalized.summary || {};
        if (summary.metricKind) metricKinds.add(summary.metricKind);
        if (summary.metricLabel) metricLabels.add(summary.metricLabel);
        totals.rowCount += Number(summary.rowCount) || 0;
        totals.processedRows += Number(summary.processedRows) || 0;
        totals.skippedRows += Number(summary.skippedRows) || 0;
        totals.missingTeamRows += Number(summary.missingTeamRows) || 0;
        totals.missingDateRows += Number(summary.missingDateRows) || 0;
        totals.zeroValueRows += Number(summary.zeroValueRows) || 0;
        totals.totalImportedValue = Number((totals.totalImportedValue + (Number(summary.totalImportedValue) || 0)).toFixed(2));
      });

      const dates = Array.from(dateMap.values()).sort((left, right) => left.key.localeCompare(right.key));
      const teams = Array.from(teamMap.values())
        .map((team) => ({
          ...team,
          sourceSheets: [...team.sourceSheets].sort(),
          categories: [...(team.categories || [])].sort(),
          type: team.categories && team.categories.length
            ? team.categories.join(' + ')
            : team.sourceSheets.length
              ? team.sourceSheets.join(' + ')
              : 'GERAL',
        }))
        .sort((left, right) => left.display.localeCompare(right.display));

      const nonZeroTeams = teams.filter((team) => Object.values(team.valuesByDate || {}).some((value) => Number(value) > 0)).length;

      return {
        dates,
        teams,
        summary: {
          layout: 'combined-service',
          metricKind: metricKinds.has('count') ? 'count' : 'currency',
          metricLabel: metricLabels.has('programacoes') ? 'programacoes' : 'valor programado',
          sheetName: 'GERAL',
          baseName: this.selectedBase,
          sourceSheets,
          rowCount: totals.rowCount,
          processedRows: totals.processedRows,
          skippedRows: totals.skippedRows,
          missingTeamRows: totals.missingTeamRows,
          missingDateRows: totals.missingDateRows,
          zeroValueRows: totals.zeroValueRows,
          totalImportedValue: totals.totalImportedValue,
          teamCount: teams.length,
          dateCount: dates.length,
          nonZeroTeams,
          firstDateKey: dates.length ? dates[0].key : '',
          lastDateKey: dates.length ? dates[dates.length - 1].key : '',
        },
      };
    },
    applyNormalizedPayload(requestedTab, normalized, origin, generatedAt) {
      this.availableDates = normalized.dates || [];
      this.importSummary = normalized.summary || {};
      const teams = (normalized.teams || [])
        .map((team) => ({
          ...team,
          type: team.type || '',
          valuesByDate: team.valuesByDate || {},
        }))
        .sort((a, b) => a.display.localeCompare(b.display));
      this.teamRows = teams;
      this.loadedTab = requestedTab;

      try {
        const counts = {};
        this.teamRows.forEach((t) => {
          const key = (t.type || '').toString().trim() || '(empty)';
          counts[key] = (counts[key] || 0) + 1;
        });
        console.debug('DEBUG: team types counts', counts);
      } catch (e) {
        // ignore
      }

      const storedDate = this.lastDateKey === ALL_DATES_KEY
        ? { key: ALL_DATES_KEY }
        : this.availableDates.find((col) => col.key === this.lastDateKey);
      const initialColumn = storedDate || this.pickDefaultDate(this.availableDates);
      this.selectedDateKey = initialColumn ? initialColumn.key : ALL_DATES_KEY;
      if (this.selectedDateKey) {
        this.persistLastDateKey(this.selectedDateKey, this.selectedBase);
        this.lastDateKey = this.selectedDateKey;
      }
      this.selectedTeamCodes = teams.map((team) => team.code);
      this.selectedTeamCode = teams.length ? teams[0].code : '';
      this.historyWindowStart = Math.max(0, this.availableDates.length - this.historyWindowSize);

      this.originLabel = origin === 'database'
        ? 'Neon'
        : origin === 'remote-db-sync'
          ? 'Dropbox + Neon'
          : origin === 'remote'
            ? 'Dropbox'
            : origin === 'local'
              ? 'Arquivo local'
              : origin === 'mixed'
                ? 'múltiplas origens'
                : 'desconhecida';
      const updatedAt = generatedAt ? new Date(generatedAt) : new Date();
      this.lastUpdatedLabel = timestampFormatter.format(updatedAt);
    },
    async loadFromDatabase(options = {}) {
      const { forceRefresh = false, silent = false } = options;
      const selectedBase = this.selectedBase;
      if (!forceRefresh && this.applyBasePayloadCache(selectedBase)) {
        const cacheEntry = this.basePayloadCache[selectedBase];
        if (this.isCacheFresh(cacheEntry)) {
          return;
        }
      }

      if (!silent) {
        this.loading = true;
      }
      this.errorMessage = '';
      this.sampleRows = null;
      try {
        const primary = '/api/get-producao-from-db';
        const baseKeys = this.getSelectedBaseKeys(selectedBase);
        const sheets = this.getBaseSheetPlan(selectedBase);
        const settled = await this.requestSheetsWithConcurrency(primary, baseKeys, sheets, 2);
        const results = settled
          .filter((result) => result.status === 'fulfilled')
          .map((result) => result.value);
        const failures = settled
          .filter((result) => result.status === 'rejected')
          .map((result) => result.reason)
          .filter(Boolean);

        if (!results.length) {
          throw failures[0] || new Error('Nenhum conjunto de dados foi carregado com sucesso.');
        }

        if (failures.length) {
          const plural = failures.length > 1 ? 'consultas falharam' : 'consulta falhou';
          this.emitToast(`${failures.length} ${plural}; exibindo dados parciais.`, 'warning');
          console.warn('Falhas parciais em loadFromDatabase:', failures);
        }

        this.tabPayloadCache = this.buildTabPayloadCache(results);
        this.applyCachedTabPayload(this.activeTab);
        this.saveBasePayloadCache(selectedBase, this.tabPayloadCache);
      } catch (err) {
        console.error('Erro ao carregar dados do Neon:', err);
        if (silent) {
          this.emitToast('Falha ao atualizar dados em segundo plano. Mantendo cache local.', 'warning');
          return;
        }
        if (err?.status === 404 || err?.payload?.origin === 'database-empty') {
          const label = this.isAllBasesSelected ? 'todas as bases' : `a base ${selectedBase}`;
          this.errorMessage = `O Neon ainda não tem dados para ${label}. Use o botão de sincronização para importar do Dropbox.`;
        } else if (err && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
          this.errorMessage = `A consulta da base ${selectedBase} expirou. Tente novamente.`;
        } else if (err && err.message && err.message.includes('Failed to fetch')) {
          this.errorMessage = 'Falha na conexão com a API. Verifique o deploy da Vercel e tente novamente.';
        } else {
          this.errorMessage = err.message || 'Erro desconhecido ao carregar dados do Neon.';
        }
        this.tabPayloadCache = {};
        this.importSummary = {};
        this.availableDates = [];
        this.teamRows = [];
      } finally {
        if (!silent) {
          this.loading = false;
        }
      }
    },
    async syncFromDropbox() {
      const selectedBase = this.selectedBase;
      if (this.syncing) return;
      this.loading = true;
      this.syncing = true;
      this.errorMessage = '';
      this.sampleRows = null;
      try {
        const primary = '/api/dropbox-diario';
        const baseKeys = this.getSelectedBaseKeys(selectedBase);
        const sheets = this.getBaseSheetPlan(selectedBase);
        const settled = await this.requestSheetsWithConcurrency(primary, baseKeys, sheets, 2);
        const results = settled
          .filter((result) => result.status === 'fulfilled')
          .map((result) => result.value);
        const failures = settled
          .filter((result) => result.status === 'rejected')
          .map((result) => result.reason)
          .filter(Boolean);

        if (!results.length) {
          throw failures[0] || new Error('Nenhum conjunto de dados foi sincronizado com sucesso.');
        }

        if (failures.length) {
          const plural = failures.length > 1 ? 'sincronizações falharam' : 'sincronização falhou';
          this.emitToast(`${failures.length} ${plural}; exibindo dados parciais.`, 'warning');
          console.warn('Falhas parciais em syncFromDropbox:', failures);
        }

        this.tabPayloadCache = this.buildTabPayloadCache(results);
        this.applyCachedTabPayload(this.activeTab);
        this.saveBasePayloadCache(selectedBase, this.tabPayloadCache);
      } catch (err) {
        console.error('Erro ao sincronizar com o Dropbox:', err);
        if (err?.payload?.sampleRows) {
          this.sampleRows = err.payload.sampleRows;
          this.headerCandidates = this.sampleRows.map((row, index) => ({ idx: index, label: `Linha ${index + 1}` }));
          this.headerCandidate = this.headerCandidates.length ? this.headerCandidates[0].idx : null;
          return;
        }
        if (err && (err.name === 'AbortError' || err.name === 'TimeoutError')) {
          this.errorMessage = `A sincronização da base ${selectedBase} expirou. Tente novamente.`;
        } else if (err && err.message && err.message.includes('Failed to fetch')) {
          this.errorMessage = 'Falha na conexão durante a sincronização com o Dropbox.';
        } else {
          this.errorMessage = err.message || 'Erro ao sincronizar com o Dropbox.';
        }
      } finally {
        this.syncing = false;
        this.loading = false;
      }
    },

    triggerFileUpload() {
      this.$refs.fileInput.value = '';
      this.$refs.fileInput.click();
    },

    async handleFileUpload(event) {
      const file = event.target.files?.[0];
      if (!file) return;

      this.uploading = true;
      this.loading = true;
      this.errorMessage = '';

      try {
        const buffer = await file.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

        const activeBase = this.selectedBase === 'TODAS' ? 'BCB' : (this.selectedBase || 'BCB');
        const sheetName = 'DIÁRIO';

        const response = await fetch('/api/upload-diario', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: base64, sheet: sheetName, base: activeBase }),
          signal: AbortSignal.timeout(60000),
        });

        const json = await response.json();

        if (!response.ok) {
          throw new Error(json.error || `Erro HTTP ${response.status}`);
        }

        this.emitToast(
          `Importado: ${json.teams} equipes, ${json.dates} datas (${json.insertedRows} linhas) na base ${json.base}.`,
          'success'
        );

        await this.loadFromDatabase({ silent: false });
      } catch (err) {
        console.error('Erro ao importar arquivo:', err);
        if (err.name === 'AbortError' || err.name === 'TimeoutError') {
          this.errorMessage = 'O upload expirou. Tente novamente com um arquivo menor.';
        } else {
          this.errorMessage = err.message || 'Erro ao importar o arquivo Excel.';
        }
      } finally {
        this.uploading = false;
        this.loading = false;
      }
    },

    // lightweight client-side parse fallback for sampleRows
    parseRowsClientSide(rows, headerIndexOverride = null, dataStartCol = 6) {
      const parseHeaderDateLocal = (cellValue) => {
        if (typeof cellValue === 'number') return null;
        if (typeof cellValue !== 'string') return null;
        const trimmed = cellValue.trim();
        if (!trimmed) return null;
        const isoMatch = trimmed.match(/\d{4}-\d{2}-\d{2}/);
        if (isoMatch) return new Date(`${isoMatch[0]}T00:00:00Z`);
        const slashMatch = trimmed.match(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/);
        if (slashMatch) {
          const [dayStr, monthStr, yearStr] = slashMatch[0].split('/');
          let year = yearStr ? Number(yearStr) : new Date().getFullYear();
          if (year < 100) year += 2000;
          return new Date(Date.UTC(year, Number(monthStr) - 1, Number(dayStr)));
        }
        return null;
      };

      const buildDateCols = (headerRow) =>
        headerRow
          .map((v, i) => ({ v, i }))
          .map((item) => {
            const d = parseHeaderDateLocal(item.v);
            if (!d) return null;
            return { idx: item.i, date: d, key: d.toISOString().slice(0, 10), label: new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(d) };
          })
          .filter(Boolean);

      const headerIndex = headerIndexOverride != null ? headerIndexOverride : rows.findIndex((r) => Array.isArray(r) && r.some((c) => String(c || '').toUpperCase().includes('BASE')));
      if (headerIndex === -1) throw new Error('Cabeçalho não encontrado no cliente');
      const headerRow = rows[headerIndex];
      const dateCols = buildDateCols(headerRow).filter((c) => c.idx >= dataStartCol || true);
      if (!dateCols.length) throw new Error('Nenhuma coluna de data detectada no cliente');

      const teams = [];
      for (let r = headerIndex + 1; r < rows.length; r += 1) {
        const row = rows[r] || [];
        const maybeCode = row[2] ? String(row[2]).trim() : null;
        if (!maybeCode) continue;
        const hasApontado = row.some((c) => c != null && String(c).toLowerCase().includes('apontado r$'));
        if (!hasApontado) continue;
        const valuesByDate = {};
        dateCols.forEach((c) => {
          const v = row[c.idx];
          const num = typeof v === 'number' ? v : Number(String(v || '').replace(/[^0-9,.-]/g, '').replace(',', '.')) || 0;
          valuesByDate[c.key] = num;
        });
        const safeGet = (r, i) => (Array.isArray(r) && i >= 0 && i < r.length ? r[i] : null);
        const colD = safeGet(row, 3);
        const colL = safeGet(row, 11);
        const colAH = safeGet(row, 33);
        teams.push({ code: maybeCode, display: maybeCode, type: row[1] || '', plate: row[3] || '', valuesByDate, colD, colL, colAH });
      }

      const dates = dateCols.map((c) => ({ key: c.key, label: c.label }));
      return { dates, teams };
    },

    applyClientSampleParse() {
      try {
        if (!this.sampleRows) return;
        const parsed = this.parseRowsClientSide(this.sampleRows, this.headerCandidate, this.dataStartColumn);
        this.availableDates = parsed.dates;
        this.teamRows = parsed.teams.sort((a, b) => a.display.localeCompare(b.display));
        this.importSummary = {
          layout: 'summary',
          sheetName: this.activeSheetLabel,
          baseName: this.activeBaseLabel,
          rowCount: this.sampleRows.length,
          headerRowIndex: this.headerCandidate,
          dateCount: parsed.dates.length,
          teamCount: parsed.teams.length,
          processedRows: parsed.teams.length,
          skippedRows: 0,
        };
        this.loadedTab = this.activeTab;
        this.selectedDateKey = this.availableDates.length ? this.availableDates[0].key : ALL_DATES_KEY;
        this.selectedTeamCodes = this.teamRows.map((team) => team.code);
        this.selectedTeamCode = this.teamRows.length ? this.teamRows[0].code : '';
        this.originLabel = 'arquivo (cliente)';
        this.lastUpdatedLabel = '';
        this.sampleRows = null;
      } catch (e) {
        this.errorMessage = e.message || 'Falha ao parsear amostra no cliente.';
      }
    },
  },
  async mounted() {
    this.persistSelectedBase(this.selectedBase);
    await this.loadFromDatabase();
    this.loadRobotDockPosition();
    this.ensureRobotDockPosition();
    window.addEventListener('resize', this.ensureRobotDockPosition);
    window.addEventListener('scroll', this.handleRobotScroll, { passive: true });
    window.addEventListener('pointermove', this.handleRobotDrag);
    window.addEventListener('pointerup', this.stopRobotDrag);
  },
  beforeUnmount() {
    window.removeEventListener('resize', this.ensureRobotDockPosition);
    window.removeEventListener('scroll', this.handleRobotScroll);
    window.removeEventListener('pointermove', this.handleRobotDrag);
    window.removeEventListener('pointerup', this.stopRobotDrag);
    if (this.robotSpeakTimer) clearTimeout(this.robotSpeakTimer);
    if (this.robotEntranceTimer) clearTimeout(this.robotEntranceTimer);
  },
};
</script>

<style scoped>
.producao-shell {
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 2.4rem;
  position: relative;
}

.producao-shell::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 560px;
  background:
    radial-gradient(circle at top left, rgba(249, 115, 22, 0.18), transparent 32%),
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.14), transparent 36%);
  pointer-events: none;
  z-index: 0;
}

.producao-shell > * {
  position: relative;
  z-index: 1;
}

.producao-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(320px, 360px);
  gap: 1.25rem;
  align-items: start;
  padding: 1.8rem;
  border-radius: 0;
  border: 1px solid rgba(255, 255, 255, 0.09);
  background:
    radial-gradient(circle at top left, rgba(251, 191, 36, 0.09), transparent 28%),
    radial-gradient(circle at top right, rgba(14, 165, 233, 0.1), transparent 26%),
    linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(15, 23, 42, 0.78)),
    radial-gradient(circle at top right, rgba(251, 191, 36, 0.16), transparent 30%);
  box-shadow: 0 18px 42px rgba(2, 6, 23, 0.22);
  position: relative;
  z-index: 0;
  overflow: hidden;
}

.producao-hero::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 18% 20%, rgba(251, 191, 36, 0.08), transparent 0 28%),
    radial-gradient(circle at 72% 18%, rgba(56, 189, 248, 0.06), transparent 0 24%);
  z-index: -1;
  pointer-events: none;
}

.hero-copy {
  min-width: 0;
  max-width: 760px;
  padding-right: 0.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
  position: relative;
}

.hero-toolbar__label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.52);
  font-weight: 700;
}

.hero-command-grid {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: minmax(320px, 0.95fr) minmax(520px, 1.15fr);
  align-items: stretch;
  gap: 1rem;
}

.hero-command-panel {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.95rem;
  padding: 1rem 1.05rem;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(15, 23, 42, 0.16));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.robot-bubble {
  min-width: 0;
  max-width: none;
  padding: 1.2rem 1.25rem;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.05), rgba(15, 23, 42, 0.14));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.hero-command-panel__section {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.tab-strip--base {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.6rem;
}

.tab-strip--category {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.6rem;
}

.hero-command-panel__section + .hero-command-panel__section {
  padding-top: 0.95rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.hero-command-panel__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.8rem;
}

.hero-command-panel__head small {
  color: rgba(255, 255, 255, 0.46);
  font-size: 0.8rem;
}

.hero-command-panel__controls {
  padding-top: 0.95rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem 0.9rem;
  align-items: end;
}

.robot-bubble__eyebrow {
  display: block;
  margin-bottom: 0.45rem;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.6);
}

.robot-bubble strong {
  display: block;
  margin-bottom: 0.35rem;
  color: #fff;
  font-size: 1rem;
}

.robot-bubble p {
  margin: 0 0 0.6rem;
  color: rgba(255, 255, 255, 0.74);
  line-height: 1.5;
}

.robot-bubble__tag {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-bottom: 0.9rem;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  background: rgba(52, 211, 153, 0.12);
  color: #d1fae5;
  font-size: 0.75rem;
  letter-spacing: 0.02em;
  border: 1px solid rgba(52, 211, 153, 0.18);
}

.robot-bubble__next {
  border: 1px solid rgba(248, 113, 113, 0.32);
  border-radius: 999px;
  padding: 0.55rem 0.9rem;
  background: rgba(248, 113, 113, 0.16);
  color: #fee2e2;
  font-weight: 700;
  cursor: pointer;
}

.robot-trigger {
  width: 52px;
  height: 52px;
  flex: 0 0 auto;
  border: 1px solid rgba(185, 28, 28, 0.35);
  border-radius: 16px;
  background: radial-gradient(circle at 40% 20%, rgba(248, 113, 113, 0.35), transparent 40%), linear-gradient(135deg, rgba(153, 27, 27, 0.4), rgba(119, 21, 21, 0.65));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 16px 34px rgba(153, 27, 27, 0.22);
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
  padding: 0;
}

.robot-trigger:hover {
  transform: translateY(-1px);
  border-color: rgba(248, 113, 113, 0.6);
  box-shadow: 0 20px 38px rgba(153, 27, 27, 0.28);
}

.robot-trigger.is-active {
  border-color: rgba(248, 113, 113, 0.75);
  box-shadow: 0 18px 42px rgba(153, 27, 27, 0.32);
}

.chart-robot-trigger {
  margin-left: 0.25rem;
  background: rgba(220, 38, 38, 0.16);
}

.robot-head {
  position: relative;
  width: 38px;
  height: 42px;
  border-radius: 14px;
  background:
    linear-gradient(180deg, rgba(255, 231, 184, 0.18), transparent 28%),
    linear-gradient(180deg, #b86b32 0%, #8b4a24 56%, #693418 100%);
  border: 1px solid rgba(71, 36, 18, 0.82);
  box-shadow:
    inset 0 1px 0 rgba(255, 233, 188, 0.32),
    inset 0 -2px 0 rgba(59, 27, 13, 0.55),
    0 0 16px rgba(177, 77, 35, 0.18);
  transition: transform 0.18s ease;
}

.robot-head::before {
  content: '';
  position: absolute;
  top: -10px;
  left: 50%;
  width: 28px;
  height: 6px;
  border-radius: 6px;
  background: linear-gradient(180deg, #8e261d 0%, #64170f 100%);
  border: 1px solid rgba(67, 20, 15, 0.72);
  transform: translateX(-50%);
  box-shadow: 0 3px 0 rgba(72, 38, 17, 0.45);
}

.robot-head::after {
  content: '';
  position: absolute;
  top: -24px;
  left: 50%;
  width: 18px;
  height: 14px;
  border-radius: 7px 7px 3px 3px;
  background:
    linear-gradient(180deg, rgba(255, 231, 184, 0.2), transparent 20%),
    linear-gradient(180deg, #b13a2e 0%, #7f1d1d 100%);
  border: 1px solid rgba(67, 20, 15, 0.72);
  transform: translateX(-50%);
  box-shadow: inset 0 -2px 0 rgba(48, 17, 10, 0.34);
}

.robot-head.is-loading {
  animation: none;
}

.robot-antenna,
.robot-antenna::after {
  display: none;
}

.robot-face {
  position: absolute;
  inset: 9px 4px 8px;
  border-radius: 10px;
  background:
    linear-gradient(180deg, rgba(255, 221, 162, 0.14), transparent 22%),
    linear-gradient(180deg, #996137 0%, #744623 100%);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 4px;
  padding: 0;
  border: 1px solid rgba(78, 44, 18, 0.9);
  box-shadow: inset 0 1px 0 rgba(255, 231, 184, 0.18);
}

.robot-face::before {
  content: '';
  position: absolute;
  top: 12px;
  left: 50%;
  width: 8px;
  height: 5px;
  border-radius: 999px;
  background: #6b3f1f;
  border: 1px solid rgba(78, 44, 18, 0.9);
  transform: translateX(-50%);
}

.robot-eye {
  position: relative;
  margin-top: 6px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 38%, #e0fbff 0%, #8ce9ff 42%, #2f93b1 72%, #1f3343 100%);
  border: 2px solid #5e3a1f;
  box-shadow:
    0 0 0 2px #b98a52,
    0 0 7px rgba(122, 231, 255, 0.45);
}

.robot-eye::after {
  content: '';
  position: absolute;
  inset: 2px;
  border-radius: 50%;
  border: 1px solid rgba(255, 247, 214, 0.35);
}

.robot-mouth {
  position: absolute;
  left: 50%;
  bottom: 4px;
  width: 16px;
  height: 7px;
  border-radius: 3px;
  background:
    repeating-linear-gradient(90deg, #4a2b19 0 2px, #c79a60 2px 4px),
    linear-gradient(180deg, #d7b079 0%, #9f6a35 100%);
  border: 1px solid rgba(82, 46, 20, 0.92);
  box-shadow: inset 0 1px 0 rgba(255, 237, 198, 0.25);
  transform: translateX(-50%);
}

.robot-steam {
  position: absolute;
  top: 13px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: linear-gradient(180deg, #d7b079 0%, #8f5a2d 100%);
  border: 1px solid rgba(82, 46, 20, 0.8);
  box-shadow: none;
  animation: none;
  opacity: 0.42;
}

.robot-steam--left { left: -4px; animation-delay: 0.1s; }
.robot-steam--center { display: none; }
.robot-steam--right { right: -4px; animation-delay: 0.7s; }

.trend-robot-anchor {
  position: fixed;
  top: 104px;
  right: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  z-index: 72;
}

.robot-assistant-dock {
  position: fixed;
  z-index: 70;
  width: min(620px, calc(100vw - 2rem));
  display: grid;
  grid-template-columns: 168px minmax(0, 1fr);
  gap: 1.1rem;
  align-items: end;
}

.robot-assistant-figure {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  min-height: 314px;
  padding: 1rem 0.9rem 0.8rem;
  border-radius: 32px;
  background:
    radial-gradient(circle at 50% 18%, rgba(255, 242, 194, 0.34), transparent 34%),
    radial-gradient(circle at 50% 100%, rgba(255, 170, 92, 0.24), transparent 44%),
    linear-gradient(180deg, rgba(19, 31, 54, 0.92), rgba(11, 22, 41, 0.98));
  border: 1px solid rgba(255, 234, 194, 0.12);
  box-shadow: 0 28px 56px rgba(2, 6, 23, 0.34);
  cursor: grab;
  user-select: none;
  overflow: hidden;
}

.robot-assistant-figure::before,
.robot-assistant-figure::after {
  content: '';
  position: absolute;
  pointer-events: none;
}

.robot-assistant-figure::before {
  inset: 0;
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.08), transparent 34%),
    radial-gradient(circle at 50% 84%, rgba(255, 214, 153, 0.18), transparent 28%);
}

.robot-assistant-figure::after {
  left: 50%;
  bottom: 0.6rem;
  width: 104px;
  height: 18px;
  border-radius: 999px;
  transform: translateX(-50%);
  background: radial-gradient(circle, rgba(4, 10, 22, 0.48), rgba(4, 10, 22, 0));
}

.robot-assistant-figure.is-dragging {
  cursor: grabbing;
}

.robot-assistant-figure__hint {
  position: absolute;
  top: 0.8rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.28rem 0.62rem;
  border-radius: 999px;
  font-size: 0.64rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 242, 214, 0.82);
  background: rgba(11, 20, 37, 0.58);
  border: 1px solid rgba(255, 235, 198, 0.14);
  white-space: nowrap;
}

.robot-full {
  position: relative;
  width: 128px;
  height: 268px;
  filter: drop-shadow(0 24px 30px rgba(5, 10, 22, 0.34));
}

.robot-full.is-loading {
  animation: none;
}

.robot-full.is-entering {
  animation: robotEntranceWalk 1s ease-out;
}

.robot-full__svg {
  width: 100%;
  height: 100%;
  overflow: visible;
}

.robot-full__shadow {
  fill: rgba(4, 10, 22, 0.28);
}

.robot-full__float,
.robot-full__mouth,
.robot-full__arm,
.robot-full__forearm,
.robot-full__leg,
.robot-full__calf {
  transform-box: fill-box;
}

.robot-full__float {
  transform-origin: center bottom;
}

.robot-full__mouth,
.robot-full__arm,
.robot-full__forearm,
.robot-full__leg,
.robot-full__calf {
  transform-origin: center top;
}

.robot-full__arm,
.robot-full__forearm,
.robot-full__leg,
.robot-full__calf {
  transition: transform 180ms ease;
}

.robot-full__arm--left {
  transform: rotate(4deg);
}

.robot-full__arm--right {
  transform: rotate(-4deg);
}

.robot-full__forearm--left {
  transform: rotate(-3deg);
}

.robot-full__forearm--right {
  transform: rotate(3deg);
}

.robot-full__leg--left {
  transform: rotate(1deg);
}

.robot-full__leg--right {
  transform: rotate(-1deg);
}

.robot-full__calf--left {
  transform: rotate(3deg);
}

.robot-full__calf--right {
  transform: rotate(-3deg);
}

.robot-full.is-speaking .robot-full__float {
  animation: robotFloatTalk 0.7s ease-in-out infinite alternate;
}

.robot-full.is-speaking .robot-full__mouth {
  animation: robotTalk 0.16s ease-in-out infinite alternate;
}

.robot-full.is-speaking .robot-full__arm--left {
  animation: robotArmTalkLeft 0.34s ease-in-out infinite alternate;
}

.robot-full.is-speaking .robot-full__arm--right {
  animation: robotArmTalkRight 0.34s ease-in-out infinite alternate;
}

.robot-full.is-speaking .robot-full__forearm--left {
  animation: robotForearmTalkLeft 0.34s ease-in-out infinite alternate;
}

.robot-full.is-speaking .robot-full__forearm--right {
  animation: robotForearmTalkRight 0.34s ease-in-out infinite alternate;
}

.robot-full.is-speaking .robot-full__leg--left,
.robot-full.is-speaking .robot-full__calf--left {
  animation: robotLegTalkLeft 0.5s ease-in-out infinite alternate;
}

.robot-full.is-speaking .robot-full__leg--right,
.robot-full.is-speaking .robot-full__calf--right {
  animation: robotLegTalkRight 0.5s ease-in-out infinite alternate;
}

.robot-full.is-entering .robot-full__arm--left,
.robot-full.is-entering .robot-full__forearm--right,
.robot-full.is-entering .robot-full__leg--right,
.robot-full.is-entering .robot-full__calf--left {
  animation: robotWalkPhaseA 0.28s ease-in-out 4 alternate;
}

.robot-full.is-entering .robot-full__arm--right,
.robot-full.is-entering .robot-full__forearm--left,
.robot-full.is-entering .robot-full__leg--left,
.robot-full.is-entering .robot-full__calf--right {
  animation: robotWalkPhaseB 0.28s ease-in-out 4 alternate;
}

.robot-chat-shell {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 1rem;
  min-height: 330px;
  max-height: min(72vh, 640px);
  border-radius: 24px;
  background:
    radial-gradient(circle at top left, rgba(255, 255, 255, 0.05), transparent 24%),
    linear-gradient(180deg, rgba(29, 63, 51, 0.98), rgba(17, 37, 31, 0.96));
  border: 1px solid rgba(190, 220, 196, 0.14);
  box-shadow: 0 24px 48px rgba(2, 6, 23, 0.42), inset 0 0 0 1px rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(14px);
  position: relative;
  overflow: hidden;
}

.robot-chat-shell::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(transparent 95%, rgba(255, 255, 255, 0.03) 95%),
    linear-gradient(90deg, transparent 97%, rgba(255, 255, 255, 0.02) 97%);
  background-size: 100% 26px, 26px 100%;
  pointer-events: none;
}

.robot-chat-shell__header {
  display: flex;
  justify-content: space-between;
  gap: 0.85rem;
  align-items: flex-start;
}

.robot-chat-shell__header strong {
  display: block;
  margin-top: 0.2rem;
  font-size: 1rem;
  color: #edf7ef;
  font-family: 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive;
}

.robot-chat-shell__eyebrow {
  display: block;
  margin-bottom: 0.15rem;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(225, 245, 226, 0.64);
}

.robot-chat-shell__subtitle {
  margin: 0.3rem 0 0;
  max-width: 34ch;
  color: rgba(225, 245, 226, 0.72);
  font-size: 0.84rem;
  line-height: 1.4;
  font-family: 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive;
}

.robot-chat-shell__actions {
  display: inline-flex;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.robot-chat-clear,
.robot-chat-close {
  border: 1px dashed rgba(224, 244, 227, 0.28);
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
  background: rgba(10, 21, 17, 0.24);
  color: #f2fbf4;
  cursor: pointer;
  font-family: 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive;
}

.robot-chat-quick-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.robot-control-panel {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  padding: 0.9rem;
  border-radius: 18px;
  background: rgba(8, 22, 18, 0.34);
  border: 1px dashed rgba(224, 244, 227, 0.16);
}

.robot-control-panel__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.25fr) minmax(180px, 0.75fr);
  gap: 0.75rem;
}

.robot-control-panel__field {
  width: 100%;
}

.robot-control-panel__actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.robot-control-panel__action {
  min-height: 44px;
}

.robot-team-filter-panel {
  padding-top: 0;
}

.robot-quick-btn {
  border: 1px dashed rgba(224, 244, 227, 0.22);
  border-radius: 999px;
  padding: 0.42rem 0.72rem;
  background: rgba(8, 18, 14, 0.24);
  color: rgba(239, 250, 241, 0.9);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.18s ease, transform 0.18s ease, border-color 0.18s ease;
  font-family: 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive;
}

.robot-quick-btn:hover {
  background: rgba(240, 255, 243, 0.08);
  border-color: rgba(240, 255, 243, 0.28);
  transform: translateY(-1px);
}

.robot-chat-messages {
  min-height: 180px;
  max-height: 300px;
  overflow: auto;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  padding-right: 0.35rem;
  scroll-behavior: smooth;
}

.robot-message {
  padding: 0.75rem 0.85rem;
  border-radius: 14px;
  border: 1px dashed rgba(231, 245, 233, 0.12);
  background: rgba(7, 19, 14, 0.18);
  max-width: 100%;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
}

.robot-message--robot {
  background: rgba(16, 43, 35, 0.44);
  align-self: flex-start;
}

.robot-message--system {
  background: rgba(249, 115, 22, 0.12);
}

.robot-message--user {
  background: rgba(74, 54, 21, 0.34);
  align-self: flex-end;
}

.robot-message__author {
  display: block;
  margin-bottom: 0.3rem;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(225, 245, 226, 0.58);
}

.robot-message p {
  margin: 0;
  color: #eef7ef;
  line-height: 1.5;
  overflow-wrap: anywhere;
  font-family: 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive;
  font-size: 0.98rem;
  text-shadow: 0 0 1px rgba(255, 255, 255, 0.08);
}

.robot-chat-input {
  display: flex;
  align-items: stretch;
  gap: 0.55rem;
}

.robot-chat-input__field {
  flex: 1 1 auto;
  min-width: 0;
  border-radius: 14px;
  border: 1px dashed rgba(224, 244, 227, 0.22);
  background: rgba(8, 18, 14, 0.26);
  color: #effaf1;
  padding: 0.75rem 0.9rem;
  outline: none;
  font-family: 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive;
}

.robot-chat-input__field:focus {
  border-color: rgba(240, 255, 243, 0.32);
  box-shadow: 0 0 0 3px rgba(239, 250, 241, 0.08);
}

.robot-chat-input__field::placeholder {
  color: rgba(221, 244, 224, 0.42);
}

.robot-chat-input__submit {
  border: none;
  border-radius: 14px;
  padding: 0.75rem 1rem;
  background: linear-gradient(120deg, #d9f2da, #9fd0a3);
  color: #163126;
  font-weight: 700;
  cursor: pointer;
  font-family: 'Segoe Print', 'Bradley Hand', 'Comic Sans MS', cursive;
}

.robot-chat-shell-enter-active,
.robot-chat-shell-leave-active {
  transition: opacity 0.24s ease, transform 0.24s ease;
}

.robot-chat-shell-enter-from,
.robot-chat-shell-leave-to {
  opacity: 0;
  transform: translateY(14px) scale(0.98);
}

@keyframes robotPulse {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-1px) scale(1.03); }
}

@keyframes robotFloat {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

@keyframes robotSpark {
  0% { transform: translateY(0) scale(1); opacity: 0.7; }
  100% { transform: translateY(-6px) scale(1.2); opacity: 0.2; }
}

@keyframes robotBob {
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(-3px); }
  50% { transform: translateY(0); }
  75% { transform: translateY(-2px); }
}

@keyframes robotFloatTalk {
  0% { transform: translateY(0); }
  100% { transform: translateY(-4px); }
}

@keyframes robotTalk {
  0% { transform: scaleY(1); }
  100% { transform: scaleY(0.55); }
}

@keyframes robotArmTalkLeft {
  0% { transform: rotate(4deg); }
  100% { transform: rotate(18deg); }
}

@keyframes robotArmTalkRight {
  0% { transform: rotate(-4deg); }
  100% { transform: rotate(-18deg); }
}

@keyframes robotForearmTalkLeft {
  0% { transform: rotate(-3deg); }
  100% { transform: rotate(-18deg); }
}

@keyframes robotForearmTalkRight {
  0% { transform: rotate(3deg); }
  100% { transform: rotate(18deg); }
}

@keyframes robotLegTalkLeft {
  0% { transform: rotate(1deg); }
  100% { transform: rotate(6deg); }
}

@keyframes robotLegTalkRight {
  0% { transform: rotate(-1deg); }
  100% { transform: rotate(-6deg); }
}

@keyframes robotWalkPhaseA {
  0% { transform: rotate(10deg); }
  100% { transform: rotate(-10deg); }
}

@keyframes robotWalkPhaseB {
  0% { transform: rotate(-10deg); }
  100% { transform: rotate(10deg); }
}

@keyframes robotEntranceWalk {
  0% { transform: translateX(22px); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}

.eyebrow {
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.65);
}

.producao-hero h1 {
  margin: 0.35rem 0 0.45rem;
  font-size: clamp(2.2rem, 4.6vw, 3.7rem);
  line-height: 0.96;
  max-width: 13ch;
  letter-spacing: -0.05em;
}

.subline {
  margin: 0;
  color: rgba(255, 255, 255, 0.75);
  font-size: 1rem;
}

.hero-badges {
  margin-top: 0.95rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.hero-badge__icon {
  flex: 0 0 auto;
  opacity: 0.92;
}

.hero-badge {
  padding: 0.48rem 0.88rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.82rem;
  font-weight: 600;
  backdrop-filter: blur(4px);
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.hero-badge:hover {
  transform: translateY(-1px);
  border-color: rgba(251, 191, 36, 0.34);
  box-shadow: 0 10px 22px rgba(2, 6, 23, 0.12);
}

.hero-badge--strong {
  background: linear-gradient(120deg, rgba(249, 115, 22, 0.22), rgba(251, 191, 36, 0.2));
  border-color: rgba(251, 191, 36, 0.3);
  color: #fff4d4;
}

.hero-badge--soft {
  color: #c7d2fe;
}

.hero-snapshot {
  margin-top: 1rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.9rem;
}

.hero-snapshot__card {
  padding: 0.95rem 1rem;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.hero-snapshot__card:hover {
  transform: translateY(-2px);
  border-color: rgba(251, 191, 36, 0.22);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 14px 24px rgba(2, 6, 23, 0.14);
}

.hero-snapshot__card span {
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: rgba(255, 255, 255, 0.56);
}

.hero-snapshot__card strong {
  font-size: 1.08rem;
  line-height: 1.15;
  letter-spacing: -0.02em;
}

.hero-snapshot__card small {
  color: rgba(255, 255, 255, 0.66);
}

.hero-focus {
  width: 100%;
  position: relative;
  z-index: 2;
  padding: 1.2rem;
  border-radius: 24px;
  background:
    radial-gradient(circle at top right, rgba(251, 191, 36, 0.14), transparent 32%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(15, 23, 42, 0.24));
  border: 1px solid rgba(255, 255, 255, 0.09);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  transition: transform 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
  justify-self: end;
}

.hero-focus:hover {
  transform: translateY(-2px);
  border-color: rgba(251, 191, 36, 0.18);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04), 0 18px 30px rgba(2, 6, 23, 0.16);
}

.hero-focus__eyebrow {
  margin: 0;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.56);
}

.hero-focus__headline {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.hero-focus__headline strong {
  font-size: clamp(1.7rem, 3vw, 2.45rem);
  line-height: 1;
  letter-spacing: -0.04em;
}

.hero-focus__headline span {
  color: rgba(255, 255, 255, 0.7);
}

.hero-focus__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.hero-focus__grid article {
  padding: 0.9rem 0.95rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.07);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.hero-focus__grid span {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.56);
}

.hero-focus__grid strong {
  font-size: 1.05rem;
  letter-spacing: -0.02em;
}

.hero-focus__grid small {
  color: rgba(255, 255, 255, 0.68);
}

.control-dock {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(320px, 0.8fr);
  gap: 1rem;
  align-items: stretch;
  padding: 1.05rem 1.15rem;
  border-radius: 24px;
  background: rgba(15, 23, 42, 0.56);
  border: 1px solid rgba(255, 255, 255, 0.07);
  backdrop-filter: blur(8px);
}

.control-dock--compact {
  grid-template-columns: 1fr;
  padding: 0.95rem 1rem;
  border-radius: 20px;
  background: rgba(15, 23, 42, 0.42);
}

.control-summary-dock {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding: 0;
}

.executive-direct {
  display: grid;
  gap: 1rem;
  padding: 1.1rem;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    radial-gradient(circle at top right, rgba(56, 189, 248, 0.12), transparent 34%),
    linear-gradient(160deg, rgba(15, 23, 42, 0.94), rgba(15, 23, 42, 0.84));
}

.executive-direct__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.executive-direct__header h2 {
  margin: 0;
}

.executive-direct__header p {
  margin: 0.25rem 0 0;
  color: rgba(255, 255, 255, 0.72);
}

.executive-direct__metrics {
  display: grid;
  gap: 0.8rem;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.executive-direct__metric {
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.09);
  background: rgba(255, 255, 255, 0.03);
  padding: 0.85rem 0.95rem;
  display: grid;
  gap: 0.25rem;
}

.executive-direct__metric span {
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.64);
}

.executive-direct__metric strong {
  font-size: 1.15rem;
  line-height: 1.15;
}

.executive-direct__metric small {
  color: rgba(255, 255, 255, 0.72);
}

.executive-direct__toplist {
  display: grid;
  gap: 0.6rem;
}

.executive-direct__toplist h3 {
  margin: 0;
}

.executive-direct__team {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.8rem;
  align-items: center;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.02);
  padding: 0.65rem 0.8rem;
}

.executive-direct__order {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(56, 189, 248, 0.18);
  border: 1px solid rgba(56, 189, 248, 0.26);
  font-weight: 700;
  font-size: 0.8rem;
}

.executive-direct__team small {
  color: rgba(255, 255, 255, 0.66);
}

.executive-direct__value {
  font-size: 1.02rem;
}

.control-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.8rem;
  min-width: 0;
}

.control-summary--with-filters {
  grid-template-columns: repeat(4, minmax(0, 1fr)) minmax(360px, 1.3fr);
  align-items: stretch;
}

.advanced-dock {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding: 1rem 1.15rem;
  border-radius: 22px;
  background: rgba(15, 23, 42, 0.42);
  border: 1px dashed rgba(255, 255, 255, 0.1);
}

.control-summary__item small,
.control-summary__refresh small {
  color: rgba(255, 255, 255, 0.66);
}
.control-summary__refresh {
  min-width: 0;
  min-height: 92px;
  padding: 1rem 1.05rem;
  border-radius: 18px;
  border: 1px solid rgba(251, 191, 36, 0.2);
  background:
    linear-gradient(135deg, rgba(251, 191, 36, 0.14), rgba(249, 115, 22, 0.14)),
    rgba(255, 255, 255, 0.04);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.35rem;
  text-align: left;
  color: #f8fafc;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}
.control-summary__refresh:hover:not(:disabled) {
  transform: translateY(-3px);
  border-color: rgba(251, 191, 36, 0.3);
  box-shadow: 0 16px 28px rgba(2, 6, 23, 0.18);
}
.control-summary__refresh:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.control-summary__refresh--upload {
  border-color: rgba(99, 179, 237, 0.2);
  background:
    linear-gradient(135deg, rgba(99, 179, 237, 0.14), rgba(66, 153, 225, 0.14)),
    rgba(255, 255, 255, 0.04);
}
.control-summary__refresh--upload:hover:not(:disabled) {
  border-color: rgba(99, 179, 237, 0.35);
}
.control-summary__refresh strong {
  font-size: 1.2rem;
  line-height: 1.05;
  letter-spacing: -0.02em;
}
.advanced-dock--compact {
  padding: 0.95rem 1rem;
  border-radius: 20px;
  background: rgba(15, 23, 42, 0.34);
}

.advanced-dock--hero {
  grid-column: 1 / -1;
  margin-top: -0.15rem;
}

.team-filter-panel {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  padding-top: 0.4rem;
}

.team-filter-panel__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
}

.team-filter-panel__header span {
  display: block;
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: rgba(255, 255, 255, 0.56);
}

.team-filter-panel__actions {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.team-filter-action {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  padding: 0.45rem 0.8rem;
  background: rgba(255, 255, 255, 0.04);
  color: #fff;
  cursor: pointer;
  font-size: 0.82rem;
}

.team-filter-panel__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
  max-height: 280px;
  overflow: auto;
  padding-right: 0.2rem;
}

.team-filter-option {
  display: flex;
  gap: 0.7rem;
  align-items: flex-start;
  padding: 0.8rem 0.9rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.team-filter-option input {
  margin-top: 0.2rem;
}

.team-filter-option div {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.team-filter-option small {
  color: rgba(255, 255, 255, 0.62);
}

.panel-stack {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: flex-end;
  align-content: flex-start;
  min-width: 0;
}

.header-actions--hero {
  width: 100%;
}

.control-summary__item {
  min-width: 0;
  min-height: 92px;
  padding: 1rem 1.05rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.35rem;
  text-align: left;
  position: relative;
  overflow: hidden;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}
.metric-card__head,
.alert-card__head,
.team-drawer__metric-head {
  display: flex;
  align-items: center;
  gap: 0.55rem;
}
.metric-card__icon,
.alert-card__icon,
.team-drawer__metric-icon {
  width: 32px;
  height: 32px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #f8fafc;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  flex: 0 0 auto;
}
.metric-card__icon--soft,
.team-drawer__metric-icon--soft {
  background: rgba(251, 191, 36, 0.1);
  color: #fde68a;
  border-color: rgba(251, 191, 36, 0.16);
}

.control-summary__item:hover {
  transform: translateY(-3px);
  border-color: rgba(251, 191, 36, 0.2);
  box-shadow: 0 16px 28px rgba(2, 6, 23, 0.18);
}

.control-summary__item span {
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: rgba(255, 255, 255, 0.56);
}

.control-summary__item strong {
  font-size: 1.35rem;
  line-height: 1.05;
  letter-spacing: -0.02em;
}

.summary-ribbon {
  padding: 0.95rem 1.15rem;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(30, 41, 59, 0.88), rgba(15, 23, 42, 0.78));
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.summary-ribbon p {
  margin: 0;
  color: rgba(255, 255, 255, 0.82);
  line-height: 1.55;
}

.alerts-ribbon {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.85rem;
}

.alert-card {
  padding: 0.95rem 1rem;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.6);
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  position: relative;
  overflow: hidden;
  transition: transform 0.24s ease, border-color 0.24s ease, box-shadow 0.24s ease, background 0.24s ease;
}

.alert-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top right, rgba(255, 255, 255, 0.12), transparent 36%);
  opacity: 0;
  transition: opacity 0.24s ease;
  pointer-events: none;
}

.alert-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 18px 34px rgba(2, 6, 23, 0.22);
}

.alert-card:hover::before {
  opacity: 1;
}

.alert-card__label {
  font-size: 0.74rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.62);
}

.alert-card strong {
  font-size: 0.94rem;
  line-height: 1.45;
}

.alert-card--critical {
  border-color: rgba(248, 113, 113, 0.38);
  background: linear-gradient(135deg, rgba(127, 29, 29, 0.34), rgba(15, 23, 42, 0.7));
}

.alert-card--warning {
  border-color: rgba(251, 191, 36, 0.32);
  background: linear-gradient(135deg, rgba(120, 53, 15, 0.34), rgba(15, 23, 42, 0.7));
}

.alert-card--info {
  border-color: rgba(56, 189, 248, 0.32);
  background: linear-gradient(135deg, rgba(12, 74, 110, 0.34), rgba(15, 23, 42, 0.7));
}

.alert-card--positive {
  border-color: rgba(34, 197, 94, 0.32);
  background: linear-gradient(135deg, rgba(20, 83, 45, 0.34), rgba(15, 23, 42, 0.7));
}

.tab-strip {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  padding: 0.2rem 0;
}

.tab-strip--compact {
  padding: 0;
}

.input-stack--toolbar {
  min-width: 0;
  width: 100%;
  flex: 1 1 auto;
}

.input-stack--compactbar {
  min-width: 0;
  width: 100%;
  flex: 1 1 auto;
  gap: 0.18rem;
  padding: 0.12rem;
  border-radius: 14px;
}

.input-stack--compactbar span {
  font-size: 0.64rem;
  letter-spacing: 0.1em;
}

.hero-snapshot__controls .input-stack--compactbar select {
  min-height: 46px;
  padding-top: 0.7rem;
  padding-bottom: 0.7rem;
}

.input-stack--search {
  min-width: min(320px, 100%);
  flex: 1 1 320px;
}

.ghost-pill--toolbar {
  min-height: 48px;
}

.ghost-pill--compactbar {
  grid-column: 1 / -1;
  min-height: 46px;
  padding: 0.75rem 1rem;
  justify-self: start;
  align-self: stretch;
}

.tab-btn {
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(15, 23, 42, 0.65);
  color: rgba(255, 255, 255, 0.84);
  border-radius: 999px;
  padding: 0.5rem 1rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  cursor: pointer;
  transition: transform 0.16s ease, background 0.16s ease, border-color 0.16s ease;
  position: relative;
  overflow: hidden;
}

.tab-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(251, 191, 36, 0.32);
}

.tab-btn::after {
  content: '';
  position: absolute;
  inset: auto 14px 7px;
  height: 2px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.8);
  transform: scaleX(0);
  transform-origin: center;
  transition: transform 0.18s ease;
}

.tab-btn.active {
  color: #0f172a;
  border-color: transparent;
  background: linear-gradient(120deg, #f97316, #fbbf24);
}

.tab-btn.active::after {
  transform: scaleX(1);
  background: rgba(15, 23, 42, 0.8);
}

.input-stack {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  padding: 0.35rem;
  border-radius: 18px;
  transition: background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.input-stack span {
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.62);
}
.control-summary__item .metric-card__head span:last-child {
  margin: 0;
}

.input-stack:hover {
  background: rgba(255, 255, 255, 0.03);
}

.input-stack:focus-within {
  background: rgba(255, 255, 255, 0.04);
  box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.26);
  transform: translateY(-1px);
}

.input-stack span {
  transition: color 0.18s ease, transform 0.18s ease;
}

.input-stack:focus-within span {
  color: #fde68a;
  transform: translateX(2px);
}

  .input-stack select,
  .input-stack input {
    min-width: 190px;
    border-radius: 999px;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background: rgba(15, 23, 42, 0.94);
    color: #fff;
    padding: 0.6rem 1.1rem 0.6rem 1rem;
    font-family: 'Inter', 'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial;
    font-size: 0.95rem;
    line-height: 1.2;
    letter-spacing: 0.01em;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
    transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
    outline: none;
    -webkit-appearance: none;
    appearance: none;
    background-image: linear-gradient(45deg, transparent 50%, rgba(255,255,255,0.9) 50%), linear-gradient(135deg, rgba(255,255,255,0.9) 50%, transparent 50%);
    background-position: calc(100% - 1.2rem) calc(50% - 0.05rem), calc(100% - 0.7rem) calc(50% - 0.05rem);
    background-size: 6px 6px, 6px 6px;
    background-repeat: no-repeat;
    padding-right: 2.4rem;
  }

.input-stack select:hover,
.input-stack input:hover {
  border-color: rgba(251, 191, 36, 0.32);
  transform: translateY(-1px);
}

.input-stack select:focus-visible,
.input-stack input:focus-visible,
.ghost-pill:focus-visible,
.pill:focus-visible,
.team-filter-action:focus-visible,
.tab-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.16);
}

.ghost-pill,
.pill,
.team-filter-action,
.tab-btn {
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease, background 0.18s ease, color 0.18s ease;
}

.ghost-pill:hover,
.team-filter-action:hover,
.pill:hover:not(:disabled) {
  transform: translateY(-1px);
}

.control-dock:hover,
.advanced-dock:hover {
  border-color: rgba(251, 191, 36, 0.16);
}

.pill {
  border: none;
  border-radius: 999px;
  padding: 0.8rem 1.6rem;
  font-weight: 600;
  color: #0f172a;
  background: linear-gradient(120deg, #f97316, #fbbf24);
  cursor: pointer;
  box-shadow: 0 14px 24px rgba(249, 115, 22, 0.24);
  transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
}

.pill:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 18px 30px rgba(249, 115, 22, 0.3);
}

.pill:active:not(:disabled),
.tab-btn:active,
.date-summary-card:active,
.team-card:active {
  transform: translateY(0) scale(0.99);
}

.pill:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.ghost-pill {
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 999px;
  padding: 0.8rem 1.2rem;
  background: rgba(255, 255, 255, 0.04);
  color: #fff;
  cursor: pointer;
  font-weight: 700;
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
.history-panel,
.dates-panel,
.trend-panel,
.executive-ranking {
  background: rgba(15, 23, 42, 0.55);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.executive-ranking__list {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.executive-ranking__item {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.9rem;
  align-items: center;
  padding: 0.95rem 1rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
}
.alert-card__icon {
  background: rgba(255, 255, 255, 0.08);
}

.executive-ranking__item:hover {
  transform: translateY(-3px);
  border-color: rgba(251, 191, 36, 0.18);
  box-shadow: 0 18px 30px rgba(2, 6, 23, 0.16);
}

.executive-ranking__order {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(251, 191, 36, 0.14);
  color: #fde68a;
  font-weight: 700;
}

.executive-ranking__copy {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
}

.executive-ranking__copy strong {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.executive-ranking__icon {
  color: #fde68a;
  flex: 0 0 auto;
}

.executive-ranking__copy small,
.executive-ranking__value small {
  color: rgba(255, 255, 255, 0.64);
}

.executive-ranking__value {
  text-align: right;
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
}

.overview-card {
  padding: 1.2rem 1.25rem;
  border-radius: 20px;
  background:
    radial-gradient(circle at top right, rgba(251, 191, 36, 0.12), transparent 42%),
    rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.08);
  min-height: 158px;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  box-shadow: 0 14px 30px rgba(2, 6, 23, 0.12);
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
}

.overview-card:hover {
  transform: translateY(-2px);
  border-color: rgba(251, 191, 36, 0.18);
  box-shadow: 0 18px 36px rgba(2, 6, 23, 0.16);
}

.overview-card--hero {
  grid-column: span 2;
}

.overview-card__head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.overview-card h2 {
  margin: 0.15rem 0 0;
  font-size: 1.25rem;
}

.overview-label {
  margin: 0;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.58);
}

.overview-value {
  font-size: 1.8rem;
  font-weight: 800;
  line-height: 1.1;
}

.overview-value--compact {
  font-size: 1.2rem;
}

.overview-footnote {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.92rem;
}

.overview-kicker {
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.8rem;
}

.overview-metrics {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.metric-tile {
  padding: 0.75rem 0.85rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.metric-tile span {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.58);
}

.metric-tile strong {
  font-size: 1.25rem;
}

.status-pill {
  padding: 0.35rem 0.7rem;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.status-pill--ok {
  background: rgba(34, 197, 94, 0.14);
  color: #86efac;
}

.status-pill--warn {
  background: rgba(251, 191, 36, 0.14);
  color: #fde68a;
}

.overview-card--good {
  border-color: rgba(34, 197, 94, 0.34);
}

.overview-card--critical {
  border-color: rgba(248, 113, 113, 0.34);
}

.overview-card--neutral {
  border-color: rgba(148, 163, 184, 0.24);
}

.cards-section header,
.history-panel header,
.dates-panel header,
.trend-panel header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.trend-panel__summary {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
}

.trend-panel__summary small {
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.78rem;
  letter-spacing: 0.02em;
}

.trend-panel__context {
  display: inline-block;
  margin-top: 0.55rem;
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.88rem;
  line-height: 1.45;
}

.trend-panel__headline {
  display: flex;
  align-items: center;
  gap: 3rem;
  flex-wrap: wrap;
}

.trend-panel__headline > div {
  min-width: 0;
}

.trend-panel__headline .robot-trigger {
  width: 52px;
  height: 52px;
  align-self: center;
}

.trend-panel__header-tools {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 0.6rem 0 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  margin-top: 1.1rem;
}

.chart-export-actions {
  display: inline-flex;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.chart-export-btn {
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  padding: 0.7rem 1rem;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.chart-export-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.16);
  border-color: rgba(251, 191, 36, 0.32);
  box-shadow: 0 12px 22px rgba(249, 115, 22, 0.16);
  transform: translateY(-1px);
}

.chart-export-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.chart-switcher {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  padding: 0.35rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.chart-switcher__btn {
  border: none;
  border-radius: 999px;
  padding: 0.55rem 1rem;
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.74);
  font-size: 0.84rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.chart-switcher__icon {
  flex: 0 0 auto;
}

.chart-switcher__btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.chart-switcher__btn.active {
  color: #111827;
  background: linear-gradient(120deg, #f97316, #fbbf24);
  box-shadow: 0 12px 20px rgba(249, 115, 22, 0.25);
}

.trend-chart-card {
  border-radius: 24px;
  padding: 1.3rem 1.3rem 1.4rem;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(15, 23, 42, 0.78));
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.18);
  position: relative;
}

.trend-apex {
  min-height: 280px;
}

/* ── Custom SVG Gauge ─────────────────────────────────────── */
.custom-gauge {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  padding: 0.4rem 0 0.2rem;
}

.gauge-canvas-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.gauge-canvas {
  width: 100%;
  max-width: 420px;
  display: block;
}

/* SVG text elements */
.gauge-ref {
  font-size: 11px;
  fill: rgba(255, 255, 255, 0.38);
  font-family: inherit;
}

.gauge-pct-txt {
  font-size: 40px;
  font-weight: 800;
  fill: #ffffff;
  font-family: inherit;
  letter-spacing: -0.03em;
}

.gauge-val-txt {
  font-size: 14px;
  font-weight: 500;
  fill: rgba(255, 255, 255, 0.72);
  font-family: inherit;
}

/* Needle animation */
.gauge-needle-g {
  transform-box: view-box;
  transform-origin: 200px 185px;
  transition: transform 1.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.gauge-needle-poly {
  fill: #ffffff;
  filter: drop-shadow(0 0 4px rgba(255, 255, 255, 0.6));
}

.gauge-needle-tail {
  fill: rgba(255, 255, 255, 0.32);
}

/* Hub circles */
.gauge-hub-ring {
  fill: #1e293b;
  stroke: rgba(255, 255, 255, 0.18);
  stroke-width: 1.5;
}

.gauge-hub-dot {
  fill: #ffffff;
}

/* Status badge below gauge */
.gauge-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.38rem;
  padding: 0.36rem 0.9rem;
  border-radius: 100px;
  font-size: 0.78rem;
  font-weight: 600;
  border: 1px solid transparent;
  letter-spacing: 0.02em;
}

.gauge-badge--success {
  background: rgba(52, 211, 153, 0.15);
  border-color: rgba(52, 211, 153, 0.35);
  color: #34d399;
}

.gauge-badge--good {
  background: rgba(163, 230, 53, 0.12);
  border-color: rgba(163, 230, 53, 0.3);
  color: #a3e635;
}

.gauge-badge--warning {
  background: rgba(251, 191, 36, 0.12);
  border-color: rgba(251, 191, 36, 0.32);
  color: #fbbf24;
}

.gauge-badge--danger {
  background: rgba(248, 113, 113, 0.12);
  border-color: rgba(248, 113, 113, 0.32);
  color: #f87171;
}

/* KPI row (4 cards) */
.gauge-kpi-row {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.7rem;
}

@media (max-width: 700px) {
  .gauge-kpi-row {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.gauge-kpi {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  padding: 0.85rem 0.95rem;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.04);
  transition: border-color 0.18s, background 0.18s;
}

.gauge-kpi:hover {
  border-color: rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.07);
}

.gauge-kpi__icon {
  color: rgba(255, 255, 255, 0.45);
  flex-shrink: 0;
  margin-top: 2px;
}

.gauge-kpi--positive .gauge-kpi__icon { color: #34d399; }
.gauge-kpi--negative .gauge-kpi__icon { color: #f87171; }

.gauge-kpi__body {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.gauge-kpi__label {
  font-size: 0.66rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.45);
  text-transform: uppercase;
}

.gauge-kpi__value {
  font-size: 0.92rem;
  font-weight: 700;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.gauge-kpi--positive .gauge-kpi__value { color: #34d399; }
.gauge-kpi--negative .gauge-kpi__value { color: #f87171; }

.gauge-kpi__detail {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.48);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chart-hover-card {
  position: absolute;
  top: 1rem;
  left: 1rem;
  max-width: 220px;
  padding: 0.8rem 0.9rem;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.94);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 30px rgba(2, 6, 23, 0.2);
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  pointer-events: none;
}

.chart-hover-card span {
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: rgba(255, 255, 255, 0.58);
}

.chart-hover-card small {
  color: rgba(255, 255, 255, 0.66);
}

.trend-chart {
  width: 100%;
  height: 220px;
  overflow: visible;
}

.trend-chart__line {
  fill: none;
  stroke: #fbbf24;
  stroke-width: 1.15;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.trend-chart__guide {
  stroke: rgba(255, 255, 255, 0.16);
  stroke-dasharray: 1.5 1.5;
}

.trend-chart__point {
  fill: #f8fafc;
  stroke: #f97316;
  stroke-width: 0.5;
  cursor: pointer;
  transition: transform 0.18s ease, fill 0.18s ease;
}

.trend-chart__point:hover {
  fill: #fff4d4;
}

.trend-chart__point.is-active {
  fill: #fed7aa;
  stroke: #ffffff;
  stroke-width: 1.5;
  transform: scale(1.2);
}

.trend-chart__bar {
  fill: rgba(251, 191, 36, 0.5);
  cursor: pointer;
  transition: fill 0.18s ease, transform 0.18s ease;
}

.trend-chart__bar:hover {
  fill: rgba(251, 191, 36, 0.72);
}

.trend-chart__bar.is-active {
  fill: rgba(249, 115, 22, 0.92);
}

.composition-chart {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.donut-chart {
  display: grid;
  grid-template-columns: minmax(320px, 360px) minmax(320px, 1fr);
  gap: 1.5rem;
  align-items: start;
}

.donut-chart__visual {
  display: grid;
  align-items: center;
  justify-items: center;
  position: relative;
  min-height: 360px;
  padding: 1.1rem;
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.95), rgba(15, 23, 42, 0.78));
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 18px 45px rgba(0, 0, 0, 0.18);
}

.donut-chart__visual::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(circle at 50% 40%, rgba(249, 115, 22, 0.12), transparent 55%);
  pointer-events: none;
}

.donut-chart__svg {
  width: 330px;
  height: 330px;
  overflow: visible;
}

.donut-chart__details {
  display: grid;
  gap: 1rem;
}

.donut-chart__summary {
  display: grid;
  gap: 0.85rem;
  justify-content: flex-start;
  padding: 1.35rem 1.3rem;
  border-radius: 24px;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 28px 60px rgba(0, 0, 0, 0.18);
}

.donut-chart__summary-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: baseline;
}

.donut-chart__summary-head span {
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.donut-chart__summary-head strong {
  color: #fff;
  font-size: 1.3rem;
  line-height: 1;
}

.donut-chart__summary small {
  color: rgba(255, 255, 255, 0.68);
  font-size: 0.92rem;
}

.donut-chart__summary span {
  color: rgba(255, 255, 255, 0.6);
  font-size: 0.86rem;
  line-height: 1.5;
}

.donut-chart__summary strong {
  font-size: 1.8rem;
  line-height: 1.05;
}

.donut-chart__summary small,
.donut-chart__summary span {
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.88rem;
}

.donut-chart__segment {
  cursor: pointer;
  stroke: rgba(15, 23, 42, 0.56);
  stroke-width: 2.2;
  transition: opacity 0.18s ease, stroke-width 0.18s ease, filter 0.18s ease;
}

.donut-chart__segment:hover,
.donut-chart__segment.is-active {
  opacity: 1;
  stroke: rgba(255, 255, 255, 0.72);
  stroke-width: 2.8;
  filter: drop-shadow(0 0 12px rgba(249, 115, 22, 0.15));
}

.donut-chart__segment.is-other {
  opacity: 0.85;
}

.donut-chart__core {
  position: absolute;
  top: 50%;
  left: calc(50% + 3px);
  right: auto;
  bottom: auto;
  transform: translate(-50%, -50%);
  width: 140px;
  height: 140px;
  box-sizing: border-box;
  border-radius: 50%;
  background: radial-gradient(circle at center, rgba(255, 255, 255, 0.14), rgba(15, 23, 42, 0.96) 72%);
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.08), 0 24px 50px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  padding: 0.85rem;
  text-align: center;
}

.donut-chart__core-copy {
  display: grid;
  gap: 0.12rem;
}

.donut-chart__core-copy strong {
  color: #fff;
  font-size: 1.08rem;
  line-height: 1.02;
}

.donut-chart__core-copy small,
.donut-chart__core span {
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.72rem;
  line-height: 1.3;
}

.donut-chart__core span {
  display: block;
  max-width: 100%;
}

.donut-chart__legend {
  display: grid;
  gap: 0.95rem;
}

.donut-chart__item {
  display: grid;
  gap: 0.4rem;
  align-items: center;
  grid-template-columns: auto 1fr;
  padding: 1rem 1.05rem;
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
}

.donut-chart__item:hover {
  transform: translateX(1px);
  background: rgba(255, 255, 255, 0.08);
}

.donut-chart__item.is-active {
  background: rgba(251, 191, 36, 0.12);
  border-color: rgba(251, 191, 36, 0.28);
  box-shadow: inset 0 0 0 1px rgba(251, 191, 36, 0.1);
}

.donut-chart__copy strong {
  display: block;
  font-size: 1rem;
  color: #fff;
}

.donut-chart__copy small {
  color: rgba(255, 255, 255, 0.68);
  font-size: 0.86rem;
}

.donut-chart__swatch {
  width: 14px;
  height: 14px;
  border-radius: 999px;
  flex: 0 0 14px;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.16), 0 0 0 4px rgba(15, 23, 42, 0.3);
}

.donut-chart__swatch {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex: 0 0 12px;
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.24), 0 0 0 4px rgba(15, 23, 42, 0.32);
}

.donut-chart__copy strong {
  display: block;
  font-size: 0.94rem;
}

.donut-chart__copy small {
  color: rgba(255, 255, 255, 0.66);
}

.composition-row {
  padding: 0.9rem 0.95rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.composition-row__head {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: baseline;
  flex-wrap: wrap;
}

.composition-row__head strong {
  display: block;
  font-size: 0.98rem;
}

.composition-row__head small {
  color: rgba(255, 255, 255, 0.64);
}

.composition-row__value {
  text-align: right;
}

.composition-row__bar {
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.composition-row__bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #f97316, #fbbf24);
  transition: width 0.25s ease;
}

.trend-chart__footer {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 0.5rem;
  color: rgba(255, 255, 255, 0.62);
  font-size: 0.82rem;
}

.trend-insights {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
  margin-top: 1rem;
}

.trend-insights article {
  padding: 0.85rem 0.9rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease, background 0.22s ease;
}

.trend-insights article:hover {
  transform: translateY(-3px);
  border-color: rgba(251, 191, 36, 0.18);
  box-shadow: 0 18px 30px rgba(2, 6, 23, 0.16);
}

.trend-insights span {
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.56);
}

.trend-insights strong {
  font-size: 1rem;
}

.trend-insights small,
.trend-empty p {
  color: rgba(255, 255, 255, 0.68);
}

.trend-empty {
  padding: 1rem 0;
}

.cards-total {
  font-weight: 700;
  color: #f8fafc;
  font-size: 0.96rem;
}

.performance-legend {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.8rem;
}

.legend-chip {
  padding: 0.8rem 0.9rem;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(255, 255, 255, 0.04);
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
}

.legend-chip span {
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: rgba(255, 255, 255, 0.6);
}

.legend-chip strong {
  font-size: 0.92rem;
}

.legend-chip small {
  color: rgba(255, 255, 255, 0.62);
}

.legend-chip.active {
  box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.12) inset;
}

.legend-chip--zero {
  border-color: rgba(248, 113, 113, 0.28);
}

.legend-chip--low {
  border-color: rgba(251, 191, 36, 0.28);
}

.legend-chip--mid {
  border-color: rgba(56, 189, 248, 0.28);
}

.legend-chip--high {
  border-color: rgba(34, 197, 94, 0.28);
}

.leader-spotlight {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
  padding: 1rem 1.1rem;
  border-radius: 20px;
  background:
    linear-gradient(135deg, rgba(249, 115, 22, 0.16), rgba(15, 23, 42, 0.3)),
    rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(251, 191, 36, 0.18);
  transition: transform 0.24s ease, box-shadow 0.24s ease, border-color 0.24s ease;
}

.leader-spotlight:hover {
  transform: translateY(-3px);
  box-shadow: 0 22px 36px rgba(2, 6, 23, 0.18);
  border-color: rgba(251, 191, 36, 0.28);
}

.leader-spotlight__copy {
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
}

.leader-spotlight__label {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.58);
}

.leader-spotlight__label-icon {
  color: #fde68a;
  flex: 0 0 auto;
}

.leader-spotlight__copy strong {
  font-size: 1.15rem;
}

.leader-spotlight__copy small {
  color: rgba(255, 255, 255, 0.68);
}

.leader-spotlight__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  flex: 1 1 460px;
}

.leader-spotlight__stats article {
  padding: 0.8rem 0.9rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
}

.leader-spotlight__stats article:hover {
  transform: translateY(-2px);
  border-color: rgba(251, 191, 36, 0.2);
  box-shadow: 0 14px 26px rgba(2, 6, 23, 0.16);
}

.leader-spotlight__stats span {
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.56);
}

.leader-spotlight__stats strong {
  font-size: 0.94rem;
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.date-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 0.9rem;
}

.date-summary-card {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  background: rgba(15, 23, 42, 0.72);
  color: #fff;
  padding: 1rem;
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  cursor: pointer;
  transition: transform 0.18s ease, border-color 0.18s ease, background 0.18s ease;
  position: relative;
  overflow: hidden;
}

.date-summary-card:hover {
  transform: translateY(-1px);
  border-color: rgba(251, 191, 36, 0.35);
}

.date-summary-card::after {
  content: '';
  position: absolute;
  inset: auto 0 0;
  height: 3px;
  background: linear-gradient(90deg, rgba(249, 115, 22, 0), rgba(251, 191, 36, 0.95), rgba(249, 115, 22, 0));
  transform: scaleX(0.15);
  opacity: 0;
  transition: transform 0.18s ease, opacity 0.18s ease;
}

.date-summary-card:hover::after,
.date-summary-card.active::after {
  transform: scaleX(1);
  opacity: 1;
}

.date-summary-card.active {
  border-color: rgba(251, 191, 36, 0.9);
  background: linear-gradient(180deg, rgba(249, 115, 22, 0.18), rgba(15, 23, 42, 0.9));
}

.date-summary-card__label {
  font-size: 0.82rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.62);
}

.date-summary-card strong {
  font-size: 1rem;
}

.date-summary-card small {
  color: rgba(255, 255, 255, 0.68);
}

.team-card {
  border-radius: 18px;
  padding: 1.2rem 1.2rem 1.2rem;
  background:
    linear-gradient(180deg, rgba(30, 41, 59, 0.78), rgba(15, 23, 42, 0.86)),
    rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  min-height: 260px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  overflow: hidden;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
}

.team-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 34px rgba(2, 6, 23, 0.2);
}

.team-card.active {
  border-color: rgba(251, 191, 36, 0.72);
  box-shadow: 0 18px 34px rgba(251, 191, 36, 0.16);
}

.team-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at top right, rgba(251, 191, 36, 0.14), transparent 34%);
  opacity: 0;
  transition: opacity 0.18s ease;
  pointer-events: none;
}

.team-card:hover::before {
  opacity: 1;
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

.team-card.badge-zero {
  border-color: rgba(148, 163, 184, 0.38);
  background:
    linear-gradient(180deg, rgba(51, 65, 85, 0.75), rgba(15, 23, 42, 0.9)),
    rgba(15, 23, 42, 0.7);
}

.team-card__topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.pin-button {
  border: none;
  background: transparent;
  color: #fcd34d;
  cursor: pointer;
  font-size: 1.1rem;
  width: 34px;
  height: 34px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.04);
  transition: transform 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
}

.pin-button:hover {
  transform: translateY(-1px) scale(1.02);
  background: rgba(255, 255, 255, 0.08);
  box-shadow: 0 10px 24px rgba(2, 6, 23, 0.18);
}

:global(.apexcharts-canvas) {
  font-family: inherit;
}

:global(.apexcharts-tooltip.apexcharts-theme-dark) {
  background: rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 18px 32px rgba(2, 6, 23, 0.26);
}

:global(.apexcharts-tooltip-title) {
  background: rgba(255, 255, 255, 0.04) !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
}

.team-rank {
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.16);
  color: rgba(255, 255, 255, 0.76);
  font-size: 0.72rem;
  font-weight: 700;
}

.team-card__meta {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: flex-start;
}

.team-card__identity {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.team-code {
  font-weight: 700;
  font-size: 1.05rem;
  line-height: 1.15;
}

.team-plate {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.65);
}

.team-card__tone {
  flex-shrink: 0;
  padding: 0.32rem 0.6rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.team-card__details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
  min-width: 0;
}

.team-card__details div {
  padding: 0.7rem 0.75rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 255, 255, 0.06);
  min-width: 0;
  overflow: hidden;
}

.team-card__details span {
  display: block;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(255, 255, 255, 0.56);
  margin-bottom: 0.3rem;
}

.team-card__details strong {
  font-size: 1.08rem;
  line-height: 1.15;
  display: block;
  min-width: 0;
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
  font-variant-numeric: tabular-nums;
}

.team-card__share {
  display: flex;
  align-items: baseline;
  gap: 0.45rem;
}

.team-card__share strong {
  font-size: 1.5rem;
  line-height: 1;
  letter-spacing: -0.03em;
  color: #f8fafc;
}

.team-card__share span {
  font-size: 0.88rem;
  color: rgba(255, 255, 255, 0.68);
}

.team-card__bar {
  width: 100%;
  height: 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.team-card__bar span {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #f97316, #fbbf24);
  transition: width 0.28s ease;
}

.team-card__hint {
  color: rgba(255, 255, 255, 0.54);
  font-size: 0.78rem;
}

.team-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  margin-top: auto;
  padding-top: 0.1rem;
}

.team-card__cta {
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #fde68a;
}

.team-drawer {
  padding: 1.1rem;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    radial-gradient(circle at top right, rgba(251, 191, 36, 0.12), transparent 28%),
    rgba(15, 23, 42, 0.8);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.team-drawer__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
}

.team-drawer__header h3 {
  margin: 0.15rem 0 0;
  font-size: 1.25rem;
}

.team-drawer__subtitle {
  margin: 0.45rem 0 0;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.5;
}

.team-drawer__close {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  padding: 0.55rem 0.9rem;
  background: rgba(255, 255, 255, 0.04);
  color: #fff;
  cursor: pointer;
}

.team-drawer__grid,
.team-drawer__footer {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.8rem;
}

.team-drawer__grid article,
.team-drawer__footer article {
  padding: 0.85rem 0.9rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.team-drawer__grid span,
.team-drawer__footer span {
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: rgba(255, 255, 255, 0.58);
}
.team-drawer__metric-head span:last-child,
.alert-card__head span:last-child,
.metric-card__head span:last-child {
  min-width: 0;
}

.team-drawer__grid small,
.team-drawer__footer small {
  color: rgba(255, 255, 255, 0.64);
}

.team-drawer__chart {
  padding: 0.85rem 0.9rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.panel-appear {
  animation: none;
}

.panel-appear--1 { animation-delay: 0.04s; }
.panel-appear--2 { animation-delay: 0.09s; }
.panel-appear--3 { animation-delay: 0.14s; }
.panel-appear--4 { animation-delay: 0.19s; }
.panel-appear--5 { animation-delay: 0.24s; }

.content-fade-enter-active,
.content-fade-leave-active {
  transition: none;
}

.content-fade-enter-from,
.content-fade-leave-to {
  opacity: 1;
  transform: none;
}

@keyframes panelRise {
  from {
    opacity: 0;
    transform: translateY(18px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
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

.history-toolbar {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  flex-wrap: wrap;
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

.value-cell.badge-zero {
  color: #94a3b8;
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
  .producao-hero {
    grid-template-columns: 1fr;
    padding: 1.2rem;
  }
  .hero-toolbar__group,
  .hero-switch-panel {
    width: 100%;
  }
  .hero-copy {
    max-width: none;
    padding-right: 0;
  }
  .hero-focus {
    justify-self: stretch;
  }
  .producao-hero h1 {
    max-width: none;
  }
  .hero-robot-dock {
    flex-direction: column;
    align-items: stretch;
  }
  .hero-switch-panel {
    grid-template-columns: 1fr;
    min-width: 0;
  }
  .robot-bubble {
    max-width: none;
  }
  .robot-trigger {
    align-self: flex-start;
  }
  .trend-robot-anchor {
    top: auto;
    right: 0.75rem;
    bottom: 5.25rem;
  }
  .robot-assistant-dock {
    position: fixed;
    grid-template-columns: 1fr;
    left: 0.75rem;
    right: 0.75rem;
    bottom: 0.75rem;
    width: auto;
    max-height: 78vh;
    top: auto !important;
  }
  .robot-assistant-figure {
    min-height: 170px;
    padding-top: 1.6rem;
  }
  .robot-full {
    width: 92px;
    height: 198px;
    transform: scale(0.92);
    transform-origin: bottom center;
  }
  .robot-chat-shell {
    min-height: 0;
    max-height: 52vh;
  }
  .robot-chat-shell__header {
    flex-direction: column;
  }
  .robot-chat-shell__actions {
    width: 100%;
  }
  .robot-chat-input {
    flex-direction: column;
  }
  .robot-control-panel__grid {
    grid-template-columns: 1fr;
  }
  .robot-control-panel__actions {
    flex-direction: column;
  }
  .hero-command-grid {
    grid-template-columns: 1fr;
  }
  .tab-strip--base,
  .tab-strip--category {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .hero-command-panel__head {
    flex-direction: column;
    align-items: flex-start;
  }
  .hero-command-panel__controls {
    grid-template-columns: 1fr;
  }
  .hero-snapshot {
    grid-template-columns: 1fr;
  }
  .ghost-pill--compactbar {
    width: 100%;
    align-self: stretch;
  }
  .control-dock,
  .control-summary-dock {
    grid-template-columns: 1fr;
    padding: 0.95rem;
  }
  .advanced-dock {
    padding: 0.95rem;
  }
  .header-actions {
    flex-direction: column;
    align-items: stretch;
  }
  .input-stack--toolbar,
  .input-stack--search {
    min-width: 0;
    width: 100%;
  }
  .control-summary {
    width: 100%;
    grid-template-columns: 1fr;
  }
  .team-filter-panel__header {
    flex-direction: column;
    align-items: stretch;
  }
  .team-filter-panel__actions {
    width: 100%;
  }
  .team-filter-action {
    flex: 1 1 0;
  }
  .team-filter-panel__grid {
    grid-template-columns: 1fr;
  }
  .trend-panel__header-tools {
    width: 100%;
    justify-content: stretch;
  }
  .chart-switcher {
    width: 100%;
    justify-content: space-between;
  }
  .chart-export-actions {
    width: 100%;
  }
  .chart-export-btn {
    flex: 1 1 0;
  }
  .trend-panel__summary {
    align-items: flex-start;
  }
  .donut-chart {
    grid-template-columns: 1fr;
  }
  .leader-spotlight__stats {
    grid-template-columns: 1fr;
  }
  .executive-ranking__item {
    grid-template-columns: 1fr;
  }
  .executive-ranking__value {
    text-align: left;
  }
  .team-drawer__grid,
  .team-drawer__footer {
    grid-template-columns: 1fr;
  }
  .team-card__details {
    grid-template-columns: 1fr;
  }
  .trend-insights {
    grid-template-columns: 1fr;
  }
  .history-toolbar {
    width: 100%;
    justify-content: space-between;
  }
  .history-panel table {
    font-size: 0.8rem;
  }
}

:global(html:not(.dark-theme)) .producao-shell {
  color: var(--text);
}

:global(html:not(.dark-theme)) .producao-shell::before {
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.10), transparent 32%),
    radial-gradient(circle at top right, rgba(6, 182, 212, 0.08), transparent 36%);
}

:global(html:not(.dark-theme)) .producao-hero,
:global(html:not(.dark-theme)) .hero-focus,
:global(html:not(.dark-theme)) .control-dock,
:global(html:not(.dark-theme)) .advanced-dock,
:global(html:not(.dark-theme)) .summary-ribbon,
:global(html:not(.dark-theme)) .cards-section,
:global(html:not(.dark-theme)) .history-panel,
:global(html:not(.dark-theme)) .dates-panel,
:global(html:not(.dark-theme)) .trend-panel,
:global(html:not(.dark-theme)) .executive-ranking,
:global(html:not(.dark-theme)) .team-drawer,
:global(html:not(.dark-theme)) .state-panel,
:global(html:not(.dark-theme)) .leader-spotlight,
:global(html:not(.dark-theme)) .team-filter-panel,
:global(html:not(.dark-theme)) .chart-hover-card {
  background: var(--surface-1);
  border-color: var(--border-soft);
  color: var(--text);
  box-shadow: var(--shadow-soft);
}

:global(html:not(.dark-theme)) .hero-badge,
:global(html:not(.dark-theme)) .hero-snapshot__card,
:global(html:not(.dark-theme)) .hero-focus__grid article,
:global(html:not(.dark-theme)) .control-summary__item,
:global(html:not(.dark-theme)) .alert-card,
:global(html:not(.dark-theme)) .team-filter-option,
:global(html:not(.dark-theme)) .executive-ranking__item,
:global(html:not(.dark-theme)) .overview-card,
:global(html:not(.dark-theme)) .metric-tile,
:global(html:not(.dark-theme)) .trend-insights article,
:global(html:not(.dark-theme)) .donut-chart__item,
:global(html:not(.dark-theme)) .composition-row,
:global(html:not(.dark-theme)) .date-summary-card,
:global(html:not(.dark-theme)) .team-card,
:global(html:not(.dark-theme)) .team-card__details div,
:global(html:not(.dark-theme)) .team-drawer__grid article,
:global(html:not(.dark-theme)) .team-drawer__footer article {
  background: var(--surface-2);
  border-color: var(--border-soft);
  color: var(--text);
}

:global(html:not(.dark-theme)) .eyebrow,
:global(html:not(.dark-theme)) .subline,
:global(html:not(.dark-theme)) .hero-focus__eyebrow,
:global(html:not(.dark-theme)) .hero-focus__headline span,
:global(html:not(.dark-theme)) .hero-snapshot__card span,
:global(html:not(.dark-theme)) .hero-snapshot__card small,
:global(html:not(.dark-theme)) .hero-focus__grid span,
:global(html:not(.dark-theme)) .hero-focus__grid small,
:global(html:not(.dark-theme)) .control-summary__item span,
:global(html:not(.dark-theme)) .overview-label,
:global(html:not(.dark-theme)) .overview-footnote,
:global(html:not(.dark-theme)) .overview-kicker,
:global(html:not(.dark-theme)) .metric-tile span,
:global(html:not(.dark-theme)) .team-card__hint,
:global(html:not(.dark-theme)) .team-card__share span,
:global(html:not(.dark-theme)) .team-plate,
:global(html:not(.dark-theme)) .donut-chart__copy small,
:global(html:not(.dark-theme)) .composition-row__head small,
:global(html:not(.dark-theme)) .trend-chart__footer,
:global(html:not(.dark-theme)) .trend-insights span,
:global(html:not(.dark-theme)) .trend-insights small,
:global(html:not(.dark-theme)) .alert-card__label,
:global(html:not(.dark-theme)) .legend-chip span,
:global(html:not(.dark-theme)) .legend-chip small,
:global(html:not(.dark-theme)) .team-filter-panel__header span,
:global(html:not(.dark-theme)) .team-filter-option small,
:global(html:not(.dark-theme)) .input-stack,
:global(html:not(.dark-theme)) .empty-state-label,
:global(html:not(.dark-theme)) .trend-empty p {
  color: var(--text-soft);
}

:global(html:not(.dark-theme)) .producao-hero h1,
:global(html:not(.dark-theme)) .hero-focus__headline strong,
:global(html:not(.dark-theme)) .control-summary__item strong,
:global(html:not(.dark-theme)) .overview-value,
:global(html:not(.dark-theme)) .team-code,
:global(html:not(.dark-theme)) .team-card__details strong,
:global(html:not(.dark-theme)) .team-card__share strong,
:global(html:not(.dark-theme)) .cards-total,
:global(html:not(.dark-theme)) .donut-chart__core strong,
:global(html:not(.dark-theme)) .donut-chart__copy strong,
:global(html:not(.dark-theme)) .composition-row__head strong,
:global(html:not(.dark-theme)) .trend-insights strong,
:global(html:not(.dark-theme)) .leader-spotlight__stats strong,
:global(html:not(.dark-theme)) .executive-ranking__copy strong,
:global(html:not(.dark-theme)) .executive-ranking__value strong {
  color: var(--text);
}

:global(html:not(.dark-theme)) .tab-btn,
:global(html:not(.dark-theme)) .ghost-pill,
:global(html:not(.dark-theme)) .team-filter-action {
  background: var(--surface-2);
  color: var(--text);
  border-color: var(--border-soft);
}

:global(html:not(.dark-theme)) .tab-btn.active,
:global(html:not(.dark-theme)) .pill,
:global(html:not(.dark-theme)) .chart-export-btn.active {
  color: var(--primary-contrast);
}

:global(html:not(.dark-theme)) .input-stack select,
:global(html:not(.dark-theme)) .input-stack input {
  background: #ffffff;
  color: var(--text);
  border-color: var(--border-soft);
  box-shadow: inset 0 1px 0 rgba(15, 23, 42, 0.04);
}

:global(html:not(.dark-theme)) .input-stack select {
  background: #ffffff;
  color: var(--text);
  border-color: var(--border-soft);
  box-shadow: inset 0 1px 0 rgba(15, 23, 42, 0.04);
  -webkit-appearance: none;
  appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, rgba(15,23,42,0.85) 50%), linear-gradient(135deg, rgba(15,23,42,0.85) 50%, transparent 50%);
  background-position: calc(100% - 1.2rem) calc(50% - 0.05rem), calc(100% - 0.7rem) calc(50% - 0.05rem);
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;
  padding-right: 2.4rem;
}

:global(html:not(.dark-theme)) .producao-hero {
  background:
    radial-gradient(circle at top left, rgba(37, 99, 235, 0.14), transparent 30%),
    radial-gradient(circle at top right, rgba(6, 182, 212, 0.12), transparent 28%),
    linear-gradient(180deg, #ffffff, #f8fafc);
  border-color: rgba(15, 23, 42, 0.08);
  box-shadow: 0 16px 34px rgba(15, 23, 42, 0.08);
}

:global(html:not(.dark-theme)) .producao-hero::before {
  background:
    radial-gradient(circle at 18% 20%, rgba(37, 99, 235, 0.08), transparent 0 28%),
    radial-gradient(circle at 72% 18%, rgba(6, 182, 212, 0.06), transparent 0 24%);
  z-index: -1;
}

:global(html:not(.dark-theme)) .hero-focus {
  position: relative;
  z-index: 2;
  background:
    radial-gradient(circle at top right, rgba(37, 99, 235, 0.08), transparent 34%),
    linear-gradient(180deg, #ffffff, #f8fafc);
  border-color: rgba(15, 23, 42, 0.08);
}

:global(html:not(.dark-theme)) .hero-snapshot__card,
:global(html:not(.dark-theme)) .hero-focus__grid article,
:global(html:not(.dark-theme)) .control-summary__item {
  background: #ffffff;
  border-color: var(--border-soft);
}

:global(html:not(.dark-theme)) .hero-badge {
  background: rgba(37, 99, 235, 0.08);
  border-color: rgba(37, 99, 235, 0.12);
  color: var(--text);
}

:global(html:not(.dark-theme)) .state-panel.error {
  border-color: rgba(220, 38, 38, 0.22);
}

:global(html:not(.dark-theme)) .loader {
  border-color: rgba(15, 23, 42, 0.12);
  border-top-color: var(--primary-1);
}

:global(html:not(.dark-theme)) .donut-chart__core {
  background: #ffffff;
  border-color: var(--border-soft);
}

:global(html:not(.dark-theme)) .donut-chart__segment {
  stroke: rgba(255, 255, 255, 0.95);
}

:global(html:not(.dark-theme)) .team-card__bar,
:global(html:not(.dark-theme)) .composition-row__bar {
  background: rgba(15, 23, 42, 0.08);
}

/* ── Performance band strip ── */
.perf-band-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr) 2fr;
  gap: 0.6rem;
  padding: 0.9rem 1.1rem;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(148, 163, 184, 0.12);
  border-radius: 16px;
  align-items: center;
  margin-bottom: 0.25rem;
}
.perf-band-strip__item {
  display: grid;
  gap: 0.2rem;
  text-align: center;
}
.perf-band-strip__label {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  opacity: 0.7;
}
.perf-band-strip__item strong {
  font-size: 1.5rem;
  line-height: 1;
}
.perf-band-strip__item small {
  font-size: 0.75rem;
  opacity: 0.65;
}
.perf-band-strip__item--zero strong { color: #64748b; }
.perf-band-strip__item--low  strong { color: #fb923c; }
.perf-band-strip__item--mid  strong { color: #fbbf24; }
.perf-band-strip__item--high strong { color: #34d399; }
.perf-band-strip__bar {
  display: flex;
  height: 8px;
  border-radius: 999px;
  overflow: hidden;
  gap: 2px;
}
.perf-band-strip__bar-seg {
  transition: width 0.5s ease;
  border-radius: 999px;
  min-width: 0;
}
.perf-band-strip__bar-seg--zero { background: #334155; }
.perf-band-strip__bar-seg--low  { background: #fb923c; }
.perf-band-strip__bar-seg--mid  { background: #fbbf24; }
.perf-band-strip__bar-seg--high { background: #34d399; }

/* ── Heatmap chart ── */
.trend-apex--heatmap {
  overflow: auto;
}

/* ── Target chart ── */
.target-chart-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.target-chart-legend {
  display: flex;
  gap: 1.5rem;
  padding: 0 0.5rem;
  align-items: center;
}
.target-chart-legend__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.84rem;
  color: rgba(203, 213, 225, 0.85);
}
.target-chart-legend__dot {
  width: 12px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}
.target-chart-legend__line {
  width: 20px;
  height: 0;
  border-top: 2px dashed;
  flex-shrink: 0;
}
.chart-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 2rem;
  color: rgba(148, 163, 184, 0.7);
  text-align: center;
}

@media (max-width: 640px) {
  .perf-band-strip {
    grid-template-columns: repeat(2, 1fr);
  }
  .perf-band-strip__bar {
    grid-column: 1 / -1;
  }
}
</style>
