<template>
  <section class="producao-shell">
    <header class="producao-hero">
      <div class="hero-copy">
        <p class="eyebrow">Centro de produção · {{ activeSheetLabel }}</p>
        <h1>Resumo executivo da produção</h1>
        <p class="subline">
          {{ executiveStatusLabel }} · Origem {{ originLabel }} · Atualizado {{ lastUpdatedLabel || 'há instantes' }}
        </p>
        <div class="hero-badges">
          <span class="hero-badge hero-badge--strong">{{ rankingMode === 'period' ? 'Período completo' : 'Data selecionada' }}</span>
          <span class="hero-badge">Janela {{ importDateRangeLabel }}</span>
          <span class="hero-badge hero-badge--soft">{{ activeSheetLabel }}</span>
        </div>
        <div class="hero-snapshot">
          <article v-for="item in heroSnapshotItems" :key="item.label" class="hero-snapshot__card">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
            <small>{{ item.detail }}</small>
          </article>
        </div>
      </div>
      <aside class="hero-focus">
        <p class="hero-focus__eyebrow">Painel executivo</p>
        <div class="hero-focus__headline">
          <strong>{{ formatCurrency(selectedDateTotal) }}</strong>
          <span>Realizado {{ activeDateCount > 1 ? 'no período' : 'na data selecionada' }}</span>
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
        </div>
      </aside>
    </header>

    <section class="control-dock">
      <div class="header-actions">
        <label class="input-stack">
          <span>Visão</span>
          <select v-model="rankingMode">
            <option value="period">Período completo</option>
            <option value="date">Data selecionada</option>
          </select>
        </label>
        <label class="input-stack">
          <span>Data</span>
          <select v-model="selectedDateKey" @change="handleDateChange" :disabled="!availableDates.length">
            <option v-for="date in dateFilterOptions" :key="date.key" :value="date.key">
              {{ date.label }}
            </option>
          </select>
        </label>
        <button type="button" class="ghost-pill" @click="showAdvanced = !showAdvanced">
          {{ detailToggleLabel }}
        </button>
      </div>
      <div class="control-summary">
        <div class="control-summary__item">
          <span>Realizado</span>
          <strong>{{ formatCurrency(selectedDateTotal) }}</strong>
        </div>
        <div class="control-summary__item">
          <span>Meta</span>
          <strong>{{ formatCurrency(dailyReferenceTarget) }}</strong>
        </div>
        <div class="control-summary__item">
          <span>Desvio</span>
          <strong>{{ executiveDeltaLabel }}</strong>
        </div>
      </div>
    </section>

    <section v-if="showAdvanced" class="advanced-dock panel-appear panel-appear--1">
      <div class="header-actions">
        <label class="input-stack">
          <span>Buscar equipe</span>
          <input v-model.trim="searchQuery" type="text" placeholder="Prefixo, placa ou colaborador" />
        </label>
        <label class="input-stack">
          <span>Faixa</span>
          <select v-model="performanceFilter">
            <option v-for="option in performanceFilterOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
        </label>
        <button type="button" class="pill" @click="syncFromDropbox" :disabled="loading || syncing">
          <span v-if="syncing">Sincronizando...</span>
          <span v-else>Sincronizar com Dropbox</span>
        </button>
        <button type="button" class="ghost-pill" @click="showTeamFilter = !showTeamFilter">
          {{ showTeamFilter ? 'Ocultar equipes' : 'Filtrar equipes' }}
        </button>
      </div>
      <div v-if="showTeamFilter" class="team-filter-panel">
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

    <section class="summary-ribbon panel-appear panel-appear--1">
      <p>{{ narrativeSummary }}</p>
    </section>

    <section v-if="operationalAlerts.length" class="alerts-ribbon panel-appear panel-appear--1">
      <article v-for="alert in operationalAlerts" :key="alert.id" :class="['alert-card', `alert-card--${alert.tone}`]">
        <span class="alert-card__label">{{ alert.title }}</span>
        <strong>{{ alert.text }}</strong>
      </article>
    </section>

    <nav class="tab-strip" aria-label="Categorias de produção">
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
      <transition name="content-fade" mode="out-in" appear>
        <div :key="contentTransitionKey" class="panel-stack">
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
              <strong>{{ team.display }}</strong>
              <small>{{ team.plate || 'Sem placa' }} · {{ performanceLabelForBand(teamPerformanceBand(team)) }}</small>
            </div>
            <div class="executive-ranking__value">
              <strong>{{ formatCurrency(teamSortValue(team)) }}</strong>
              <small>{{ teamShareLabel(team) }}</small>
            </div>
          </article>
        </div>
      </section>

      <section class="trend-panel panel-appear panel-appear--2">
        <header>
          <div>
            <h2>{{ chartPanelTitle }}</h2>
            <p>{{ chartPanelDescription }}</p>
          </div>
          <div class="trend-panel__header-tools">
            <div v-if="showAdvanced" class="chart-switcher" role="tablist" aria-label="Tipos de gráfico">
              <button
                v-for="option in chartTypeOptions"
                :key="option.value"
                type="button"
                class="chart-switcher__btn"
                :class="{ active: chartType === option.value }"
                @click="chartType = option.value"
              >
                {{ option.label }}
              </button>
            </div>
            <div v-if="showAdvanced" class="chart-export-actions">
              <button type="button" class="chart-export-btn" @click="exportChartAsImage" :disabled="!!exportState || !hasActiveChart">
                {{ exportState === 'image' ? 'Gerando imagem...' : 'Imagem' }}
              </button>
              <button type="button" class="chart-export-btn" @click="exportChartAsPdf" :disabled="!!exportState || !hasActiveChart">
                {{ exportState === 'pdf' ? 'Gerando PDF...' : 'PDF' }}
              </button>
            </div>
            <div class="trend-panel__summary">
              <span>{{ trendSummaryLabel }}</span>
              <strong>{{ trendSummaryValue }}</strong>
            </div>
          </div>
        </header>
        <div v-if="hasActiveChart" ref="chartExportSurface" class="trend-chart-card">
          <svg v-if="chartType === 'line' || chartType === 'area'" viewBox="0 0 100 42" class="trend-chart" role="img" aria-label="Gráfico de evolução por data" @mouseleave="clearChartHover">
            <defs>
              <linearGradient id="trendArea" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stop-color="rgba(251, 191, 36, 0.36)" />
                <stop offset="100%" stop-color="rgba(251, 191, 36, 0.02)" />
              </linearGradient>
            </defs>
            <path v-if="chartType === 'area'" :d="trendChart.areaPath" fill="url(#trendArea)" />
            <path :d="trendChart.path" class="trend-chart__line" />
            <line
              v-if="trendChart.selectedPoint"
              :x1="trendChart.selectedPoint.x"
              :x2="trendChart.selectedPoint.x"
              y1="4"
              y2="36"
              class="trend-chart__guide"
            />
            <g v-for="point in trendChart.points" :key="point.key">
              <circle
                :cx="point.x"
                :cy="point.y"
                :r="point.key === selectedDateKey ? 1.9 : 1.3"
                :class="['trend-chart__point', { 'is-active': point.key === selectedDateKey }]"
                @mouseenter="setChartHover({ context: 'trend', label: point.label, value: formatCurrency(point.total), detail: `${point.activeTeams} equipes com lançamento` })"
                @click="selectSummaryDate(point.key)"
              >
                <title>{{ point.label }} · {{ formatCurrency(point.total) }}</title>
              </circle>
            </g>
          </svg>
          <svg v-else-if="chartType === 'bar'" viewBox="0 0 100 42" class="trend-chart" role="img" aria-label="Gráfico de barras por data" @mouseleave="clearChartHover">
            <g v-for="bar in barChart.bars" :key="bar.key">
              <rect
                :x="bar.x"
                :y="bar.y"
                :width="bar.width"
                :height="bar.height"
                rx="1.2"
                class="trend-chart__bar"
                :class="{ 'is-active': bar.isActive }"
                @mouseenter="setChartHover({ context: 'bar', label: bar.label, value: formatCurrency(bar.total), detail: 'Clique para focar a data' })"
                @click="selectSummaryDate(bar.key)"
              >
                <title>{{ bar.label }} · {{ formatCurrency(bar.total) }}</title>
              </rect>
            </g>
          </svg>
          <div v-else-if="chartType === 'donut'" class="donut-chart">
            <div class="donut-chart__visual">
              <svg viewBox="0 0 100 100" class="donut-chart__svg" role="img" aria-label="Rosca de participação das equipes" @mouseleave="clearChartHover">
                <path
                  v-for="segment in donutChart.segments"
                  :key="segment.code"
                  :d="segment.path"
                  :fill="segment.color"
                  class="donut-chart__segment"
                  :class="{ 'is-other': segment.isOther }"
                  @mouseenter="setChartHover({ context: 'donut', label: segment.display, value: segment.valueLabel, detail: `${segment.percentOfTotal.toFixed(1).replace('.', ',')}% do total` })"
                >
                  <title>{{ segment.display }} · {{ segment.valueLabel }} · {{ segment.percentOfTotal.toFixed(1).replace('.', ',') }}%</title>
                </path>
              </svg>
                <div class="donut-chart__core">
                  <strong>{{ donutCenterValue }}</strong>
                  <small>{{ donutCenterLabel }}</small>
                  <span>{{ donutCenterDetail }}</span>
                </div>
            </div>
            <div class="donut-chart__legend">
              <article v-for="row in donutChart.rows" :key="row.code" class="donut-chart__item" @mouseenter="setChartHover({ context: 'donut', label: row.display, value: row.valueLabel, detail: `${row.percentOfTotal.toFixed(1).replace('.', ',')}% do total` })" @mouseleave="clearChartHover">
                <span class="donut-chart__swatch" :style="{ backgroundColor: row.color }"></span>
                <div class="donut-chart__copy">
                  <strong>{{ row.display }}</strong>
                  <small>{{ row.valueLabel }} · {{ row.percentOfTotal.toFixed(1).replace('.', ',') }}%</small>
                </div>
              </article>
            </div>
          </div>
          <div v-else class="composition-chart">
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
          <div v-if="chartHover" class="chart-hover-card">
            <span>{{ chartHover.label }}</span>
            <strong>{{ chartHover.value }}</strong>
            <small>{{ chartHover.detail }}</small>
          </div>
          <div class="trend-chart__footer" v-if="chartType !== 'composition'">
            <span>{{ trendChart.firstLabel }}</span>
            <span>{{ trendChart.lastLabel }}</span>
          </div>
          <div class="trend-insights">
            <article v-if="chartType === 'composition' || chartType === 'donut'">
              <span>Equipe líder</span>
              <strong>{{ compositionChart.leaderLabel }}</strong>
              <small>{{ compositionChart.leaderValue }}</small>
            </article>
            <article v-else>
              <span>Data em foco</span>
              <strong>{{ chartType === 'bar' ? barChart.selectedLabel : trendChart.selectedLabel }}</strong>
              <small>{{ chartType === 'bar' ? barChart.selectedValue : trendChart.selectedValue }}</small>
            </article>
            <article>
              <span>{{ chartType === 'composition' || chartType === 'donut' ? 'Recorte total' : 'Melhor dia' }}</span>
              <strong>{{ chartType === 'composition' || chartType === 'donut' ? compositionChart.total : chartType === 'bar' ? barChart.maxLabel : trendChart.bestLabel }}</strong>
              <small>{{ chartType === 'composition' || chartType === 'donut' ? `${compositionChart.rows.length} equipes comparadas` : chartType === 'bar' ? barChart.maxValue : trendChart.bestValue }}</small>
            </article>
            <article>
              <span>{{ chartType === 'composition' || chartType === 'donut' ? 'Modo de leitura' : 'Média diária' }}</span>
              <strong>{{ chartType === 'composition' || chartType === 'donut' ? cardsPrimaryMetricLabel : trendChart.averageValue }}</strong>
              <small>{{ chartType === 'composition' || chartType === 'donut' ? `${compositionChart.rows.length} equipes líderes` : `${trendChart.points.length} datas no período` }}</small>
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
        <div v-if="leadingTeam" class="leader-spotlight">
          <div class="leader-spotlight__copy">
            <span class="leader-spotlight__label">Equipe em destaque</span>
            <strong>{{ leadingTeam.display }}</strong>
            <small>{{ leadingTeam.plate || 'Sem placa' }} · {{ leadingTeam.type || 'Sem categoria' }}</small>
          </div>
          <div class="leader-spotlight__stats">
            <article>
              <span>{{ cardsPrimaryMetricLabel }}</span>
              <strong>{{ formatCurrency(teamSortValue(leadingTeam)) }}</strong>
            </article>
            <article>
              <span>{{ cardsSecondaryMetricLabel }}</span>
              <strong>{{ formatCurrency(cardsSecondaryMetricValue(leadingTeam)) }}</strong>
            </article>
            <article>
              <span>Participação</span>
              <strong>{{ teamShareLabel(leadingTeam) }}</strong>
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
            <span class="team-rank">#{{ index + 1 }}</span>
            <button
              class="pin-button"
              :aria-pressed="isPinned(team.code)"
              @click.stop="togglePin(team.code)"
              title="Fixar equipe"
            >
              <i :class="isPinned(team.code) ? 'bi bi-star-fill' : 'bi bi-star'" aria-hidden="true"></i>
            </button>
            <div class="team-card__meta">
              <span class="team-code">{{ team.display }}</span>
              <span class="team-plate">{{ team.plate || '—' }}</span>
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
            <div class="team-card__value">
              {{ teamShareLabel(team) }}
            </div>
            <div class="team-card__bar">
              <span :style="{ width: `${teamSharePercent(team)}%` }"></span>
            </div>
            <small class="team-card__hint">Clique para abrir o detalhe da equipe</small>
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
            <article>
              <span>{{ cardsPrimaryMetricLabel }}</span>
              <strong>{{ formatCurrency(teamSortValue(selectedTeam)) }}</strong>
              <small>{{ performanceLabelForBand(teamPerformanceBand(selectedTeam)) }}</small>
            </article>
            <article>
              <span>Acumulado</span>
              <strong>{{ formatCurrency(teamTotal(selectedTeam)) }}</strong>
              <small>{{ selectedTeam.plate || 'Sem placa' }}</small>
            </article>
            <article>
              <span>Meta diária</span>
              <strong>{{ formatCurrency(teamDailyTarget(selectedTeam)) }}</strong>
              <small>Planejada para a equipe</small>
            </article>
            <article>
              <span>Melhor dia</span>
              <strong>{{ selectedTeamBestDay ? selectedTeamBestDay.label : '—' }}</strong>
              <small>{{ selectedTeamBestDay ? formatCurrency(selectedTeamBestDay.total) : 'Sem lançamento' }}</small>
            </article>
            <article>
              <span>Média ativa</span>
              <strong>{{ formatCurrency(selectedTeamAverageActive) }}</strong>
              <small>{{ selectedTeam.sourceSheets?.join(' + ') || selectedTeam.type || 'Sem origem' }}</small>
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
                  :r="point.key === selectedDateKey ? 1.9 : 1.2"
                  :class="['trend-chart__point', { 'is-active': point.key === selectedDateKey }]"
                />
              </g>
            </svg>
          </div>
          <div class="team-drawer__footer">
            <article>
              <span>Participação</span>
              <strong>{{ selectedTeamShareOfView.toFixed(1).replace('.', ',') }}%</strong>
              <small>Na leitura atual</small>
            </article>
            <article>
              <span>Pior dia</span>
              <strong>{{ selectedTeamWorstDay ? selectedTeamWorstDay.label : '—' }}</strong>
              <small>{{ selectedTeamWorstDay ? formatCurrency(selectedTeamWorstDay.total) : 'Sem dados' }}</small>
            </article>
            <article>
              <span>Últimos lançamentos</span>
              <strong>{{ selectedTeamRecentRows[0] ? selectedTeamRecentRows[0].label : '—' }}</strong>
              <small>{{ selectedTeamRecentRows[0] ? formatCurrency(selectedTeamRecentRows[0].total) : 'Sem dados' }}</small>
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
      </transition>
    </template>
  </section>
</template>

<script>
import HistoryTable from './HistoryTable.vue';
const PIN_STORAGE_KEY = 'producao_pinned_teams_v1';
const LAST_DATE_STORAGE_KEY = 'producao_last_date_key_v1';
const CHART_TYPE_STORAGE_KEY = 'producao_chart_type_v1';
const ALL_DATES_KEY = '__ALL_DATES__';
const DEFAULT_TEAM_DAILY_TARGET = 9752.47;
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

const DONUT_COLORS = ['#f97316', '#fbbf24', '#38bdf8', '#34d399', '#c084fc', '#fb7185'];

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
    HistoryTable,
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
      loading: true,
      syncing: false,
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
      lastDateKey: this.loadLastDateKey(),
      historyWindowStart: 0,
      historyWindowSize: 8,
    };
  },
  computed: {
    activeSheetLabel() {
      return this.activeTab === 'GERAL' ? 'OBRAS + EME + CUSTEIO' : this.activeTab;
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
    sourceSheetLabels() {
      const summarySheets = Array.isArray(this.importSummary.sourceSheets) ? this.importSummary.sourceSheets : [];
      if (summarySheets.length) return summarySheets;
      if (this.activeTab === 'GERAL') return ['OBRAS', 'EME', 'CUSTEIO'];
      return this.activeTab ? [this.activeTab] : [];
    },
    chartTypeOptions() {
      return [
        { value: 'line', label: 'Linha' },
        { value: 'area', label: 'Área' },
        { value: 'bar', label: 'Barras' },
        { value: 'composition', label: 'Composição' },
        { value: 'donut', label: 'Rosca' },
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
    activeDateCount() {
      if (this.isAllDatesSelected) return Math.max(this.availableDates.length, 1);
      return 1;
    },
    targetScopeLabel() {
      return this.activeDateCount > 1 ? 'Meta planejada do período' : 'Meta planejada do dia';
    },
    topDailySummary() {
      return this.dateSummaries.reduce((top, current) => {
        if (!top) return current;
        return current.total > top.total ? current : top;
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
      const dailyTarget = this.tabFilteredTeams.reduce((sum, team) => sum + this.teamDailyTarget(team), 0);
      return dailyTarget * this.activeDateCount;
    },
    dailyTargetDelta() {
      return this.selectedDateTotal - this.dailyReferenceTarget;
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
      if (!this.tabFilteredTeams.length) return 'Meta indisponível';
      if (this.dailyTargetTone === 'good') return `Acima da ${this.targetScopeLabel.toLowerCase()}`;
      if (this.dailyTargetTone === 'critical') return `Abaixo da ${this.targetScopeLabel.toLowerCase()}`;
      return `Em linha com a ${this.targetScopeLabel.toLowerCase()}`;
    },
    dailyTargetSupportLabel() {
      if (!this.tabFilteredTeams.length) return 'Sem base suficiente para comparação';
      const direction = this.dailyTargetDelta >= 0 ? '+' : '−';
      return `${direction}${this.formatCurrency(Math.abs(this.dailyTargetDelta))} vs ${this.targetScopeLabel.toLowerCase()}`;
    },
    executiveDeltaLabel() {
      const prefix = this.dailyTargetDelta >= 0 ? '+' : '−';
      return `${prefix}${this.formatCurrency(Math.abs(this.dailyTargetDelta))}`;
    },
    executiveStatusLabel() {
      if (!this.tabFilteredTeams.length) return 'Sem leitura';
      if (this.dailyTargetTone === 'good') return 'Resultado acima da meta';
      if (this.dailyTargetTone === 'critical') return 'Resultado abaixo da meta';
      return 'Resultado em linha';
    },
    heroSnapshotItems() {
      return [
        {
          label: 'Recorte',
          value: this.selectedDateContextLabel,
          detail: this.isAllDatesSelected ? `${this.availableDates.length} datas no intervalo` : (this.selectedDateSummary ? this.formatCurrency(this.selectedDateSummary.total) : '—'),
        },
        {
          label: 'Equipes exibidas',
          value: String(this.tabFilteredTeams.length),
          detail: `${this.zeroPerformanceTeamsCount} sem lançamento`,
        },
        {
          label: 'Líder atual',
          value: this.leadingTeam ? this.leadingTeam.display : 'Sem produção',
          detail: this.leadingTeam ? this.formatCurrency(this.teamSortValue(this.leadingTeam)) : '—',
        },
      ];
    },
    executiveRankingTeams() {
      return this.cardsTeams.slice(0, 5);
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
            title: 'Ritmo abaixo da meta',
            text: `${this.selectedDate?.label || 'Data atual'} está ${Math.abs(this.dailyTargetDeltaPercent).toFixed(1).replace('.', ',')}% abaixo da meta diária planejada.`,
          });
        } else if (this.dailyTargetDeltaPercent >= 15) {
          alerts.push({
            id: 'target-rise',
            tone: 'positive',
            title: 'Ritmo acima da meta',
            text: `${this.selectedDate?.label || 'Data atual'} abriu ${this.dailyTargetDeltaPercent.toFixed(1).replace('.', ',')}% acima da meta diária planejada.`,
          });
        }
      }

      if (this.topTeamsSharePercent >= 70) {
        alerts.push({
          id: 'concentration',
          tone: 'warning',
          title: 'Concentração elevada',
          text: `As 3 maiores equipes concentram ${this.topTeamsSharePercent.toFixed(1).replace('.', ',')}% do valor da visão atual.`,
        });
      }

      if (this.zeroPerformanceTeamsCount > 0) {
        alerts.push({
          id: 'idle-teams',
          tone: this.zeroPerformanceTeamsCount >= Math.max(2, Math.ceil(this.baseTabTeams.length * 0.3)) ? 'warning' : 'info',
          title: 'Equipes sem lançamento',
          text: `${this.zeroPerformanceTeamsCount} equipes estão sem produção ${this.rankingMode === 'period' ? 'no período carregado' : 'na data em foco'}.`,
        });
      }

      if ((this.importSummary.skippedRows || 0) > 0) {
        alerts.push({
          id: 'import-quality',
          tone: 'warning',
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
    contentTransitionKey() {
      return `${this.activeTab}:${this.loadedTab}:${this.importSummary.layout || 'default'}`;
    },
    trendChart() {
      return buildTrendGeometry(this.dateSummaries, this.selectedDateKey, this.formatCurrency);
    },
    barChart() {
      return buildBarGeometry(this.dateSummaries, this.selectedDateKey, this.formatCurrency);
    },
    compositionChart() {
      return buildCompositionData(this.tabFilteredTeams, (team) => this.teamSortValue(team), this.formatCurrency);
    },
    donutChart() {
      return buildDonutChart(this.compositionChart);
    },
    donutCenterValue() {
      if (this.chartHover?.context === 'donut') return this.chartHover.value;
      return this.compositionChart.total;
    },
    donutCenterLabel() {
      if (this.chartHover?.context === 'donut') return this.chartHover.label;
      return 'Valor do período';
    },
    donutCenterDetail() {
      if (this.chartHover?.context === 'donut') return this.chartHover.detail;
      return this.compositionChart.coveredPercent
        ? `Top 6 representam ${this.compositionChart.coveredPercent.toFixed(1).replace('.', ',')}%`
        : this.cardsPrimaryMetricLabel;
    },
    hasActiveChart() {
      if (this.chartType === 'composition') return this.compositionChart.hasData;
      if (this.chartType === 'donut') return this.donutChart.hasData;
      if (this.chartType === 'bar') return this.barChart.hasData;
      return this.trendChart.hasData;
    },
    chartPanelTitle() {
      if (this.chartType === 'line') return 'Curva de evolução diária';
      if (this.chartType === 'area') return 'Área acumulada por data';
      if (this.chartType === 'bar') return 'Comparativo diário em barras';
      if (this.chartType === 'donut') return 'Rosca de participação das equipes';
      return 'Composição das equipes líderes';
    },
    chartPanelDescription() {
      if (this.chartType === 'line') return 'Leitura contínua da variação de produção ao longo do período';
      if (this.chartType === 'area') return 'Ênfase visual no volume acumulado de cada dia';
      if (this.chartType === 'bar') return 'Comparação direta entre os totais de cada data';
      if (this.chartType === 'donut') return 'Participação relativa das equipes líderes na visão atual';
      return 'Distribuição das equipes com maior impacto na visão ativa';
    },
    trendSummaryLabel() {
      if (this.chartType === 'composition' || this.chartType === 'donut') {
        return this.rankingMode === 'period' ? 'Participação das equipes no período' : 'Participação das equipes na data';
      }
      return this.rankingMode === 'period' ? 'Total consolidado do período' : 'Total da data em foco';
    },
    trendSummaryValue() {
      if (this.chartType === 'composition' || this.chartType === 'donut') return this.compositionChart.total;
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
    selectedTeamNarrative() {
      if (!this.selectedTeam) return '';
      const bestDay = this.selectedTeamBestDay
        ? `${this.selectedTeamBestDay.label} com ${this.formatCurrency(this.selectedTeamBestDay.total)}`
        : 'sem melhor dia identificado';
      return `${this.selectedTeam.display} acumula ${this.formatCurrency(this.teamTotal(this.selectedTeam))}, tem meta diária de ${this.formatCurrency(this.teamDailyTarget(this.selectedTeam))}, pico em ${bestDay} e participa com ${this.selectedTeamShareOfView.toFixed(1).replace('.', ',')}% da leitura atual.`;
    },
    selectedTeamRecentRows() {
      return this.selectedTeamSeries.slice(-6).reverse();
    },
  },
  watch: {
    activeTab(newTab, oldTab) {
      if (newTab === oldTab) return;
      this.loadFromDatabase();
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
    loadChartType() {
      try {
        return localStorage.getItem(CHART_TYPE_STORAGE_KEY) || 'line';
      } catch (err) {
        return 'line';
      }
    },
    persistChartType(value) {
      try {
        if (value) localStorage.setItem(CHART_TYPE_STORAGE_KEY, value);
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
    async getHtmlToImageModule() {
      return import('html-to-image');
    },
    async getJsPdfModule() {
      return import('jspdf');
    },
    async getXlsxModule() {
      return import('xlsx');
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
    async captureChartDataUrl() {
      const target = this.$refs.chartExportSurface;
      if (!target) {
        throw new Error('Área do gráfico não encontrada para exportação.');
      }
      const { toPng } = await this.getHtmlToImageModule();
      return toPng(target, {
        cacheBust: true,
        pixelRatio: 2,
        backgroundColor: '#0f172a',
      });
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
        const { jsPDF } = await this.getJsPdfModule();
        const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const margin = 12;
        const titleY = 16;
        const subtitleY = 24;
        const infoY = 31;
        const chartY = 38;
        const renderWidth = pageWidth - margin * 2;
        const renderHeight = pageHeight - chartY - margin;

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.text(this.chartExportTitle, margin, titleY);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        pdf.text(this.chartExportSubtitle, margin, subtitleY);
        pdf.text(`Aba: ${this.activeSheetLabel} | Grafico: ${this.chartPanelTitle} | Exportado em: ${this.lastUpdatedLabel || 'agora'}`, margin, infoY);

        pdf.addImage(dataUrl, 'PNG', margin, chartY, renderWidth, renderHeight, undefined, 'FAST');
        pdf.save(`${this.chartExportFilename}.pdf`);
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
        const XLSX = await this.getXlsxModule();
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Historico');
        const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
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
      return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    formatDateKey(dateKey) {
      if (!dateKey) return '—';
      const date = new Date(`${dateKey}T00:00:00Z`);
      if (Number.isNaN(date.getTime())) return dateKey;
      return dateFormatter.format(date);
    },
    teamDailyTarget(team) {
      if (!team) return 0;
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
        this.persistLastDateKey(this.selectedDateKey);
        this.lastDateKey = this.selectedDateKey;
        return;
      }
      const column = this.availableDates.find((col) => col.key === this.selectedDateKey);
      if (!column && this.availableDates.length) {
        this.selectedDateKey = this.availableDates[0].key;
      }
      this.persistLastDateKey(this.selectedDateKey);
      this.lastDateKey = this.selectedDateKey;
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
    buildEndpointCandidates(primary, sheetName) {
      const query = sheetName ? `?sheet=${encodeURIComponent(sheetName)}` : '';
      const endpoints = [`${primary}${query}`];
      if (primary.startsWith('http') && !primary.includes('/api/')) {
        endpoints.push(`/api/dropbox-diario${query}`);
      }
      return endpoints;
    },
    async requestNormalizedSheet(primary, sheetName) {
      const endpoints = this.buildEndpointCandidates(primary, sheetName);
      let response = null;
      let lastError = null;

      for (const endpoint of endpoints) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);
          response = await fetch(endpoint, { cache: 'no-store', signal: controller.signal });
          clearTimeout(timeoutId);
          break;
        } catch (error) {
          lastError = error;
          console.warn('fetch failed for', endpoint, error);
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
        payload,
        normalized,
      };
    },
    mergeNormalizedSheets(results) {
      const dateMap = new Map();
      const teamMap = new Map();
      const sourceSheets = [];
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
            type: 'GERAL',
            plate: team.plate || '',
            valuesByDate: {},
            sourceSheets: [],
            colD: team.colD ?? null,
            colL: team.colL ?? null,
            colAH: team.colAH ?? null,
          };

          if (!existing.plate && team.plate) existing.plate = team.plate;
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
          type: team.sourceSheets.length ? team.sourceSheets.join(' + ') : 'GERAL',
        }))
        .sort((left, right) => left.display.localeCompare(right.display));

      const nonZeroTeams = teams.filter((team) => Object.values(team.valuesByDate || {}).some((value) => Number(value) > 0)).length;

      return {
        dates,
        teams,
        summary: {
          layout: 'combined-service',
          sheetName: 'GERAL',
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
        this.persistLastDateKey(this.selectedDateKey);
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
    async loadFromDatabase() {
      const requestedTab = this.activeTab;
      this.loading = true;
      this.errorMessage = '';
      this.sampleRows = null;
      try {
        const tabToSheet = { OBRAS: 'OBRAS', EME: 'EME', CUSTEIO: 'CUSTEIO' };
        const primary = '/api/get-producao-from-db';
        let normalized;
        let origin;
        let generatedAt;

        if (requestedTab === 'GERAL') {
          const generalSheets = ['OBRAS', 'EME', 'CUSTEIO'];
          const results = await Promise.all(generalSheets.map((sheet) => this.requestNormalizedSheet(primary, sheet)));
          const merged = this.mergeNormalizedSheets(results);
          normalized = merged;
          const origins = Array.from(new Set(results.map((result) => result.payload.origin || 'desconhecida')));
          origin = origins.length === 1 ? origins[0] : 'mixed';
          generatedAt = results
            .map((result) => result.payload.generatedAt)
            .filter(Boolean)
            .sort()
            .pop();
        } else {
          const sheetName = tabToSheet[requestedTab];
          const result = await this.requestNormalizedSheet(primary, sheetName);
          normalized = result.normalized;
          origin = result.payload.origin;
          generatedAt = result.payload.generatedAt;
        }

        this.applyNormalizedPayload(requestedTab, normalized, origin, generatedAt);
      } catch (err) {
        console.error('Erro ao carregar dados do Neon:', err);
        if (err?.status === 404 || err?.payload?.origin === 'database-empty') {
          this.errorMessage = 'O Neon ainda não tem dados para essa aba. Use o botão de sincronização para importar do Dropbox.';
        } else if (err && err.name === 'AbortError') {
          this.errorMessage = 'A consulta ao banco expirou. Tente novamente.';
        } else if (err && err.message && err.message.includes('Failed to fetch')) {
          this.errorMessage = 'Falha na conexão com a API. Verifique o deploy da Vercel e tente novamente.';
        } else {
          this.errorMessage = err.message || 'Erro desconhecido ao carregar dados do Neon.';
        }
        this.importSummary = {};
        this.availableDates = [];
        this.teamRows = [];
      } finally {
        this.loading = false;
      }
    },
    async syncFromDropbox() {
      const requestedTab = this.activeTab;
      this.loading = true;
      this.syncing = true;
      this.errorMessage = '';
      this.sampleRows = null;
      try {
        const primary = '/api/dropbox-diario';
        const tabToSheet = { OBRAS: 'OBRAS', EME: 'EME', CUSTEIO: 'CUSTEIO' };
        let normalized;
        let origin;
        let generatedAt;

        if (requestedTab === 'GERAL') {
          const generalSheets = ['OBRAS', 'EME', 'CUSTEIO'];
          const results = await Promise.all(generalSheets.map((sheet) => this.requestNormalizedSheet(primary, sheet)));
          normalized = this.mergeNormalizedSheets(results);
          const origins = Array.from(new Set(results.map((result) => result.payload.origin || 'desconhecida')));
          origin = origins.length === 1 ? origins[0] : 'mixed';
          generatedAt = results.map((result) => result.payload.generatedAt).filter(Boolean).sort().pop();
        } else {
          const sheetName = tabToSheet[requestedTab];
          const result = await this.requestNormalizedSheet(primary, sheetName);
          normalized = result.normalized;
          origin = result.payload.origin;
          generatedAt = result.payload.generatedAt;
        }

        this.applyNormalizedPayload(requestedTab, normalized, origin, generatedAt);
      } catch (err) {
        console.error('Erro ao sincronizar com o Dropbox:', err);
        if (err?.payload?.sampleRows) {
          this.sampleRows = err.payload.sampleRows;
          this.headerCandidates = this.sampleRows.map((row, index) => ({ idx: index, label: `Linha ${index + 1}` }));
          this.headerCandidate = this.headerCandidates.length ? this.headerCandidates[0].idx : null;
          return;
        }
        if (err && err.name === 'AbortError') {
          this.errorMessage = 'A sincronização expirou. Tente novamente.';
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
  mounted() {
    this.loadFromDatabase();
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
  gap: 1.2rem;
  position: relative;
}

.producao-shell::before {
  content: '';
  position: absolute;
  inset: 0 0 auto 0;
  height: 460px;
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
  display: flex;
  justify-content: space-between;
  gap: 1.25rem;
  flex-wrap: wrap;
  align-items: stretch;
  padding: 1.6rem;
  border-radius: 28px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background:
    linear-gradient(135deg, rgba(15, 23, 42, 0.94), rgba(15, 23, 42, 0.76)),
    radial-gradient(circle at top right, rgba(251, 191, 36, 0.16), transparent 30%);
  box-shadow: 0 24px 60px rgba(2, 6, 23, 0.24);
}

.hero-copy {
  flex: 1 1 620px;
  min-width: 280px;
}

.eyebrow {
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.65);
}

.producao-hero h1 {
  margin: 0.35rem 0 0.45rem;
  font-size: clamp(2rem, 4.3vw, 3.25rem);
  line-height: 1.02;
  max-width: 14ch;
}

.subline {
  margin: 0;
  color: rgba(255, 255, 255, 0.75);
}

.hero-badges {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.hero-badge {
  padding: 0.45rem 0.8rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.84rem;
  backdrop-filter: blur(10px);
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
  margin-top: 1.2rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
}

.hero-snapshot__card {
  padding: 0.85rem 0.95rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.hero-snapshot__card span {
  font-size: 0.74rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: rgba(255, 255, 255, 0.56);
}

.hero-snapshot__card small {
  color: rgba(255, 255, 255, 0.66);
}

.hero-focus {
  width: min(360px, 100%);
  padding: 1.15rem;
  border-radius: 24px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(15, 23, 42, 0.2));
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
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
  font-size: clamp(1.6rem, 3vw, 2.25rem);
  line-height: 1;
}

.hero-focus__headline span {
  color: rgba(255, 255, 255, 0.7);
}

.hero-focus__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.75rem;
}

.hero-focus__grid article {
  padding: 0.8rem 0.9rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
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
  font-size: 1rem;
}

.hero-focus__grid small {
  color: rgba(255, 255, 255, 0.68);
}

.control-dock {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
  padding: 1rem 1.15rem;
  border-radius: 22px;
  background: rgba(15, 23, 42, 0.52);
  border: 1px solid rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(14px);
}

.advanced-dock {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
  padding: 1rem 1.15rem;
  border-radius: 22px;
  background: rgba(15, 23, 42, 0.42);
  border: 1px dashed rgba(255, 255, 255, 0.1);
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
  flex: 1 1 720px;
}

.control-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.8rem;
  flex: 1 1 420px;
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
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(15, 23, 42, 0.8);
  color: #fff;
  padding: 0.6rem 1rem;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease, transform 0.18s ease;
  outline: none;
}

.input-stack select:hover,
.input-stack input:hover {
  border-color: rgba(251, 191, 36, 0.24);
}

.input-stack select:focus,
.input-stack input:focus {
  border-color: rgba(251, 191, 36, 0.54);
  background: rgba(15, 23, 42, 0.94);
  box-shadow: 0 0 0 4px rgba(251, 191, 36, 0.1);
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
  transition: transform 0.18s ease, box-shadow 0.18s ease;
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

.trend-panel__header-tools {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  flex-wrap: wrap;
}

.chart-export-actions {
  display: inline-flex;
  gap: 0.45rem;
  flex-wrap: wrap;
}

.chart-export-btn {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  padding: 0.55rem 0.85rem;
  background: rgba(255, 255, 255, 0.04);
  color: rgba(255, 255, 255, 0.82);
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
}

.chart-export-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(251, 191, 36, 0.22);
  transform: translateY(-1px);
}

.chart-export-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.chart-switcher {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  padding: 0.35rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.chart-switcher__btn {
  border: none;
  border-radius: 999px;
  padding: 0.5rem 0.85rem;
  background: transparent;
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
}

.chart-switcher__btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}

.chart-switcher__btn.active {
  color: #0f172a;
  background: linear-gradient(120deg, #f97316, #fbbf24);
}

.trend-panel__summary span {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: rgba(255, 255, 255, 0.58);
}

.trend-panel__summary strong {
  font-size: 1.05rem;
}

.trend-chart-card {
  border-radius: 18px;
  padding: 1rem 1rem 1.15rem;
  background:
    radial-gradient(circle at top right, rgba(249, 115, 22, 0.12), transparent 28%),
    rgba(15, 23, 42, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.06);
  position: relative;
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
  fill: #fbbf24;
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
  grid-template-columns: minmax(220px, 280px) minmax(0, 1fr);
  gap: 1rem;
  align-items: center;
}

.donut-chart__visual {
  display: flex;
  justify-content: center;
  position: relative;
}

.donut-chart__svg {
  width: 220px;
  height: 220px;
  overflow: visible;
}

.donut-chart__segment {
  cursor: pointer;
  transition: opacity 0.18s ease, transform 0.18s ease;
  transform-origin: 50% 50%;
}

.donut-chart__segment:hover {
  opacity: 0.95;
  transform: scale(1.01);
}

.donut-chart__segment.is-other {
  opacity: 0.75;
}

.donut-chart__core {
  position: absolute;
  inset: 50% auto auto 50%;
  transform: translate(-50%, -50%);
  width: 122px;
  height: 122px;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1rem;
}

.donut-chart__core strong {
  font-size: 1rem;
}

.donut-chart__core small {
  color: rgba(255, 255, 255, 0.66);
}

.donut-chart__core span {
  margin-top: 0.2rem;
  color: rgba(255, 255, 255, 0.58);
  font-size: 0.74rem;
  line-height: 1.3;
}

.donut-chart__legend {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.donut-chart__item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.7rem 0.8rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
}

.donut-chart__swatch {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex: 0 0 12px;
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
}

.leader-spotlight__copy {
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
}

.leader-spotlight__label {
  font-size: 0.78rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.58);
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
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
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
  position: relative;
  border-radius: 18px;
  padding: 1rem 1.2rem 1.1rem;
  background:
    linear-gradient(180deg, rgba(30, 41, 59, 0.78), rgba(15, 23, 42, 0.86)),
    rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  min-height: 180px;
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
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

.team-rank {
  position: absolute;
  top: 0.75rem;
  left: 0.85rem;
  padding: 0.2rem 0.5rem;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.16);
  color: rgba(255, 255, 255, 0.76);
  font-size: 0.72rem;
  font-weight: 700;
}

.team-card__meta {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding-top: 1.3rem;
}

.team-code {
  font-weight: 600;
  font-size: 1rem;
}

.team-plate {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.65);
}

.team-card__details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.8rem;
}

.team-card__details div {
  padding: 0.75rem 0.8rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
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
  font-size: 0.95rem;
}

.team-card__value {
  font-size: 1rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.88);
}

.team-card__bar {
  width: 100%;
  height: 8px;
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
  animation: panelRise 0.5s ease both;
}

.panel-appear--1 { animation-delay: 0.04s; }
.panel-appear--2 { animation-delay: 0.09s; }
.panel-appear--3 { animation-delay: 0.14s; }
.panel-appear--4 { animation-delay: 0.19s; }
.panel-appear--5 { animation-delay: 0.24s; }

.content-fade-enter-active,
.content-fade-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.content-fade-enter-from,
.content-fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
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
    padding: 1.2rem;
  }
  .producao-hero h1 {
    max-width: none;
  }
  .hero-snapshot {
    grid-template-columns: 1fr;
  }
  .control-dock {
    padding: 0.95rem;
  }
  .advanced-dock {
    padding: 0.95rem;
  }
  .header-actions {
    flex-direction: column;
    align-items: stretch;
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
</style>
