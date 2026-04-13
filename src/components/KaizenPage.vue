<template>
  <section class="kaizen-page kzn-page">
    <div class="kzn-page__aurora" aria-hidden="true"></div>
    <div class="kzn-page__grid-bg" aria-hidden="true"></div>
    <div class="kzn-page__wrap">
    <!-- Hero + ferramentas -->
    <header class="page-header kzn-hero" data-aos="fade-down">
      <div class="kzn-hero__intro">
        <div class="header-content">
          <div class="title-section">
            <div class="badge-container">
              <span class="page-header__eyebrow">
                <i class="icon-robot"></i>
                Kaizen Bot
              </span>
              <div class="status-indicator" :class="{ 'status-indicator--active': syncing }"></div>
            </div>
            <h1 class="main-title">
              <span class="title-gradient">Turnos SIGA</span>
              <div class="title-underline"></div>
            </h1>
            <p class="subtitle">
              Extração diária do SIGA, leitura do TXT, separação dos horários de início e fim e persistência no Neon.
            </p>
          </div>
        </div>
      </div>

      <div class="control-panel" data-aos="fade-left" data-aos-delay="100">
        <div class="control-panel__inner">
          <header class="control-panel__header">
            <div class="control-panel__header-main">
              <span class="control-panel__icon" aria-hidden="true"></span>
              <div class="control-panel__titles">
                <p class="control-panel__kicker">Captura &amp; leitura</p>
                <p class="control-panel__heading">Período exibido e janela enviada ao robô</p>
              </div>
            </div>
            <div
              class="control-panel__status-pill"
              :class="{ 'control-panel__status-pill--syncing': syncing }"
            >
              <span class="control-panel__status-dot" aria-hidden="true"></span>
              {{ syncing ? 'Sync em andamento' : 'Pronto para sincronizar' }}
            </div>
          </header>

          <div class="control-panel__body">
            <div class="control-panel__dates" role="group" aria-label="Datas">
              <label class="modern-field modern-field--card">
                <span class="field-label field-label--with-icon field-label--calendar">{{ historySelectorLabel }}</span>
                <div class="input-container">
                  <input
                    v-if="selectedPeriod === 'week'"
                    v-model="selectedWeekDate"
                    type="date"
                    class="modern-input"
                    @input="handleHistoryReferenceChange"
                  >
                  <input
                    v-else
                    v-model="selectedMonth"
                    type="month"
                    class="modern-input"
                    @input="handleHistoryReferenceChange"
                  >
                  <div class="input-glow"></div>
                </div>
              </label>

              <label class="modern-field modern-field--card">
                <span class="field-label field-label--with-icon field-label--calendar">Início do sync</span>
                <div class="input-container">
                  <input v-model="syncStartDate" type="date" class="modern-input">
                  <div class="input-glow"></div>
                </div>
              </label>

              <label class="modern-field modern-field--card">
                <span class="field-label field-label--with-icon field-label--calendar">Fim do sync</span>
                <div class="input-container">
                  <input v-model="syncEndDate" type="date" class="modern-input">
                  <div class="input-glow"></div>
                </div>
              </label>
            </div>

            <div class="control-panel__toolbar">
              <div class="period-selector period-selector--toolbar">
                <span class="field-label">Visualização dos gráficos</span>
                <div class="toggle-group toggle-group--toolbar">
                  <button
                    v-for="option in periodOptions"
                    :key="option.value"
                    type="button"
                    class="toggle-btn"
                    :class="{ 'toggle-btn--active': selectedPeriod === option.value }"
                    :disabled="loading"
                    @click="changePeriod(option.value)"
                  >
                    {{ option.label }}
                    <div class="toggle-ripple"></div>
                  </button>
                </div>
              </div>

              <button
                type="button"
                class="sync-button sync-button--toolbar"
                :class="{ 'sync-button--loading': syncing }"
                :disabled="syncing"
                @click="syncNow"
              >
                <div class="button-content">
                  <i class="sync-icon" :class="{ 'sync-icon--spinning': syncing }"></i>
                  <span>{{ syncing ? 'Sincronizando...' : 'Sincronizar agora' }}</span>
                </div>
                <div class="button-glow"></div>
              </button>
            </div>
          </div>
        </div>

        <transition name="slide-down">
          <div v-if="syncing" class="sync-status-panel" data-aos="fade-up">
            <div class="sync-pulse"></div>
            <div class="sync-content">
              <div class="sync-header">
                <h4>Sincronização em Progresso</h4>
                <span class="sync-time">{{ syncElapsedLabel }}</span>
              </div>
              <p class="sync-description">
                {{ syncCurrentMessage }}
                <span v-if="syncProgressSummary"> | {{ syncProgressSummary }}</span>
              </p>
              <div class="sync-progress-container">
                <div class="sync-progress-track">
                  <div
                    class="sync-progress-fill"
                    :style="{ width: `${syncProgressPercentage}%` }"
                  ></div>
                  <div class="sync-progress-glow" :style="{ left: `${syncProgressPercentage}%` }"></div>
                </div>
                <span class="progress-percentage">{{ syncProgressPercentage }}%</span>
              </div>
            </div>
          </div>
        </transition>
      </div>
    </header>

    <!-- Painel de resumo -->
    <section class="info-grid kzn-board" data-aos="fade-up" data-aos-delay="200">
      <!-- Hero Status Card -->
      <article class="info-card info-card--hero" data-tilt>
        <div class="card-background">
          <div class="card-glow"></div>
          <div class="card-pattern"></div>
        </div>
        <div class="card-content">
          <div class="card-header">
            <span class="card-badge">
              <i class="badge-icon"></i>
              Status do Sistema
            </span>
            <div class="status-dot" :class="latestRun ? 'status-dot--success' : 'status-dot--warning'"></div>
          </div>
          <h2 class="card-title">{{ latestRunLabel }}</h2>
          <p class="card-description">{{ latestRunDescription }}</p>
          <div class="metrics-row">
            <div class="metric-pill metric-pill--primary">
              <span class="metric-value">{{ filteredEntries.length }}</span>
              <span class="metric-label">equipes carregadas</span>
            </div>
            <div class="metric-pill metric-pill--secondary">
              <span class="metric-value">{{ runs.length }}</span>
              <span class="metric-label">execuções no histórico</span>
            </div>
            <div class="metric-pill metric-pill--accent">
              <span class="metric-label">{{ rangeLabel }}</span>
            </div>
            <div class="metric-pill metric-pill--info">
              <span class="metric-label">Filtro: {{ selectedBaseLabel }}</span>
            </div>
          </div>
        </div>
      </article>

      <!-- Animated Base Summary -->
      <article class="info-card info-card--bases kaizen-surface kaizen-surface--bases" data-tilt data-aos="fade-up" data-aos-delay="300">
        <div class="card-background">
          <div class="card-glow"></div>
        </div>
        <div class="kaizen-surface__blob" aria-hidden="true"></div>
        <div class="card-content">
          <div class="card-header">
            <span class="card-badge card-badge--bases">
              <span class="card-badge__glow" aria-hidden="true"></span>
              Distribuição por Base
            </span>
          </div>
          <h3 class="card-title">Equipes por localização</h3>
          <p class="kaizen-lede">Volume relativo de equipes carregadas por polo operacional.</p>
          <div class="base-rail">
            <div
              v-for="(count, base) in baseSummary"
              :key="base"
              class="base-rail__row"
              :class="`base-rail__row--${String(base)}`"
              :data-base="base"
              @mouseenter="highlightBase(base)"
              @mouseleave="clearHighlight"
            >
              <div class="base-rail__main">
                <span class="base-rail__abbr">{{ base }}</span>
                <div class="base-rail__text">
                  <strong class="base-rail__name">{{ getBaseName(base) }}</strong>
                  <span class="base-rail__hint">equipes ativas</span>
                </div>
              </div>
              <span class="base-rail__stat" :data-count="count">{{ count }}</span>
              <div class="base-rail__track">
                <div
                  class="base-rail__fill"
                  :style="{ width: `${(count / Math.max(1, Object.values(baseSummary).reduce((a, b) => Math.max(a, b), 1))) * 100}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </article>

      <!-- Interactive Features Card -->
      <article class="info-card info-card--features kaizen-surface kaizen-surface--flow" data-tilt data-aos="fade-up" data-aos-delay="400">
        <div class="card-background">
          <div class="card-glow"></div>
        </div>
        <div class="kaizen-surface__blob kaizen-surface__blob--violet" aria-hidden="true"></div>
        <div class="card-content">
          <div class="card-header">
            <span class="card-badge card-badge--flow">
              <span class="card-badge__glow card-badge__glow--violet" aria-hidden="true"></span>
              Automação Ativa
            </span>
          </div>
          <h3 class="card-title">Fluxo configurado</h3>
          <p class="kaizen-lede">Pipeline do robô Kaizen, do login ao armazenamento.</p>
          <ol class="flow-steps">
            <li class="flow-steps__item" data-aos="fade-right" data-aos-delay="500">
              <span class="flow-steps__num">01</span>
              <div class="flow-steps__body">
                <div class="flow-steps__icon flow-steps__icon--login" aria-hidden="true"></div>
                <p class="flow-steps__text">Login automatizado no SIGA com Playwright</p>
              </div>
            </li>
            <li class="flow-steps__item" data-aos="fade-right" data-aos-delay="600">
              <span class="flow-steps__num">02</span>
              <div class="flow-steps__body">
                <div class="flow-steps__icon flow-steps__icon--download" aria-hidden="true"></div>
                <p class="flow-steps__text">Download do relatório TXT</p>
              </div>
            </li>
            <li class="flow-steps__item" data-aos="fade-right" data-aos-delay="700">
              <span class="flow-steps__num">03</span>
              <div class="flow-steps__body">
                <div class="flow-steps__icon flow-steps__icon--parse" aria-hidden="true"></div>
                <p class="flow-steps__text">Parser dos IDs das equipes e horários</p>
              </div>
            </li>
            <li class="flow-steps__item" data-aos="fade-right" data-aos-delay="800">
              <span class="flow-steps__num">04</span>
              <div class="flow-steps__body">
                <div class="flow-steps__icon flow-steps__icon--save" aria-hidden="true"></div>
                <p class="flow-steps__text">Persistência no Neon para histórico rápido</p>
              </div>
            </li>
          </ol>
        </div>
      </article>

      <!-- Panorama numérico do período (alinhado aos gráficos de início de turno) -->
      <article class="info-card info-card--insight kaizen-surface kaizen-surface--period" data-tilt data-aos="fade-up" data-aos-delay="500">
        <div class="card-background">
          <div class="card-glow"></div>
        </div>
        <div class="kaizen-surface__blob kaizen-surface__blob--cyan" aria-hidden="true"></div>
        <div class="card-content">
          <div class="card-header">
            <span class="card-badge card-badge--insight">
              <span class="card-badge__glow card-badge__glow--cyan" aria-hidden="true"></span>
              Indicadores
            </span>
          </div>
          <h3 class="card-title">Panorama do período</h3>
          <p class="kaizen-lede">{{ periodInsightLede }}</p>
          <div class="period-card">
            <header class="period-card__masthead">
              <div class="period-card__dots" aria-hidden="true"><span></span><span></span><span></span></div>
              <div class="period-card__masthead-copy">
                <span class="period-card__eyebrow">{{ periodInsightEyebrow }}</span>
                <span class="period-card__filename">{{ periodInsightRangeLabel }}</span>
              </div>
              <span class="period-card__chip">{{ selectedBaseLabel }}</span>
            </header>
            <ul class="period-spec-list">
              <li class="period-spec period-spec--avg">
                <div class="period-spec__accent" aria-hidden="true"></div>
                <div class="period-spec__inner">
                  <span class="period-spec__label">Média de início de turno</span>
                  <span class="period-spec__value">{{ periodInsightAverageLabel }}</span>
                </div>
              </li>
              <li class="period-spec period-spec--spread">
                <div class="period-spec__accent" aria-hidden="true"></div>
                <div class="period-spec__inner">
                  <span class="period-spec__label">Mais cedo → mais tarde</span>
                  <span class="period-spec__value">{{ periodInsightSpreadLabel }}</span>
                </div>
              </li>
              <li class="period-spec period-spec--volume">
                <div class="period-spec__accent" aria-hidden="true"></div>
                <div class="period-spec__inner">
                  <span class="period-spec__label">Volume analisado</span>
                  <span class="period-spec__value period-spec__value--multiline">{{ periodInsightVolumeLabel }}</span>
                </div>
              </li>
            </ul>
          </div>
          <div class="config-note config-note--period" role="note">
            <span class="config-note__mark config-note__mark--period" aria-hidden="true"></span>
            <p class="config-note__text">
              Estes números usam a mesma base dos heatmaps: período (semana ou mês), filtro de base e registros de início de turno carregados.
            </p>
          </div>
        </div>
      </article>
    </section>

    <!-- Gráficos -->
    <section class="charts-container kzn-charts" data-aos="fade-up" data-aos-delay="600">
      <!-- Weekly Chart -->
      <article class="chart-card chart-card--primary" data-aos="zoom-in" data-aos-delay="700">
        <div class="chart-header">
          <div class="chart-info">
            <div class="chart-badge">
              <i class="chart-icon"></i>
              Análise Semanal
            </div>
            <h3 class="chart-title">Início de turno por equipe</h3>
            <p class="chart-subtitle">{{ weeklyChartTitle }}</p>
          </div>
          <div class="chart-controls">
            <div class="chart-date-control">
              <label>
                <span>Semana do gráfico</span>
                <div class="input-container">
                  <input 
                    v-model="selectedWeekDate" 
                    type="date" 
                    class="modern-input modern-input--small"
                    :disabled="chartLoading || exportingChart === 'weekly'" 
                    @input="handleWeekChartDateChange"
                  >
                  <div class="input-glow"></div>
                </div>
              </label>
            </div>
            <div class="chart-mode-group">
              <span class="field-label">Visualização</span>
              <div class="toggle-group toggle-group--small">
                <button
                  type="button"
                  class="toggle-btn"
                  :class="{ 'toggle-btn--active': weeklyChartMode === 'heatmap' }"
                  @click="weeklyChartMode = 'heatmap'"
                >
                  Heatmap
                </button>
                <button
                  type="button"
                  class="toggle-btn"
                  :class="{ 'toggle-btn--active': weeklyChartMode === 'bar' }"
                  @click="weeklyChartMode = 'bar'"
                >
                  Barras
                </button>
              </div>
            </div>
            <div class="export-controls">
              <button 
                type="button" 
                class="export-btn export-btn--primary"
                :disabled="exportingChart === 'weekly'" 
                @click="exportChartImage('weekly')"
              >
                <i class="export-icon"></i>
                {{ exportingChart === 'weekly' ? 'Gerando...' : 'PNG' }}
              </button>
              <button 
                type="button" 
                class="export-btn export-btn--secondary"
                :disabled="exportingChart === 'weekly'" 
                @click="exportChartPdf('weekly')"
              >
                <i class="pdf-icon"></i>
                PDF
              </button>
            </div>
          </div>
        </div>

        <!-- Animated Stats Grid -->
        <div class="stats-showcase" data-aos="fade-up" data-aos-delay="800">
          <div 
            v-for="(stat, index) in weeklyChartStats" 
            :key="`week-${stat.label}`"
            class="stat-tile"
            :data-aos-delay="850 + (index * 50)"
            data-aos="slide-up"
          >
            <div class="stat-value" :class="`stat-value--type-${index % 3}`">
              {{ stat.value || '0' }}
            </div>
            <div class="stat-label">{{ stat.label }}</div>
            <div class="stat-background"></div>
          </div>
        </div>

               <div class="chart-legend chart-legend--detailed" aria-label="Legenda do heatmap">
          <span class="legend-item legend-item--ontime">
            <div class="legend-dot"></div>
            <span class="legend-item__text">No horário <span class="legend-item__sub">(início antes de 08:00)</span></span>
          </span>
          <span class="legend-item legend-item--late">
            <div class="legend-dot"></div>
            <span class="legend-item__text">Atraso <span class="legend-item__sub">(início a partir de 08:00)</span></span>
          </span>
        </div>
        <p class="chart-legend-note">
          Células escuras indicam dia sem registro de início de turno para aquela equipe; detalhes completos aparecem no tooltip.
        </p>

        <div ref="weeklyChartExportFrame" class="chart-container chart-container--export">
          <div v-if="chartLoading" class="chart-loading">
            <div class="loading-spinner"></div>
            <span>Preparando visualização...</span>
          </div>
          <apexchart
            v-else-if="weeklyStartChart.series.length"
            :type="weeklyChartType"
            :height="weeklyChartHeight"
            :options="weeklyChartOptions"
            :series="weeklyStartChart.series"
            class="chart-component"
          />
          <div v-else class="chart-empty">
            <span>{{ chartEmptyMessage }}</span>
          </div>
        </div>
      </article>

      <!-- Monthly Chart -->
      <article class="chart-card chart-card--secondary" data-aos="zoom-in" data-aos-delay="900">
        <div class="chart-header">
          <div class="chart-info">
            <div class="chart-badge chart-badge--monthly">
              <i class="chart-icon"></i>
              Análise Mensal
            </div>
            <h3 class="chart-title">Início de turno por equipe</h3>
            <p class="chart-subtitle">{{ monthlyChartTitle }}</p>
          </div>
          <div class="chart-controls">
            <div class="chart-date-control">
              <label>
                <span>Mês do gráfico</span>
                <div class="input-container">
                  <input 
                    v-model="selectedMonth" 
                    type="month" 
                    class="modern-input modern-input--small"
                    :disabled="chartLoading || exportingChart === 'monthly'" 
                    @input="handleMonthChartDateChange"
                  >
                  <div class="input-glow"></div>
                </div>
              </label>
            </div>
            <div class="chart-mode-group">
              <span class="field-label">Visualização</span>
              <div class="toggle-group toggle-group--small">
                <button
                  type="button"
                  class="toggle-btn"
                  :class="{ 'toggle-btn--active': monthlyChartMode === 'heatmap' }"
                  @click="monthlyChartMode = 'heatmap'"
                >
                  Heatmap
                </button>
                <button
                  type="button"
                  class="toggle-btn"
                  :class="{ 'toggle-btn--active': monthlyChartMode === 'bar' }"
                  @click="monthlyChartMode = 'bar'"
                >
                  Barras
                </button>
              </div>
            </div>
            <div class="export-controls">
              <button 
                type="button" 
                class="export-btn export-btn--primary"
                :disabled="exportingChart === 'monthly'" 
                @click="exportChartImage('monthly')"
              >
                <i class="export-icon"></i>
                {{ exportingChart === 'monthly' ? 'Gerando...' : 'PNG' }}
              </button>
              <button 
                type="button" 
                class="export-btn export-btn--secondary"
                :disabled="exportingChart === 'monthly'" 
                @click="exportChartPdf('monthly')"
              >
                <i class="pdf-icon"></i>
                PDF
              </button>
            </div>
          </div>
        </div>

        <!-- Animated Stats Grid -->
        <div class="stats-showcase" data-aos="fade-up" data-aos-delay="950">
          <div 
            v-for="(stat, index) in monthlyChartStats" 
            :key="`month-${stat.label}`"
            class="stat-tile"
            :data-aos-delay="1000 + (index * 50)"
            data-aos="slide-up"
          >
            <div class="stat-value" :class="`stat-value--type-${index % 3}`">
              {{ stat.value || '0' }}
            </div>
            <div class="stat-label">{{ stat.label }}</div>
            <div class="stat-background"></div>
          </div>
        </div>

        <div class="chart-legend chart-legend--detailed" aria-label="Legenda do heatmap">
          <span class="legend-item legend-item--ontime">
            <div class="legend-dot"></div>
            <span class="legend-item__text">No horário <span class="legend-item__sub">(início antes de 08:00)</span></span>
          </span>
          <span class="legend-item legend-item--late">
            <div class="legend-dot"></div>
            <span class="legend-item__text">Atraso <span class="legend-item__sub">(início a partir de 08:00)</span></span>
          </span>
        </div>
        <p v-if="monthlyChartMode === 'heatmap'" class="chart-heatmap-hint">
          <strong>Mapa mensal:</strong> só as cores indicam o status; passe o mouse na célula para ver equipe, data e horário. Passe o mouse na <strong>linha</strong> para destacar a equipe em relação às demais.
        </p>

        <div ref="monthlyChartExportFrame" class="chart-container chart-container--export">
          <div v-if="chartLoading" class="chart-loading">
            <div class="loading-spinner"></div>
            <span>Preparando visualização...</span>
          </div>
          <apexchart
            v-else-if="monthlyStartChart.series.length"
            :type="monthlyChartType"
            :height="monthlyChartHeight"
            :options="monthlyChartOptions"
            :series="monthlyStartChart.series"
            class="chart-component"
          />
          <div v-else class="chart-empty">
            <span>{{ chartEmptyMessage }}</span>
          </div>
        </div>
      </article>
    </section>

    <!-- Tabela histórica -->
    <section class="data-section kzn-data" data-aos="fade-up" data-aos-delay="1100">
      <div class="data-card">
        <div class="data-header">
          <div class="data-info">
            <div class="data-badge">
              <i class="data-icon"></i>
              Dados Históricos
            </div>
            <h3 class="data-title">Turnos importados</h3>
            <p class="data-subtitle">{{ rangeLabel }}</p>
          </div>
          <div class="data-controls">
            <div class="filter-control">
              <span class="filter-label">Filtrar por base</span>
              <div class="filter-buttons">
                <button
                  v-for="option in baseFilterOptions"
                  :key="option.value"
                  type="button"
                  class="filter-btn"
                  :class="{ 'filter-btn--active': selectedBaseFilter === option.value }"
                  :disabled="loading"
                  @click="changeBaseFilter(option.value)"
                >
                  {{ option.label }}
                  <div class="filter-ripple"></div>
                </button>
              </div>
            </div>
            <button 
              type="button" 
              class="refresh-btn"
              :disabled="loading" 
              @click="loadHistory"
            >
              <i class="refresh-icon" :class="{ 'refresh-icon--spinning': loading }"></i>
              {{ loading ? 'Atualizando...' : 'Atualizar lista' }}
            </button>
          </div>
        </div>

        <!-- Status Messages with Enhanced Styling -->
        <transition-group name="message-slide" tag="div" class="message-container">
          <div v-if="errorMessage" key="error" class="status-message status-message--error" data-aos="shake">
            <i class="message-icon message-icon--error"></i>
            <span>{{ errorMessage }}</span>
          </div>
          <div v-if="successMessage" key="success" class="status-message status-message--success" data-aos="bounce">
            <i class="message-icon message-icon--success"></i>
            <span>{{ successMessage }}</span>
          </div>
          <div v-if="warningMessage" key="warning" class="status-message status-message--warning" data-aos="pulse">
            <i class="message-icon message-icon--warning"></i>
            <span>{{ warningMessage }}</span>
          </div>
        </transition-group>

        <!-- Enhanced Sync Log -->
        <transition name="expand">
          <div v-if="syncLogs.length" class="sync-log-section" data-aos="fade-up">
            <div class="log-header">
              <div class="log-title">
                <i class="log-icon"></i>
                <strong>Log da Sincronização</strong>
              </div>
              <span class="log-status" :class="`log-status--${syncStatus}`">{{ syncStatusLabel }}</span>
            </div>
            <div class="log-container">
              <div 
                v-for="(entry, index) in syncLogs" 
                :key="`${entry.timestamp}-${entry.message}`"
                class="log-entry"
                :class="`log-entry--${entry.level || 'info'}`"
                :style="{ '--delay': `${index * 50}ms` }"
              >
                <div class="log-time">{{ formatTime(entry.timestamp) }}</div>
                <div class="log-message">{{ entry.message }}</div>
                <div class="log-indicator"></div>
              </div>
            </div>
          </div>
        </transition>

        <!-- Modern Data Table -->
        <div class="table-container" data-aos="fade-up" data-aos-delay="1200">
          <div v-if="loading" class="table-loading">
            <div class="loading-spinner loading-spinner--large"></div>
            <span>Carregando dados...</span>
          </div>
          
          <div v-else class="table-wrapper">
            <table class="modern-table">
              <thead class="table-head">
                <tr>
                  <th class="table-header">Data</th>
                  <th class="table-header">Equipe</th>
                  <th class="table-header">Início</th>
                  <th class="table-header">Fim</th>
                  <th class="table-header">Origem</th>
                  <th class="table-header">Sincronizado</th>
                </tr>
              </thead>
              <tbody class="table-body">
                <tr 
                  v-for="(entry, index) in filteredEntries" 
                  :key="`${entry.reference_date}-${entry.team_id}`"
                  class="table-row"
                  :style="{ '--delay': `${index * 20}ms` }"
                  @mouseenter="highlightRow"
                  @mouseleave="clearRowHighlight"
                >
                  <td class="table-cell table-cell--date">{{ formatDate(entry.reference_date) }}</td>
                  <td class="table-cell table-cell--team">
                    <div class="team-info">
                      <span class="team-name">{{ entry.team_label || entry.team_id }}</span>
                      <span class="team-base">{{ resolveEntryBaseCode(entry) }}</span>
                    </div>
                  </td>
                  <td class="table-cell table-cell--time">
                    <span class="time-badge" :class="getTimeBadgeClass(entry.shift_start)">
                      {{ entry.shift_start || '--:--' }}
                    </span>
                  </td>
                  <td class="table-cell table-cell--time">
                    <span class="time-badge">{{ entry.shift_end || '--:--' }}</span>
                  </td>
                  <td class="table-cell table-cell--source">
                    <span class="source-tag">{{ entry.source }}</span>
                  </td>
                  <td class="table-cell table-cell--sync">{{ formatDateTime(entry.synced_at) }}</td>
                </tr>
                <tr v-if="!loading && !filteredEntries.length" class="empty-row">
                  <td colspan="6" class="empty-cell">
                    <div class="empty-state">
                      <i class="empty-icon"></i>
                      <span>{{ emptyStateLabel }}</span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
    </div>
  </section>
</template>

<script>
import { defineAsyncComponent } from 'vue';
import { captureElementAsPng, saveChartPdf } from '../utils/producaoExporters';

const ApexChart = defineAsyncComponent(() => import('vue3-apexcharts'));

/** AOS só após abrir Kaizen — reduz parse do chunk inicial */
let aosApi = null;
async function loadAos() {
  if (aosApi) return aosApi;
  await import('aos/dist/aos.css');
  const mod = await import('aos');
  aosApi = mod.default;
  return aosApi;
}
const today = new Date().toISOString().slice(0, 10);
const baseFilterOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'BCB', label: 'Bacabal' },
  { value: 'ITM', label: 'Itapecuru Mirim' },
  { value: 'STI', label: 'Santa Ines' },
];

const KAIZEN_PAGE_STATE_KEY = 'kaizen_page_state';

const CHART_COLORS = [
  '#1fd0ff', '#2f6df6', '#06d6a0', '#ffd166', '#ff7b72', '#9b8cff', '#4cc9f0', '#43aa8b',
  '#f8961e', '#f3722c', '#577590', '#90be6d', '#f94144', '#277da1', '#f9c74f',
];

/** Heatmap: pastéis + texto escuro nas células (WCAG-friendly) */
const KAIZEN_HEAT_ON_TIME = '#7ecfb9';
const KAIZEN_HEAT_LATE = '#e8b4b0';
const KAIZEN_HEAT_CELL_TEXT = '#0f172a';
const KAIZEN_HEAT_GAP_STROKE = 'rgba(15, 23, 42, 0.92)';
/** Minutos sentinela: Apex trata null como 0 nas faixas de cor; -1 só casa com a faixa "sem registro". */
const KAIZEN_HEAT_NO_DATA_MINUTES = -1;
const KAIZEN_HEAT_EMPTY_CELL = 'rgba(30, 41, 59, 0.92)';

function normalizeDateOnly(value) {
  if (!value) return today;
  return String(value).slice(0, 10);
}

function addDays(dateString, days) {
  const base = new Date(`${normalizeDateOnly(dateString)}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() + days);
  return base.toISOString().slice(0, 10);
}

function buildDateRange(startDate, endDate) {
  const dates = [];
  let cursor = normalizeDateOnly(startDate);
  const limit = normalizeDateOnly(endDate);
  while (cursor <= limit) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function chartCategoryDateForLabel(isoDate) {
  if (!isoDate) return null;
  const s = String(isoDate);
  return ISO_DATE_ONLY.test(s) ? s : null;
}

/** Meia-noite local evita troca de dia da semana por fuso. */
function parseLocalDateFromIsoDay(isoDate) {
  const day = chartCategoryDateForLabel(isoDate);
  if (!day) return null;
  return new Date(`${day}T12:00:00`);
}

/** Rótulo curto do dia da semana (ex.: seg., ter.), alinhado ao calendário local. */
function formatWeekdayShortPt(isoDate) {
  const d = parseLocalDateFromIsoDay(isoDate);
  if (!d) return '';
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(d);
}

/** Dia/mês para eixo denso (mês completo). */
function formatDayMonthPt(isoDate) {
  const d = parseLocalDateFromIsoDay(isoDate);
  if (!d) return '';
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  }).format(d);
}

function formatDateWithWeekdayLongPt(isoDate) {
  const d = parseLocalDateFromIsoDay(isoDate);
  if (!d) return '--/--/----';
  const w = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' }).format(d);
  const rest = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
  return `${w}, ${rest}`;
}

function timeToMinutes(value) {
  if (!value) return null;
  const [hours, minutes] = String(value).split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return (hours * 60) + minutes;
}

function formatMinutesToTimeLabel(value) {
  if (!Number.isFinite(value)) return '';
  const totalMinutes = Math.max(0, Math.round(value));
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function roundDownMinutes(value, step = 30) {
  return Math.floor(value / step) * step;
}

function roundUpMinutes(value, step = 30) {
  return Math.ceil(value / step) * step;
}

function resolveEntryBaseCode(entry) {
  const reference = String(entry?.team_id || entry?.team_label || '').toUpperCase();
  if (reference.includes('-BCB-') || reference.includes('_BCB_')) return 'BCB';
  if (reference.includes('-ITM-') || reference.includes('_ITM_')) return 'ITM';
  if (reference.includes('-STI-') || reference.includes('_STI_')) return 'STI';
  return 'OTHER';
}

function buildStartChartModel(entries = [], range = null, filter = 'all', resolveBaseCodeFn) {
  const filteredEntries = entries.filter((entry) => {
    if (!entry?.shift_start) return false;
    if (filter === 'all') return true;
    return resolveBaseCodeFn(entry) === filter;
  });

  const startDate = range?.startDate || today;
  const endDate = range?.endDate || startDate;
  const categories = buildDateRange(startDate, endDate);
  const teams = Array.from(new Set(filteredEntries.map((entry) => entry.team_label || entry.team_id))).sort((left, right) => left.localeCompare(right));
  const minuteValues = filteredEntries
    .map((entry) => timeToMinutes(entry.shift_start))
    .filter((value) => Number.isFinite(value));

  const entriesByTeamAndDate = new Map();
  filteredEntries.forEach((entry) => {
    const minutes = timeToMinutes(entry.shift_start);
    if (!Number.isFinite(minutes)) return;
    entriesByTeamAndDate.set(
      `${entry.team_label || entry.team_id}:${normalizeDateOnly(entry.reference_date)}`,
      minutes,
    );
  });

  const series = teams.map((teamLabel) => {
    const data = categories.map((date) => {
      const rawValue = entriesByTeamAndDate.get(`${teamLabel}:${date}`);
      return {
        x: date,
        y: Number.isFinite(rawValue) ? rawValue : KAIZEN_HEAT_NO_DATA_MINUTES,
      };
    });
    return {
      name: teamLabel,
      data,
    };
  }).filter((seriesItem) => seriesItem.data.some((point) => Number.isFinite(point.y)));

  const datesWithRecords = new Set(filteredEntries.map((entry) => normalizeDateOnly(entry.reference_date))).size;

  return {
    categories,
    teams,
    series,
    teamsCount: teams.length,
    recordsCount: filteredEntries.length,
    datesWithRecords,
    averageMinutes: minuteValues.length
      ? minuteValues.reduce((sum, value) => sum + value, 0) / minuteValues.length
      : null,
    earliestMinutes: minuteValues.length ? Math.min(...minuteValues) : null,
    latestMinutes: minuteValues.length ? Math.max(...minuteValues) : null,
    yMin: minuteValues.length ? Math.max(0, roundDownMinutes(Math.min(...minuteValues) - 30, 30)) : 0,
    yMax: minuteValues.length ? Math.min(24 * 60, roundUpMinutes(Math.max(...minuteValues) + 30, 30)) : 24 * 60,
  };
}

export default {
  name: 'KaizenPage',
  components: {
    ApexChart,
    apexchart: ApexChart,
  },
  data() {
    return {
      selectedDate: today,
      selectedWeekDate: today,
      selectedMonth: today.slice(0, 7),
      syncStartDate: today,
      syncEndDate: today,
      selectedPeriod: 'week',
      selectedBaseFilter: 'all',
      periodOptions: [
        { value: 'week', label: 'Semana' },
        { value: 'month', label: 'Mês' },
      ],
      baseFilterOptions,
      entries: [],
      runs: [],
      range: null,
      weeklyChartEntries: [],
      weeklyChartRange: null,
      monthlyChartEntries: [],
      monthlyChartRange: null,
      weeklyChartMode: 'heatmap',
      monthlyChartMode: 'heatmap',
      loading: false,
      chartLoading: false,
      exportingChart: '',
      syncing: false,
      syncJobId: '',
      syncPollId: null,
      syncProgressPercentage: 0,
      syncProcessedDates: 0,
      syncTotalDates: 0,
      syncCurrentDate: '',
      syncCurrentMessage: 'Aguardando sincronização.',
      syncLogs: [],
      syncStatus: '',
      syncWarning: '',
      syncError: '',
      syncResult: null,
      syncPreview: null,
      syncStartedAt: null,
      syncFinishedAt: null,
      syncElapsedSeconds: 0,
      syncTimerId: null,
      errorMessage: '',
      successMessage: '',
      warningMessage: '',
      /** false quando a API indica ausência de DATABASE_URL/POSTGRES_URL */
      kaizenDatabaseConfigured: true,
    };
  },
  computed: {
    filteredEntries() {
      if (this.selectedBaseFilter === 'all') return this.entries;
      return this.entries.filter((entry) => this.resolveEntryBaseCode(entry) === this.selectedBaseFilter);
    },
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
    rangeLabel() {
      if (!this.range || !this.range.startDate || !this.range.endDate) {
        return 'Período não carregado';
      }

      if (this.selectedPeriod === 'week') {
        return `Visualização semanal: ${this.formatDate(this.range.startDate)} até ${this.formatDate(this.range.endDate)}`;
      }

      return `Visualização mensal: ${this.formatDate(this.range.startDate)} até ${this.formatDate(this.range.endDate)}`;
    },
    historyReferenceDate() {
      if (this.selectedPeriod === 'month') {
        return `${this.selectedMonth}-01`;
      }
      return this.selectedWeekDate;
    },
    historySelectorLabel() {
      return this.selectedPeriod === 'month' ? 'Mês de exibição' : 'Semana de referência';
    },
    selectedBaseLabel() {
      const current = this.baseFilterOptions.find((option) => option.value === this.selectedBaseFilter);
      return current ? current.label : 'Todos';
    },
    syncElapsedLabel() {
      const totalSeconds = Number(this.syncElapsedSeconds || 0);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    },
    syncProgressSummary() {
      if (!this.syncTotalDates) {
        return `${this.syncProgressPercentage}%`;
      }
      return `${this.syncProcessedDates}/${this.syncTotalDates} datas | ${this.syncProgressPercentage}%`;
    },
    syncStatusLabel() {
      if (this.syncStatus === 'completed' && this.warningMessage) return 'Concluído com falhas';
      if (this.syncStatus === 'running') return 'Em andamento';
      if (this.syncStatus === 'completed') return 'Concluído';
      if (this.syncStatus === 'failed') return 'Falhou';
      if (this.syncStatus === 'queued') return 'Na fila';
      return 'Sem execução';
    },
    baseSummary() {
      return this.entries.reduce((summary, entry) => {
        const baseCode = this.resolveEntryBaseCode(entry);
        if (baseCode in summary) {
          summary[baseCode] += 1;
        }
        return summary;
      }, {
        BCB: 0,
        ITM: 0,
        STI: 0,
      });
    },
    weeklyStartChart() {
      return buildStartChartModel(this.weeklyChartEntries, this.weeklyChartRange, this.selectedBaseFilter, this.resolveEntryBaseCode);
    },
    monthlyStartChart() {
      return buildStartChartModel(this.monthlyChartEntries, this.monthlyChartRange, this.selectedBaseFilter, this.resolveEntryBaseCode);
    },
    weeklyChartTitle() {
      if (!this.weeklyChartRange || !this.weeklyChartRange.startDate || !this.weeklyChartRange.endDate) {
        return 'Início de turno na semana';
      }
      return `Semana: ${this.formatDate(this.weeklyChartRange.startDate)} até ${this.formatDate(this.weeklyChartRange.endDate)}`;
    },
    monthlyChartTitle() {
      if (!this.monthlyChartRange || !this.monthlyChartRange.startDate || !this.monthlyChartRange.endDate) {
        return 'Início de turno no mês';
      }
      return `Mês: ${this.formatDate(this.monthlyChartRange.startDate)} até ${this.formatDate(this.monthlyChartRange.endDate)}`;
    },
    weeklyChartStats() {
      const chart = this.weeklyStartChart;
      return [
        { label: 'Equipes com dados', value: String(chart?.teamsCount || 0) },
        { label: 'Dias com registro', value: String(chart?.datesWithRecords || 0) },
        { label: 'Registros', value: String(chart?.recordsCount || 0) },
        { label: 'Média', value: formatMinutesToTimeLabel(chart?.averageMinutes) || '--:--' },
        { label: 'Mais cedo', value: formatMinutesToTimeLabel(chart?.earliestMinutes) || '--:--' },
        { label: 'Mais tarde', value: formatMinutesToTimeLabel(chart?.latestMinutes) || '--:--' },
      ];
    },
    monthlyChartStats() {
      const chart = this.monthlyStartChart;
      return [
        { label: 'Equipes com dados', value: String(chart?.teamsCount || 0) },
        { label: 'Dias com registro', value: String(chart?.datesWithRecords || 0) },
        { label: 'Registros', value: String(chart?.recordsCount || 0) },
        { label: 'Média', value: formatMinutesToTimeLabel(chart?.averageMinutes) || '--:--' },
        { label: 'Mais cedo', value: formatMinutesToTimeLabel(chart?.earliestMinutes) || '--:--' },
        { label: 'Mais tarde', value: formatMinutesToTimeLabel(chart?.latestMinutes) || '--:--' },
      ];
    },
    weeklyChartHeight() {
      const n = this.weeklyStartChart.teamsCount || 1;
      return Math.max(500, n * 40 + 248);
    },
    monthlyChartHeight() {
      const teams = this.monthlyStartChart.teamsCount || 1;
      const days = (this.monthlyStartChart.categories || []).length || 1;
      const tallXAxis = days > 14 ? 102 : 62;
      return Math.max(580, teams * 42 + 268 + tallXAxis);
    },
    weeklyChartInfoLine() {
      return `Filtro ${this.selectedBaseLabel} | Equipes ${this.weeklyStartChart.teamsCount || 0} | Registros ${this.weeklyStartChart.recordsCount || 0}`;
    },
    monthlyChartInfoLine() {
      return `Filtro ${this.selectedBaseLabel} | Equipes ${this.monthlyStartChart.teamsCount || 0} | Registros ${this.monthlyStartChart.recordsCount || 0}`;
    },
    weeklyChartType() {
      return this.weeklyChartMode || 'heatmap';
    },
    monthlyChartType() {
      return this.monthlyChartMode || 'heatmap';
    },
    weeklyChartOptions() {
      return this.buildStartChartOptions(
        this.weeklyStartChart,
        'Início do turno por equipe na semana',
        this.weeklyChartType,
        'week',
      );
    },
    monthlyChartOptions() {
      return this.buildStartChartOptions(
        this.monthlyStartChart,
        'Início do turno por equipe no mês',
        this.monthlyChartType,
        'month',
      );
    },
    periodChartModel() {
      return this.selectedPeriod === 'month' ? this.monthlyStartChart : this.weeklyStartChart;
    },
    periodInsightLede() {
      const modo = this.selectedPeriod === 'month' ? 'mês' : 'semana';
      return `Resumo do ${modo} e do filtro atuais, derivado dos horários de início de turno (mesma lógica dos gráficos).`;
    },
    periodInsightEyebrow() {
      return this.selectedPeriod === 'month' ? 'Janela mensal' : 'Janela semanal';
    },
    periodInsightRangeLabel() {
      if (this.selectedPeriod === 'month') {
        const r = this.monthlyChartRange;
        if (!r?.startDate || !r?.endDate) return 'Selecione o mês';
        return `${this.formatDate(r.startDate)} — ${this.formatDate(r.endDate)}`;
      }
      const r = this.weeklyChartRange;
      if (!r?.startDate || !r?.endDate) return 'Selecione a semana';
      return `${this.formatDate(r.startDate)} — ${this.formatDate(r.endDate)}`;
    },
    periodInsightAverageLabel() {
      return formatMinutesToTimeLabel(this.periodChartModel?.averageMinutes) || '—';
    },
    periodInsightSpreadLabel() {
      const c = this.periodChartModel;
      if (!c?.recordsCount) return 'Sem dados no período';
      const early = formatMinutesToTimeLabel(c.earliestMinutes);
      const late = formatMinutesToTimeLabel(c.latestMinutes);
      if (!early || !late) return '—';
      return `${early} → ${late}`;
    },
    periodInsightVolumeLabel() {
      const c = this.periodChartModel;
      if (!c?.recordsCount) return 'Nenhum registro no período';
      const regs = c.recordsCount;
      const days = c.datesWithRecords;
      const teams = c.teamsCount;
      return `${regs} registro${regs !== 1 ? 's' : ''} · ${days} dia${days !== 1 ? 's' : ''} com apontamento · ${teams} equipe${teams !== 1 ? 's' : ''}`;
    },
    emptyStateLabel() {
      const filterSuffix = this.selectedBaseFilter === 'all' ? '' : ` para ${this.selectedBaseLabel}`;
      if (this.selectedPeriod === 'week') {
        return `Nenhum turno Kaizen encontrado para a semana selecionada${filterSuffix}.`;
      }
      return `Nenhum turno Kaizen encontrado para o mês selecionado${filterSuffix}.`;
    },
    chartEmptyMessage() {
      if (this.kaizenDatabaseConfigured === false) {
        return 'Sem conexão com o Postgres: defina DATABASE_URL ou POSTGRES_URL na raiz do projeto (.env ou .env.local) e reinicie o servidor de desenvolvimento.';
      }
      return 'Nenhum início de turno neste período para o filtro atual. Rode a sincronização Kaizen (SIGA) ou altere semana, mês ou base.';
    },
  },
  watch: {
    selectedPeriod() {
      this.persistKaizenSettings();
    },
    selectedWeekDate() {
      this.persistKaizenSettings();
    },
    selectedMonth() {
      this.persistKaizenSettings();
    },
    selectedBaseFilter() {
      this.persistKaizenSettings();
    },
    syncStartDate() {
      this.persistKaizenSettings();
    },
    syncEndDate() {
      this.persistKaizenSettings();
    },
  },
  async mounted() {
    const AOS = await loadAos();
    AOS.init({
      duration: 600,
      easing: 'ease-out-cubic',
      once: false,
      offset: 50,
      delay: 100,
    });

    this.loadPersistedKaizenSettings();
    window.dispatchEvent(new CustomEvent('app-loading-start', { detail: { source: 'kaizen-page', event: 'initial-load' } }));
    try {
      await Promise.allSettled([
        this.loadHistory({ preserveMessages: true, skipAppLoadingOverlay: true }),
        this.loadStartCharts({ skipAppLoadingOverlay: true }),
      ]);
    } finally {
      window.dispatchEvent(new CustomEvent('app-loading-end', { detail: { source: 'kaizen-page', event: 'initial-load' } }));
    }
    window.dispatchEvent(new CustomEvent('app-ready'));
    this.broadcastSyncMonitor();
  },
  beforeUnmount() {
    this.stopSyncTimer();
    this.stopSyncPolling();
    if (aosApi) aosApi.refresh();
  },
  methods: {
    // Base code resolution for team entries
    resolveEntryBaseCode(entry) {
      const reference = String(entry?.team_id || entry?.team_label || '').toUpperCase();
      if (reference.includes('-BCB-') || reference.includes('_BCB_')) return 'BCB';
      if (reference.includes('-ITM-') || reference.includes('_ITM_')) return 'ITM';
      if (reference.includes('-STI-') || reference.includes('_STI_')) return 'STI';
      return 'OTHER';
    },
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
      const normalizedValue = String(value).includes('T') ? value : `${value}T12:00:00`;
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(normalizedValue));
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
    formatTime(value) {
      if (!value) return '--:--:--';
      return new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(value));
    },
    triggerDownload(dataUrl, filename) {
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      link.click();
    },
    getChartExportConfig(chartType) {
      if (chartType === 'monthly') {
        return {
          refName: 'monthlyChartExportFrame',
          filenameBase: `kaizen-inicio-turno-mensal-${this.selectedMonth}`,
          title: 'Kaizen Bot - Inicio de turno mensal',
          subtitle: this.monthlyChartTitle,
          infoLine: this.monthlyChartInfoLine,
        };
      }

      return {
        refName: 'weeklyChartExportFrame',
        filenameBase: `kaizen-inicio-turno-semanal-${this.selectedWeekDate}`,
        title: 'Kaizen Bot - Inicio de turno semanal',
        subtitle: this.weeklyChartTitle,
        infoLine: this.weeklyChartInfoLine,
      };
    },
    async exportChartImage(chartType) {
      const config = this.getChartExportConfig(chartType);
      const target = this.$refs[config.refName];
      if (!target) {
        this.errorMessage = 'Não foi possível localizar o gráfico para exportação.';
        return;
      }

      this.exportingChart = chartType;
      try {
        const dataUrl = await captureElementAsPng(target, {
          backgroundColor: '#0b1422',
          pixelRatio: 3,
        });
        this.triggerDownload(dataUrl, `${config.filenameBase}.png`);
        this.successMessage = 'Imagem do grafico gerada com sucesso.';
      } catch (error) {
        this.errorMessage = error.message || 'Falha ao gerar a imagem do grafico.';
      } finally {
        this.exportingChart = '';
      }
    },
    async exportChartPdf(chartType) {
      const config = this.getChartExportConfig(chartType);
      const target = this.$refs[config.refName];
      if (!target) {
        this.errorMessage = 'Não foi possível localizar o gráfico para exportação.';
        return;
      }

      this.exportingChart = chartType;
      try {
        const dataUrl = await captureElementAsPng(target, {
          backgroundColor: '#0b1422',
          pixelRatio: 3,
        });
        await saveChartPdf({
          dataUrl,
          filename: `${config.filenameBase}.pdf`,
          title: config.title,
          subtitle: config.subtitle,
          infoLine: config.infoLine,
        });
        this.successMessage = 'PDF do grafico gerado com sucesso.';
      } catch (error) {
        this.errorMessage = error.message || 'Falha ao gerar o PDF do grafico.';
      } finally {
        this.exportingChart = '';
      }
    },
    handleHistoryReferenceChange() {
      this.loadHistory();
      if (this.selectedPeriod === 'month') {
        this.loadMonthlyStartChart();
        return;
      }
      this.loadWeeklyStartChart();
    },
    handleWeekChartDateChange() {
      this.loadWeeklyStartChart();
    },
    handleMonthChartDateChange() {
      this.loadMonthlyStartChart();
    },
    startSyncTimer() {
      this.stopSyncTimer();
      this.syncStartedAt = Date.now();
      this.syncElapsedSeconds = 0;
      this.syncTimerId = window.setInterval(() => {
        this.syncElapsedSeconds = Math.floor((Date.now() - this.syncStartedAt) / 1000);
      }, 1000);
    },
    stopSyncTimer() {
      if (this.syncTimerId) {
        window.clearInterval(this.syncTimerId);
        this.syncTimerId = null;
      }
    },
    buildSyncMonitorPayload() {
      return {
        syncing: this.syncing,
        status: this.syncStatus,
        jobId: this.syncJobId,
        progressPercentage: this.syncProgressPercentage,
        processedDates: this.syncProcessedDates,
        totalDates: this.syncTotalDates,
        currentDate: this.syncCurrentDate,
        currentMessage: this.syncCurrentMessage,
        startedAt: this.syncStartedAt,
        finishedAt: this.syncFinishedAt,
        warning: this.syncWarning,
        error: this.syncError,
        result: this.syncResult,
        preview: this.syncPreview,
        logs: this.syncLogs,
      };
    },
    broadcastSyncMonitor() {
      window.dispatchEvent(new CustomEvent('kaizen-sync-monitor', {
        detail: this.buildSyncMonitorPayload(),
      }));
    },
    stopSyncPolling() {
      if (this.syncPollId) {
        window.clearInterval(this.syncPollId);
        this.syncPollId = null;
      }
    },
    applySyncJobState(job = {}) {
      this.syncJobId = job.jobId || this.syncJobId;
      this.syncStatus = job.status || '';
      this.syncProgressPercentage = Math.max(0, Math.min(100, Number(job.progressPercentage || 0)));
      this.syncProcessedDates = Number(job.processedDates || 0);
      this.syncTotalDates = Number(job.totalDates || 0);
      this.syncCurrentDate = job.currentDate || '';
      this.syncCurrentMessage = job.currentMessage || 'Aguardando sincronização.';
      this.syncLogs = Array.isArray(job.logs) ? job.logs : [];
      this.syncWarning = job.warning || '';
      this.syncError = job.error || '';
      this.syncResult = job.result || null;
      this.syncPreview = job.preview || null;
      this.syncFinishedAt = job.finishedAt || null;
      this.warningMessage = job.warning || this.warningMessage;
      this.broadcastSyncMonitor();
    },
    startSyncPolling(jobId) {
      this.stopSyncPolling();
      this.syncPollId = window.setInterval(() => {
        this.pollSyncStatus(jobId);
      }, 1500);
    },
    async pollSyncStatus(jobId) {
      try {
        const response = await fetch(`/api/kaizen-sync?jobId=${encodeURIComponent(jobId)}`, {
          cache: 'no-store',
        });
        const payload = await this.parseApiResponse(response);
        if (!response.ok) {
          throw new Error(payload.detail || payload.error || 'Falha ao consultar o andamento da sincronização Kaizen.');
        }

        const job = payload.job || {};
        this.applySyncJobState(job);

        if (job.status === 'completed') {
          this.stopSyncPolling();
          this.syncing = false;
          this.syncFinishedAt = job.finishedAt || Date.now();
          this.stopSyncTimer();
          const result = job.result || {};
          const extracted = Number(result.recordsCount || 0);
          const syncedRange = result.startDate && result.endDate
            ? `${this.formatDate(result.startDate)} até ${this.formatDate(result.endDate)}`
            : this.formatDate(result.referenceDate || this.syncEndDate);
          this.warningMessage = result.warning || job.warning || '';
          if (this.warningMessage) {
            const range = result.range || {};
            const syncedDates = Number(range.syncedDates || 0);
            const failedDates = Number(range.failedDates || 0);
            this.successMessage = syncedDates > 0
              ? `Sincronização parcial entre ${syncedRange}: ${syncedDates} datas concluídas e ${failedDates} falharam.`
              : '';
          } else {
            this.successMessage = extracted > 0
              ? `Sincronização concluída com ${extracted} equipes entre ${syncedRange}.`
              : `Exportação concluída para ${syncedRange}, mas o relatório atual não trouxe IDs de equipes reconhecíveis para extração automática.`;
          }
          this.selectedWeekDate = this.syncEndDate;
          this.selectedMonth = this.syncEndDate.slice(0, 7);
          await this.loadHistory({ preserveMessages: true });
          await this.loadStartCharts();
          this.broadcastSyncMonitor();
          window.dispatchEvent(new CustomEvent('app-loading-end', { detail: { source: 'kaizen-page', event: 'sync' } }));
          return;
        }

        if (job.status === 'failed') {
          this.stopSyncPolling();
          this.syncing = false;
          this.syncFinishedAt = job.finishedAt || Date.now();
          this.stopSyncTimer();
          this.errorMessage = job.error || 'Falha ao sincronizar o Kaizen.';
          this.broadcastSyncMonitor();
          window.dispatchEvent(new CustomEvent('app-loading-end', { detail: { source: 'kaizen-page', event: 'sync' } }));
        }
      } catch (error) {
        this.stopSyncPolling();
        this.syncing = false;
        this.syncFinishedAt = Date.now();
        this.stopSyncTimer();
        this.errorMessage = error.message || 'Falha ao consultar o andamento da sincronização Kaizen.';
        this.broadcastSyncMonitor();
        window.dispatchEvent(new CustomEvent('app-loading-end', { detail: { source: 'kaizen-page', event: 'sync' } }));
      }
    },
    changeBaseFilter(filter) {
      this.selectedBaseFilter = filter;
    },
    changePeriod(period) {
      if (this.selectedPeriod === period) return;
      this.selectedPeriod = period;
      this.loadHistory();
    },
    loadPersistedKaizenSettings() {
      try {
        const raw = localStorage.getItem(KAIZEN_PAGE_STATE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (saved.selectedPeriod) this.selectedPeriod = saved.selectedPeriod;
        if (saved.selectedWeekDate) this.selectedWeekDate = normalizeDateOnly(saved.selectedWeekDate);
        if (saved.selectedMonth) this.selectedMonth = String(saved.selectedMonth).slice(0, 7);
        if (saved.selectedBaseFilter) this.selectedBaseFilter = saved.selectedBaseFilter;
        if (saved.syncStartDate) this.syncStartDate = normalizeDateOnly(saved.syncStartDate);
        if (saved.syncEndDate) this.syncEndDate = normalizeDateOnly(saved.syncEndDate);
      } catch (error) {
        console.warn('Falha ao carregar estado do Kaizen', error);
      }
    },
    persistKaizenSettings() {
      try {
        const payload = {
          selectedPeriod: this.selectedPeriod,
          selectedWeekDate: normalizeDateOnly(this.selectedWeekDate),
          selectedMonth: String(this.selectedMonth).slice(0, 7),
          selectedBaseFilter: this.selectedBaseFilter,
          syncStartDate: normalizeDateOnly(this.syncStartDate),
          syncEndDate: normalizeDateOnly(this.syncEndDate),
        };
        localStorage.setItem(KAIZEN_PAGE_STATE_KEY, JSON.stringify(payload));
      } catch (error) {
        console.warn('Falha ao persistir estado do Kaizen', error);
      }
    },
    async loadHistory(options = {}) {
      const preserveMessages = Boolean(options.preserveMessages);
      const skipOverlay = Boolean(options.skipAppLoadingOverlay);
      if (!skipOverlay) {
        window.dispatchEvent(new CustomEvent('app-loading-start', { detail: { source: 'kaizen-page', event: 'history' } }));
      }
      this.loading = true;
      if (!preserveMessages) {
        this.errorMessage = '';
        this.successMessage = '';
        this.warningMessage = '';
      }
      try {
        const query = new URLSearchParams({
          date: this.historyReferenceDate,
          period: this.selectedPeriod,
        });

        const response = await fetch(`/api/get-kaizen-history?${query.toString()}`, {
          cache: 'no-store',
        });
        const payload = await this.parseApiResponse(response);
        if (!response.ok) {
          throw new Error(payload.detail || payload.error || 'Falha ao carregar histórico Kaizen.');
        }
        this.entries = payload.entries || [];
        this.runs = payload.runs || [];
        this.range = payload.range || null;
        this.warningMessage = payload.warning || '';
        this.kaizenDatabaseConfigured = payload.databaseConfigured !== false;
      } catch (error) {
        this.entries = [];
        this.runs = [];
        this.range = null;
        this.errorMessage = error.message || 'Falha ao carregar histórico Kaizen.';
      } finally {
        this.loading = false;
        if (!skipOverlay) {
          window.dispatchEvent(new CustomEvent('app-loading-end', { detail: { source: 'kaizen-page', event: 'history' } }));
        }
      }
    },
    buildStartChartOptions(chartModel, title, mode = 'heatmap', windowHint = 'week') {
      const categories = chartModel?.categories || [];
      const averageMinutes = Number.isFinite(chartModel?.averageMinutes) ? chartModel.averageMinutes : null;
      const onTimeLimitMinutes = 8 * 60;
      const manyDays = categories.length > 14;
      const showHeatmapCellTimes = mode === 'heatmap';
      const heatmapCellFontSize = manyDays ? '11px' : '13px';
      const seriesList = chartModel?.series || [];
      const maxTeamLabelLen = seriesList.reduce((max, s) => {
        const full = String(s?.name || '');
        return Math.max(max, full.length);
      }, 0);
      const heatmapLeftGutter =
        mode === 'heatmap'
          ? Math.min(380, Math.max(120, Math.ceil(maxTeamLabelLen * 8) + 52))
          : manyDays
            ? 24
            : 28;
      const heatmapTopAxisPad = manyDays ? 56 : 52;
      const heatmapBottomDatePad = manyDays ? 76 : 56;
      const bottomPad = mode === 'heatmap' ? heatmapBottomDatePad : manyDays ? 56 : 22;
      const topPad = mode === 'heatmap' ? heatmapTopAxisPad : 6;
      const heatmapBottomDateAnnotations =
        mode === 'heatmap'
          ? categories.reduce((acc, cat) => {
              const day = chartCategoryDateForLabel(cat);
              if (!day) return acc;
              acc.push({
                x: day,
                borderWidth: 0,
                borderColor: 'transparent',
                strokeDashArray: 0,
                label: {
                  borderWidth: 0,
                  borderColor: 'transparent',
                  text: manyDays ? formatDayMonthPt(day) : this.formatDate(day),
                  textAnchor: 'middle',
                  orientation: 'horizontal',
                  position: 'bottom',
                  offsetY: manyDays ? 12 : 12,
                  style: {
                    color: '#e2e8f0',
                    fontSize: manyDays ? '10px' : '12px',
                    fontWeight: 600,
                    background: 'transparent',
                  },
                },
              });
              return acc;
            }, [])
          : [];
      return {
        chart: {
          type: mode,
          fontFamily:
            'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          animations: {
            enabled: false,
            easing: 'easeinout',
            speed: 0,
            animateGradually: {
              enabled: false,
              delay: 0,
            },
            dynamicAnimation: {
              enabled: false,
              speed: 0,
            },
          },
          toolbar: {
            show: mode !== 'heatmap',
            tools: {
              download: true,
              selection: false,
              zoom: false,
              zoomin: false,
              zoomout: false,
              pan: false,
              reset: false,
            },
          },
          foreColor: '#cbd5e1',
        },
        plotOptions: {
          heatmap: {
            shadeIntensity: 0.08,
            radius: 5,
            enableShades: false,
            dataLabels: {
              enabled: showHeatmapCellTimes,
            },
            colorScale: {
              ranges: [
                {
                  from: KAIZEN_HEAT_NO_DATA_MINUTES,
                  to: KAIZEN_HEAT_NO_DATA_MINUTES,
                  name: 'Sem registro',
                  color: KAIZEN_HEAT_EMPTY_CELL,
                },
                { from: 0, to: onTimeLimitMinutes, name: 'No horário', color: KAIZEN_HEAT_ON_TIME },
                { from: onTimeLimitMinutes + 1, to: 1440, name: 'Atrasado', color: KAIZEN_HEAT_LATE },
              ],
            },
            states: {
              hover: {
                filter: {
                  type: 'darken',
                  value: 0.12,
                },
              },
            },
          },
          bar: {
            horizontal: false,
            columnWidth: '52%',
            distributed: false,
            borderRadius: 8,
          },
        },
        dataLabels: {
          enabled: mode === 'heatmap' ? showHeatmapCellTimes : true,
          formatter: (value) =>
            Number.isFinite(value) && value >= 0 ? formatMinutesToTimeLabel(value) : '',
          style: {
            colors: [KAIZEN_HEAT_CELL_TEXT],
            fontSize: mode === 'heatmap' ? heatmapCellFontSize : '12px',
            fontWeight: 700,
          },
          background: {
            enabled: false,
          },
          dropShadow: {
            enabled: false,
          },
        },
        legend: {
          show: false,
          labels: {
            colors: '#cfe4ff',
          },
        },
        grid: {
          show: mode !== 'heatmap',
          borderColor: 'rgba(148, 163, 184, 0.12)',
          strokeDashArray: 4,
          padding: {
            left: heatmapLeftGutter,
            right: 10,
            bottom: bottomPad,
            top: topPad,
          },
        },
        xaxis: {
          type: 'category',
          categories,
          position: mode === 'heatmap' ? 'top' : 'bottom',
          labels: {
            rotate: manyDays ? -32 : -28,
            rotateAlways: true,
            hideOverlappingLabels: manyDays,
            style: {
              colors: '#e2e8f0',
              fontSize: '12px',
              fontWeight: 600,
            },
            offsetY: mode === 'heatmap' ? (manyDays ? 4 : 4) : manyDays ? 6 : 2,
            maxHeight: mode === 'heatmap' ? (manyDays ? 92 : 78) : manyDays ? 110 : 88,
            formatter: (value) => {
              const day = chartCategoryDateForLabel(value);
              if (mode === 'heatmap' && day) return formatWeekdayShortPt(day);
              return this.formatDate(value);
            },
          },
          axisBorder: {
            show: mode !== 'heatmap',
            color: 'rgba(148, 163, 184, 0.2)',
          },
          axisTicks: {
            show: mode !== 'heatmap',
            color: 'rgba(148, 163, 184, 0.2)',
          },
        },
        yaxis: {
          labels: {
            align: 'right',
            style: {
              colors: '#e2e8f0',
              fontSize: manyDays ? '11px' : '12px',
              fontWeight: 600,
            },
            offsetX: mode === 'heatmap' ? -6 : 0,
          },
          title: {
            text: 'Equipe',
            offsetX: mode === 'heatmap' ? -10 : 0,
            style: {
              color: '#94a3b8',
              fontSize: '12px',
            },
          },
        },
        tooltip: {
          theme: 'dark',
          intersect: true,
          shared: false,
          followCursor: true,
          custom: ({ seriesIndex, dataPointIndex, w }) => {
            const point = w.config.series?.[seriesIndex]?.data?.[dataPointIndex];
            const team = w.config.series?.[seriesIndex]?.name || 'Equipe';
            const date = point?.x
              ? chartCategoryDateForLabel(point.x)
                ? formatDateWithWeekdayLongPt(point.x)
                : this.formatDate(point.x)
              : '--/--/----';
            const hasShiftValue = Number.isFinite(point?.y) && point.y >= 0;
            const value = hasShiftValue ? formatMinutesToTimeLabel(point.y) : '—';
            const averageLabel = averageMinutes !== null ? formatMinutesToTimeLabel(averageMinutes) : '—';
            const onTime = hasShiftValue && point.y <= onTimeLimitMinutes;
            const statusOk = !hasShiftValue ? null : onTime;
            const statusIcon = statusOk === null ? '\u2014' : statusOk ? '\u2713' : '!';
            const statusText = statusOk === null ? 'Sem registro' : statusOk ? 'No horário' : 'Atrasado';
            const statusClass = statusOk === null ? 'is-empty' : statusOk ? 'is-ok' : 'is-late';
            return `
<div class="kaizen-tooltip">
  <div class="kaizen-tooltip__row"><span class="kaizen-tooltip__key">Equipe</span><span class="kaizen-tooltip__val">${team}</span></div>
  <div class="kaizen-tooltip__row"><span class="kaizen-tooltip__key">Data</span><span class="kaizen-tooltip__val">${date}</span></div>
  <div class="kaizen-tooltip__row kaizen-tooltip__row--accent"><span class="kaizen-tooltip__key">Início</span><span class="kaizen-tooltip__val">${value}</span></div>
  <div class="kaizen-tooltip__status ${statusClass}"><span class="kaizen-tooltip__icon" aria-hidden="true">${statusIcon}</span><span>${statusText}</span></div>
  <div class="kaizen-tooltip__avg"><span class="kaizen-tooltip__avg-label">Média do período</span><strong class="kaizen-tooltip__avg-val">${averageLabel}</strong></div>
</div>`.trim();
          },
        },
        noData: {
          text: 'Nenhum início de turno encontrado para este período.',
          align: 'center',
          verticalAlign: 'middle',
          style: {
            color: '#9db4d1',
          },
        },
        title: {
          text: title,
          align: 'left',
          style: {
            color: '#f8fafc',
            fontSize: mode === 'heatmap' ? '16px' : '14px',
            fontWeight: 700,
          },
        },
        ...(mode === 'heatmap'
          ? {
              annotations: {
                xaxis: heatmapBottomDateAnnotations,
                yaxis: [],
                points: [],
                texts: [],
                images: [],
                shapes: [],
              },
            }
          : {}),
      };
    },
    async fetchHistoryByPeriod(referenceDate, period) {
      const controller = new AbortController();
      const timeoutMs = 15000;
      const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

      try {
        const query = new URLSearchParams({
          date: referenceDate,
          period,
          limit: '400',
        });
        const response = await fetch(`/api/get-kaizen-history?${query.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload = await this.parseApiResponse(response);
        if (!response.ok) {
          throw new Error(payload.detail || payload.error || 'Falha ao carregar dados do gráfico Kaizen.');
        }
        return payload;
      } catch (error) {
        if (error.name === 'AbortError') {
          throw new Error(`Tempo de espera excedido ao carregar o gráfico (${period}).`);
        }
        throw error;
      } finally {
        window.clearTimeout(timeoutId);
      }
    },
    async loadWeeklyStartChart() {
      const payload = await this.fetchHistoryByPeriod(this.selectedWeekDate, 'week');
      this.weeklyChartEntries = payload.entries || [];
      this.weeklyChartRange = payload.range || null;
      this.kaizenDatabaseConfigured = payload.databaseConfigured !== false;
      if (payload.warning) {
        this.warningMessage = payload.warning;
      }
      return payload;
    },
    async loadMonthlyStartChart() {
      const payload = await this.fetchHistoryByPeriod(`${this.selectedMonth}-01`, 'month');
      this.monthlyChartEntries = payload.entries || [];
      this.monthlyChartRange = payload.range || null;
      this.kaizenDatabaseConfigured = payload.databaseConfigured !== false;
      if (payload.warning) {
        this.warningMessage = payload.warning;
      }
      return payload;
    },
    async loadStartCharts(options = {}) {
      const skipOverlay = Boolean(options.skipAppLoadingOverlay);
      if (!skipOverlay) {
        window.dispatchEvent(new CustomEvent('app-loading-start', { detail: { source: 'kaizen-page', event: 'start-charts' } }));
      }
      this.chartLoading = true;
      try {
        const results = await Promise.allSettled([
          this.loadWeeklyStartChart(),
          this.loadMonthlyStartChart(),
        ]);

        const rejected = results.filter((result) => result.status === 'rejected');
        if (rejected.length) {
          const messages = rejected
            .map((result) => result.reason && result.reason.message ? result.reason.message : 'Erro desconhecido')
            .join(' | ');
          this.errorMessage = messages || 'Falha ao carregar os gráficos de início de turno.';
        }
      } catch (error) {
        this.errorMessage = error.message || 'Falha ao carregar os gráficos de início de turno.';
      } finally {
        this.chartLoading = false;
        if (!skipOverlay) {
          window.dispatchEvent(new CustomEvent('app-loading-end', { detail: { source: 'kaizen-page', event: 'start-charts' } }));
        }
      }
    },
    async syncNow() {
      this.errorMessage = '';
      this.successMessage = '';
      this.warningMessage = '';
      try {
        if (this.syncStartDate > this.syncEndDate) {
          throw new Error('A data inicial do sync deve ser menor ou igual à data final.');
        }

        this.syncing = true;
        window.dispatchEvent(new CustomEvent('app-loading-start', { detail: { source: 'kaizen-page', event: 'sync' } }));
        this.syncStatus = 'queued';
        this.syncLogs = [];
        this.syncWarning = '';
        this.syncError = '';
        this.syncResult = null;
        this.syncPreview = null;
        this.syncProgressPercentage = 0;
        this.syncProcessedDates = 0;
        this.syncTotalDates = 0;
        this.syncCurrentDate = this.syncStartDate;
        this.syncCurrentMessage = 'Solicitando início da sincronização.';
        this.syncFinishedAt = null;
        this.startSyncTimer();
        this.broadcastSyncMonitor();

        const response = await fetch('/api/kaizen-sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            startDate: this.syncStartDate,
            endDate: this.syncEndDate,
            async: true,
          }),
        });
        const payload = await this.parseApiResponse(response);
        if (!response.ok) {
          throw new Error(payload.detail || payload.error || 'Falha ao sincronizar o Kaizen.');
        }

        if (payload.job && payload.job.jobId) {
          this.applySyncJobState(payload.job);
          this.successMessage = payload.message || 'Sincronização Kaizen iniciada em segundo plano.';
          this.broadcastSyncMonitor();
          await this.pollSyncStatus(payload.job.jobId);
          if (this.syncing) {
            this.startSyncPolling(payload.job.jobId);
          }
          return;
        }

        // Fallback para execução síncrona no servidor; não retorna job.
        this.syncing = false;
        this.syncStatus = payload.ok ? 'completed' : 'failed';
        this.syncProgressPercentage = 100;
        this.syncProcessedDates = payload.totalDates || 1;
        this.syncTotalDates = payload.totalDates || 1;
        this.syncCurrentDate = payload.referenceDate || this.syncEndDate;
        this.syncCurrentMessage = payload.warning || payload.message || (payload.ok ? 'Sincronização concluída.' : 'Falha na sincronização.');
        this.syncResult = payload;

        if (payload.warning) {
          this.warningMessage = payload.warning;
          this.successMessage = payload.ok ? payload.warning : '';
        } else if (payload.ok) {
          this.successMessage = 'Sincronização concluída com sucesso.';
        }

        if (!payload.ok) {
          this.errorMessage = payload.detail || payload.error || 'Falha na sincronização do Kaizen.';
        }

        this.syncFinishedAt = Date.now();
        this.stopSyncTimer();
        await this.loadHistory({ preserveMessages: true });
        await this.loadStartCharts();
        this.broadcastSyncMonitor();
        window.dispatchEvent(new CustomEvent('app-loading-end', { detail: { source: 'kaizen-page', event: 'sync' } }));
        return;
      } catch (error) {
        this.errorMessage = error.message || 'Falha ao sincronizar o Kaizen.';
        this.syncing = false;
        this.syncFinishedAt = Date.now();
        this.stopSyncTimer();
        this.stopSyncPolling();
        this.broadcastSyncMonitor();
        window.dispatchEvent(new CustomEvent('app-loading-end', { detail: { source: 'kaizen-page', event: 'sync' } }));
      }
    },
    
    // New methods for modern UI
    getBaseName(base) {
      const baseNames = {
        'BCB': 'Bacabal',  
        'ITM': 'Itapecuru Mirim',
        'STI': 'Santa Ines'
      };
      return baseNames[base] || base;
    },
    
    highlightBase(base) {
      this.$nextTick(() => {
        const rows = this.$el.querySelectorAll('.base-rail__row');
        rows.forEach((row) => {
          if (row.dataset.base === base) {
            row.classList.add('base-rail__row--active');
          } else {
            row.classList.add('base-rail__row--dim');
          }
        });
      });
    },

    clearHighlight() {
      this.$nextTick(() => {
        this.$el.querySelectorAll('.base-rail__row').forEach((row) => {
          row.classList.remove('base-rail__row--dim', 'base-rail__row--active');
        });
      });
    },
    
    highlightRow() {
      // Add hover effects for table rows
    },
    
    clearRowHighlight() {
      // Clear hover effects
    },
    
    getTimeBadgeClass(time) {
      if (!time) return 'time-badge--empty';
      const [hours] = time.split(':').map(Number);
      return hours <= 8 ? 'time-badge--ontime' : 'time-badge--late';
    },
    
    // Add modern interactions and feedback
    async handleChartHover(event, chart) {
      const AOS = await loadAos();
      AOS.refresh();
    },
    
    triggerSuccessAnimation() {
      // Trigger success feedback animations
      const successElements = this.$el.querySelectorAll('.status-message--success');
      successElements.forEach(el => {
        el.style.animation = 'none';
        el.offsetHeight; // Trigger reflow
        el.style.animation = 'bounce 0.6s ease-out';
      });
    },
    
    refreshAnimations() {
      this.$nextTick(async () => {
        const AOS = await loadAos();
        AOS.refresh();
      });
    },
  },
};
</script>

<style scoped>
/* Modern Variables & Animations */
:root {
  --primary-gradient: linear-gradient(135deg, #22d3ee 0%, #2563eb 100%);
  --secondary-gradient: linear-gradient(135deg, #84cc16 0%, #22c55e 100%);
  --accent-gradient: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
  --glass-bg: rgba(11, 18, 38, 0.78);
  --glass-border: rgba(125, 211, 252, 0.12);
  --shadow-glow: 0 8px 32px rgba(34, 211, 238, 0.12);
  --shadow-soft: 0 4px 24px rgba(0, 0, 0, 0.45);
  --border-radius-lg: 22px;
  --border-radius-xl: 28px;
  --transition-smooth: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  --transition-bounce: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55);
}

@keyframes float {
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-10px) rotate(1deg); }
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 20px rgba(31, 208, 255, 0.3); }
  50% { box-shadow: 0 0 40px rgba(31, 208, 255, 0.6); }
}

@keyframes slide-in-up {
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slide-down {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes expand {
  from {
    opacity: 0;
    max-height: 0;
    transform: scaleY(0);
  }
  to {
    opacity: 1;
    max-height: 500px;
    transform: scaleY(1);
  }
}

/* Page shell — fundo editorial + grade */
.kaizen-page.kzn-page {
  position: relative;
  isolation: isolate;
  /* overflow-x: hidden forçava overflow-y: auto no mesmo bloco (regra CSS) → duas barras com o body */
  overflow: visible;
  min-height: 100vh;
  padding: 0;
  background: #030712;
  animation: slide-in-up 0.8s ease-out;
}

.kzn-page__aurora {
  position: fixed;
  inset: -25% -15% auto -15%;
  height: 70vh;
  background: radial-gradient(ellipse 90% 55% at 50% -15%, rgba(34, 211, 238, 0.16), transparent 58%);
  pointer-events: none;
  z-index: 0;
}

.kzn-page__grid-bg {
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(148, 163, 184, 0.035) 1px, transparent 1px),
    linear-gradient(90deg, rgba(148, 163, 184, 0.035) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(ellipse 75% 55% at 50% 0%, #000 15%, transparent 65%);
  pointer-events: none;
  z-index: 0;
  opacity: 0.55;
}

.kzn-page__wrap {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 100%;
  margin: 0;
  /* Ocupa toda a área do main; padding fluido sem “coluna” estreita em telas largas */
  padding: clamp(0.85rem, 2.2vw, 1.35rem) clamp(0.6rem, 1.75vw + 0.35rem, 1.5rem) clamp(2rem, 4vw, 3.25rem);
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: clamp(1.35rem, 3vw, 2.5rem);
}

/* Hero + toolbar */
.page-header.kzn-hero {
  display: flex;
  flex-direction: column;
  gap: clamp(1.1rem, 2.5vw, 1.75rem);
  padding: 0;
}

.kzn-hero__intro {
  width: 100%;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
  flex-wrap: wrap;
}

.title-section {
  flex: 1;
  min-width: min(100%, 280px);
}

.badge-container {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.page-header__eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 50px;
  background: var(--primary-gradient);
  color: #0a0f1a;
  font-weight: 700;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  box-shadow: var(--shadow-glow);
  animation: float 3s ease-in-out infinite;
}

.icon-robot::before {
  content: "🤖";
}

.status-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
  transition: var(--transition-smooth);
}

.status-indicator--active {
  background: #f59e0b;
  animation: pulse-glow 2s ease-in-out infinite;
}

.main-title {
  position: relative;
  margin: 0;
  overflow: hidden;
}

.title-gradient {
  font-size: clamp(3rem, 8vw, 6rem);
  font-weight: 800;
  background: linear-gradient(135deg, #f8fafc 0%, #1fd0ff 50%, #2f6df6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  line-height: 1;
  display: block;
}

.title-underline {
  height: 6px;
  width: 120px;
  background: var(--primary-gradient);
  border-radius: 3px;
  margin-top: 1rem;
  animation: slide-in-up 1s ease-out 0.5s both;
}

.subtitle {
  margin: clamp(1rem, 3vw, 2rem) 0 0;
  font-size: clamp(1rem, 2.2vw, 1.25rem);
  line-height: 1.6;
  color: rgba(248, 250, 252, 0.8);
  max-width: min(88ch, 100%);
  animation: slide-in-up 1s ease-out 0.7s both;
}

/* Control Panel — cartão com gradiente e datas em fichas */
.control-panel {
  position: relative;
  padding: 1px;
  border-radius: calc(var(--border-radius-xl) + 4px);
  background: linear-gradient(
    135deg,
    rgba(31, 208, 255, 0.35),
    rgba(47, 109, 246, 0.12) 40%,
    rgba(15, 23, 42, 0.95) 72%
  );
  box-shadow:
    0 24px 60px rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(255, 255, 255, 0.06) inset;
}

.control-panel::before {
  content: '';
  position: absolute;
  top: 0;
  left: 2rem;
  right: 2rem;
  height: 3px;
  border-radius: 0 0 8px 8px;
  background: linear-gradient(90deg, transparent, rgba(31, 208, 255, 0.85), rgba(47, 109, 246, 0.5), transparent);
  opacity: 0.9;
  pointer-events: none;
}

.control-panel__inner {
  border-radius: var(--border-radius-xl);
  background:
    linear-gradient(165deg, rgba(30, 41, 59, 0.55) 0%, transparent 42%),
    rgba(15, 23, 42, 0.92);
  backdrop-filter: blur(22px);
  border: 1px solid rgba(148, 163, 184, 0.12);
  padding: clamp(1rem, 2.2vw, 1.4rem) clamp(1rem, 2.5vw, 1.65rem) clamp(1.1rem, 2.5vw, 1.55rem);
  overflow: hidden;
}

.control-panel__header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem 1.5rem;
  margin-bottom: 1.35rem;
  padding-bottom: 1.1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.control-panel__header-main {
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
}

.control-panel__icon {
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: linear-gradient(145deg, rgba(31, 208, 255, 0.35), rgba(47, 109, 246, 0.15));
  border: 1px solid rgba(31, 208, 255, 0.25);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  position: relative;
}

.control-panel__icon::before {
  content: '';
  position: absolute;
  inset: 0;
  margin: auto;
  width: 20px;
  height: 20px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23e0f2fe' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'/%3E%3C/svg%3E")
    center / contain no-repeat;
  opacity: 0.95;
}

.control-panel__titles {
  min-width: 0;
}

.control-panel__kicker {
  margin: 0 0 0.2rem;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(56, 189, 248, 0.9);
}

.control-panel__heading {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 600;
  line-height: 1.35;
  color: rgba(248, 250, 252, 0.92);
  max-width: 36ch;
}

.control-panel__status-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.45rem 0.85rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(226, 232, 240, 0.88);
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(34, 197, 94, 0.28);
}

.control-panel__status-pill--syncing {
  color: #fde68a;
  background: rgba(245, 158, 11, 0.14);
  border-color: rgba(245, 158, 11, 0.35);
  animation: pulse-glow 2.2s ease-in-out infinite;
}

.control-panel__status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #4ade80;
  box-shadow: 0 0 10px rgba(74, 222, 128, 0.65);
}

.control-panel__status-pill--syncing .control-panel__status-dot {
  background: #fbbf24;
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.7);
}

.control-panel__body {
  display: flex;
  flex-direction: column;
  gap: clamp(1rem, 2vw, 1.35rem);
}

.control-panel__dates {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.85rem 1rem;
}

@media (min-width: 520px) {
  .control-panel__dates {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (min-width: 880px) {
  .control-panel__dates {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.modern-field--card {
  min-width: 0;
  padding: 1rem 1rem 1.05rem;
  border-radius: 16px;
  background: linear-gradient(145deg, rgba(2, 6, 23, 0.55), rgba(30, 41, 59, 0.35));
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.22);
  transition: border-color 0.25s ease, box-shadow 0.25s ease;
}

.modern-field--card:focus-within {
  border-color: rgba(31, 208, 255, 0.28);
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.28), 0 0 0 1px rgba(31, 208, 255, 0.12);
}

.field-label--with-icon {
  margin-left: 0;
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.field-label--calendar::before {
  content: '';
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  opacity: 0.75;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'/%3E%3C/svg%3E")
    center / contain no-repeat;
}

.control-panel__toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: flex-start;
  gap: 0.75rem 1rem;
  padding-top: 0.15rem;
}

.period-selector--toolbar {
  flex: 0 1 auto;
  min-width: min(100%, 180px);
}

.toggle-group--toolbar {
  width: fit-content;
  max-width: 100%;
  background: rgba(2, 6, 23, 0.65);
  border: 1px solid rgba(31, 208, 255, 0.14);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.sync-button--toolbar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 52px;
  padding: 0.85rem 1.75rem;
  border-radius: 16px;
  flex: 0 0 auto;
  box-shadow:
    0 4px 20px rgba(31, 208, 255, 0.25),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.controls-grid {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 2rem;
  align-items: end;
}

.control-group {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  align-items: end;
}

.modern-field {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  min-width: 200px;
}

.field-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(226, 232, 240, 0.88);
  margin-left: 0.5rem;
}

.input-container {
  position: relative;
}

.modern-input {
  width: 100% !important;
  padding: 1rem 1.25rem !important;
  border: 2px solid rgba(255, 255, 255, 0.2) !important;
  border-radius: 16px !important;
  background: rgba(30, 41, 59, 0.9) !important;
  color: #ffffff !important;
  font-size: 1rem !important;
  transition: var(--transition-smooth) !important;
  backdrop-filter: blur(10px) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2) !important;
}

.modern-input--small {
  padding: 0.75rem 1rem;
  font-size: 0.875rem;
}

.modern-input:focus {
  outline: none !important;
  border-color: #1fd0ff !important;
  box-shadow: 0 0 20px rgba(31, 208, 255, 0.3), 0 4px 12px rgba(0, 0, 0, 0.2) !important;
  background: rgba(30, 41, 59, 1) !important;
}

.modern-input:focus + .input-glow {
  opacity: 1;
  transform: scale(1);
}

.input-glow {
  position: absolute;
  inset: -2px;
  background: var(--primary-gradient);
  border-radius: 18px;
  opacity: 0;
  z-index: -1;
  transition: var(--transition-smooth);
  transform: scale(0.95);
}

/* Toggle Controls */
.period-selector {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.toggle-group {
  display: flex;
  padding: 0.5rem;
  background: rgba(15, 23, 42, 0.8);
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.toggle-btn {
  position: relative;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 16px;
  background: transparent;
  color: rgba(248, 250, 252, 0.7);
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition-smooth);
  overflow: hidden;
}

.toggle-btn:hover,
.toggle-btn:focus-visible {
  transform: translateY(-1px);
  color: #f8fbff;
}

.toggle-btn--active {
  background: var(--primary-gradient);
  color: #0a0f1a;
  font-weight: 700;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.2);
}

.toggle-btn:active {
  transform: scale(0.98);
}

.toggle-ripple {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle, rgba(31, 208, 255, 0.3) 0%, transparent 50%);
  opacity: 0;
  transform: scale(0);
  transition: var(--transition-smooth);
}

.toggle-btn:hover .toggle-ripple {
  opacity: 1;
  transform: scale(1);
}

/* Sync Button */
.sync-button {
  position: relative;
  padding: 1rem 2rem;
  border: none;
  border-radius: 20px;
  background: var(--primary-gradient);
  color: #0a0f1a;
  font-weight: 700;
  font-size: 1.1rem;
  cursor: pointer;
  overflow: hidden;
  transition: var(--transition-bounce);
  box-shadow: var(--shadow-glow);
}

.sync-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 48px rgba(31, 208, 255, 0.28);
}

.sync-button:active {
  transform: translateY(1px) scale(0.98);
}

.sync-button--loading {
  background: var(--accent-gradient);
  animation: pulse-glow 2s ease-in-out infinite;
}

.button-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  position: relative;
  z-index: 2;
}

.sync-icon::before {
  content: "⚡";
  font-size: 1.2rem;
}

.sync-icon--spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.button-glow {
  position: absolute;
  inset: -2px;
  background: linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  opacity: 0;
  transition: var(--transition-smooth);
}

.sync-button:hover .button-glow {
  opacity: 1;
}

/* Enhanced Sync Status Panel */
.sync-status-panel {
  display: flex;
  align-items: flex-start;
  gap: 1.5rem;
  padding: 2rem;
  margin-top: 2rem;
  background: rgba(15, 23, 42, 0.9);
  border: 2px solid rgba(31, 208, 255, 0.3);
  border-radius: var(--border-radius-lg);
  backdrop-filter: blur(20px);
}

.sync-pulse {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: var(--primary-gradient);
  animation: pulse-glow 1.5s ease-in-out infinite;
  flex-shrink: 0;
  margin-top: 0.5rem;
}

.sync-content {
  flex: 1;
  min-width: 0;
}

.sync-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.sync-header h4 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: #f8fafc;
}

.sync-time {
  padding: 0.5rem 1rem;
  background: rgba(31, 208, 255, 0.1);
  color: #1fd0ff;
  border-radius: 12px;
  font-weight: 600;
  font-family: monospace;
}

.sync-description {
  margin: 0 0 1.5rem;
  color: rgba(248, 250, 252, 0.8);
  line-height: 1.6;
}

.sync-progress-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.sync-progress-track {
  position: relative;
  flex: 1;
  height: 12px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  overflow: hidden;
}

.sync-progress-fill {
  height: 100%;
  background: var(--primary-gradient);
  transition: width 0.5s ease;
  border-radius: inherit;
}

.sync-progress-glow {
  position: absolute;
  top: 0;
  width: 20px;
  height: 100%;
  background: radial-gradient(ellipse, rgba(255, 255, 255, 0.8), transparent);
  transition: left 0.5s ease;
  transform: translateX(-50%);
}

.progress-percentage {
  font-weight: 700;
  color: #1fd0ff;
  min-width: 50px;
  text-align: right;
  font-family: monospace;
}

/* Slide Transition */
.slide-down-enter-active, .slide-down-leave-active {
  transition: var(--transition-smooth);
}

.slide-down-enter-from, .slide-down-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}

/* Painel de cartões — colunas 12 em desktop */
.info-grid.kzn-board {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: clamp(0.9rem, 2vw, 1.35rem);
}

@media (max-width: 1023px) {
  .info-grid.kzn-board {
    grid-template-columns: 1fr;
  }
}

@media (min-width: 1024px) {
  .kzn-board .info-card--hero {
    grid-column: 1 / -1;
  }

  .kzn-board .info-card--bases {
    grid-column: span 6;
  }

  .kzn-board .info-card--features {
    grid-column: span 6;
  }

  .kzn-board .info-card--insight {
    grid-column: 1 / -1;
  }
}

.info-card {
  position: relative;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius-xl);
  padding: clamp(1.2rem, 2.8vw, 2rem);
  transition: var(--transition-bounce);
  cursor: pointer;
  overflow: hidden;
}

.info-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1), transparent 30%);
  opacity: 0;
  transition: var(--transition-smooth);
}

.info-card:hover {
  transform: translateY(-4px) scale(1.01);
  box-shadow:
    var(--shadow-glow),
    0 20px 50px rgba(0, 0, 0, 0.4);
}

.info-card:hover::before {
  opacity: 1;
}

.info-card--hero {
  background:
    radial-gradient(circle at 85% 15%, rgba(34, 211, 238, 0.12), transparent 52%),
    var(--glass-bg);
}

.card-background {
  position: absolute;
  inset: 0;
  opacity: 0.6;
  transition: var(--transition-smooth);
}

.card-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(31, 208, 255, 0.1), transparent 70%);
  animation: float 4s ease-in-out infinite;
}

.card-pattern {
  position: absolute;
  inset: 0;
  background-image: 
    radial-gradient(circle at 20px 20px, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
  background-size: 40px 40px;
  opacity: 0.3;
}

.card-content {
  position: relative;
  z-index: 2;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.card-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(31, 208, 255, 0.1);
  color: #1fd0ff;
  border-radius: 12px;
  font-size: 0.875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.card-badge--warning {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.card-badge__glow {
  position: absolute;
  inset: -40% -20% auto auto;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(31, 208, 255, 0.45), transparent 68%);
  opacity: 0.55;
  pointer-events: none;
}

.card-badge--bases,
.card-badge--flow,
.card-badge--insight {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.card-badge--bases {
  background: linear-gradient(135deg, rgba(31, 208, 255, 0.18), rgba(15, 23, 42, 0.5));
  color: #7ee8ff;
}

.card-badge--flow {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.22), rgba(15, 23, 42, 0.55));
  color: #c4b5fd;
}

.card-badge--insight {
  background: linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(15, 23, 42, 0.55));
  color: #a5f3fc;
}

.card-badge__glow--violet {
  background: radial-gradient(circle, rgba(139, 92, 246, 0.5), transparent 68%);
}

.card-badge__glow--amber {
  background: radial-gradient(circle, rgba(245, 158, 11, 0.45), transparent 68%);
}

.card-badge__glow--cyan {
  background: radial-gradient(circle, rgba(34, 211, 238, 0.48), transparent 68%);
}

.kaizen-lede {
  margin: -0.25rem 0 1.25rem;
  font-size: 0.9rem;
  line-height: 1.55;
  color: rgba(226, 232, 240, 0.72);
}

/* Kaizen card shells (bases / flow / período) */
.kaizen-surface {
  position: relative;
  border-radius: var(--border-radius-xl);
}

.kaizen-surface--bases {
  border-color: rgba(31, 208, 255, 0.22);
  background:
    linear-gradient(165deg, rgba(31, 208, 255, 0.07) 0%, transparent 42%),
    var(--glass-bg);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.06) inset,
    0 18px 48px rgba(0, 0, 0, 0.35);
}

.kaizen-surface--flow {
  border-color: rgba(139, 92, 246, 0.22);
  background:
    linear-gradient(165deg, rgba(139, 92, 246, 0.09) 0%, transparent 45%),
    var(--glass-bg);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.06) inset,
    0 18px 48px rgba(0, 0, 0, 0.35);
}

.kaizen-surface--period {
  border-color: rgba(34, 211, 238, 0.28);
  background:
    linear-gradient(165deg, rgba(34, 211, 238, 0.1) 0%, transparent 44%),
    var(--glass-bg);
  box-shadow:
    0 1px 0 rgba(255, 255, 255, 0.06) inset,
    0 18px 48px rgba(0, 0, 0, 0.35);
}

.kaizen-surface__blob {
  position: absolute;
  top: -30%;
  right: -18%;
  width: 55%;
  padding-bottom: 55%;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 40%, rgba(31, 208, 255, 0.22), transparent 62%);
  pointer-events: none;
  z-index: 1;
  opacity: 0.9;
}

.kaizen-surface__blob--violet {
  background: radial-gradient(circle at 35% 45%, rgba(139, 92, 246, 0.28), transparent 62%);
  top: -28%;
  right: -22%;
}

.kaizen-surface__blob--amber {
  background: radial-gradient(circle at 40% 40%, rgba(245, 158, 11, 0.2), transparent 62%);
  top: -32%;
  right: -20%;
}

.kaizen-surface__blob--cyan {
  background: radial-gradient(circle at 38% 42%, rgba(34, 211, 238, 0.26), transparent 62%);
  top: -30%;
  right: -20%;
}

.kaizen-surface .card-content {
  position: relative;
  z-index: 2;
}

.badge-icon::before {
  content: "📊";
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ef4444;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
}

.status-dot--success {
  background: #22c55e;
  box-shadow: 0 0 10px rgba(34, 197, 94, 0.5);
}

.status-dot--warning {
  background: #f59e0b;
  box-shadow: 0 0 10px rgba(245, 158, 11, 0.5);
}

.card-title {
  margin: 0 0 1rem;
  font-size: 1.5rem;
  font-weight: 700;
  color: #f8fafc;
  line-height: 1.3;
}

.info-card--hero .card-title {
  font-size: 1.75rem;
  background: linear-gradient(135deg, #f8fafc, #1fd0ff);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.card-description {
  margin: 0 0 clamp(1.25rem, 3vw, 2rem);
  color: rgba(248, 250, 252, 0.8);
  line-height: 1.6;
}

.metrics-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 148px), 1fr));
  gap: 0.65rem 0.85rem;
  align-items: stretch;
}

.metric-pill {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.65rem 0.85rem;
  min-width: 0;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  transition: var(--transition-smooth);
}

.metric-pill:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.05);
}

.metric-pill--primary {
  background: rgba(31, 208, 255, 0.1);
  border-color: rgba(31, 208, 255, 0.2);
}

.metric-pill--secondary {
  background: rgba(132, 204, 22, 0.1);
  border-color: rgba(132, 204, 22, 0.2);
}

.metric-pill--accent {
  background: rgba(245, 158, 11, 0.1);
  border-color: rgba(245, 158, 11, 0.2);
}

.metric-pill--info {
  background: rgba(99, 102, 241, 0.1);
  border-color: rgba(99, 102, 241, 0.2);
}

.metric-value {
  font-weight: 700;
  color: #f8fafc;
  font-size: 1.125rem;
}

.metric-label {
  color: rgba(248, 250, 252, 0.8);
  font-size: 0.875rem;
  overflow-wrap: anywhere;
  line-height: 1.35;
}

/* Base rail — distribuição por base */
.base-rail {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.25rem;
}

.base-rail__row {
  --row-accent: #38bdf8;
  --row-accent-soft: rgba(56, 189, 248, 0.14);
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto;
  gap: 0.35rem 1rem;
  padding: 1rem 1.1rem 0.95rem;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background:
    linear-gradient(135deg, rgba(255, 255, 255, 0.04), transparent 55%),
    rgba(15, 23, 42, 0.55);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.22);
  cursor: pointer;
  transition: transform 0.28s ease, border-color 0.28s ease, box-shadow 0.28s ease, opacity 0.28s ease;
  overflow: hidden;
}

.base-rail__row::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  border-radius: 4px 0 0 4px;
  background: linear-gradient(180deg, var(--row-accent), transparent);
  opacity: 0.95;
}

.base-rail__row--ITM {
  --row-accent: #a78bfa;
  --row-accent-soft: rgba(167, 139, 250, 0.16);
}

.base-rail__row--STI {
  --row-accent: #fbbf24;
  --row-accent-soft: rgba(251, 191, 36, 0.14);
}

.base-rail__row:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--row-accent) 35%, rgba(255, 255, 255, 0.12));
  box-shadow: 0 14px 36px rgba(0, 0, 0, 0.35), 0 0 0 1px color-mix(in srgb, var(--row-accent) 22%, transparent);
}

.base-rail__row--dim {
  opacity: 0.38;
  transform: scale(0.985);
}

.base-rail__row--active {
  opacity: 1;
  transform: translateY(-3px) scale(1.01);
  border-color: color-mix(in srgb, var(--row-accent) 45%, rgba(255, 255, 255, 0.15));
  box-shadow:
    0 16px 44px rgba(0, 0, 0, 0.38),
    0 0 0 1px color-mix(in srgb, var(--row-accent) 35%, transparent),
    0 0 40px var(--row-accent-soft);
}

.base-rail__main {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  grid-column: 1;
  grid-row: 1;
  min-width: 0;
}

.base-rail__abbr {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #0f172a;
  background: linear-gradient(145deg, var(--row-accent), color-mix(in srgb, var(--row-accent) 65%, #0f172a));
  border-radius: 12px;
  box-shadow: 0 4px 14px var(--row-accent-soft);
}

.base-rail__text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.base-rail__name {
  font-size: 1.02rem;
  font-weight: 650;
  color: #f8fafc;
  letter-spacing: 0.01em;
}

.base-rail__hint {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: rgba(226, 232, 240, 0.45);
}

.base-rail__stat {
  grid-column: 2;
  grid-row: 1;
  align-self: center;
  font-variant-numeric: tabular-nums;
  font-size: 1.65rem;
  font-weight: 800;
  line-height: 1;
  background: linear-gradient(180deg, #fff 0%, rgba(226, 232, 240, 0.82) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.base-rail__track {
  grid-column: 1 / -1;
  grid-row: 2;
  height: 5px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
}

.base-rail__fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--row-accent), color-mix(in srgb, var(--row-accent) 55%, #fff));
  box-shadow: 0 0 16px var(--row-accent-soft);
  transition: width 1s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Flow steps — automação */
.flow-steps {
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
  position: relative;
}

.flow-steps::before {
  content: '';
  position: absolute;
  left: 1.15rem;
  top: 1.5rem;
  bottom: 1.5rem;
  width: 2px;
  border-radius: 2px;
  background: linear-gradient(180deg, rgba(139, 92, 246, 0.55), rgba(31, 208, 255, 0.25), rgba(34, 197, 94, 0.2));
  opacity: 0.85;
}

.flow-steps__item {
  position: relative;
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  padding: 0.85rem 0;
  animation: slide-in-up 0.55s ease-out both;
}

.flow-steps__item:last-child {
  padding-bottom: 0;
}

.flow-steps__num {
  flex-shrink: 0;
  width: 2.35rem;
  height: 2.35rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  color: #c4b5fd;
  background: linear-gradient(145deg, rgba(139, 92, 246, 0.35), rgba(15, 23, 42, 0.9));
  border: 1px solid rgba(139, 92, 246, 0.35);
  border-radius: 12px;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.35);
  z-index: 1;
}

.flow-steps__body {
  flex: 1;
  display: flex;
  gap: 0.85rem;
  align-items: center;
  padding: 0.85rem 1rem;
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  background:
    linear-gradient(125deg, rgba(255, 255, 255, 0.05), transparent 50%),
    rgba(15, 23, 42, 0.45);
  transition: border-color 0.25s ease, transform 0.25s ease, box-shadow 0.25s ease;
}

.flow-steps__item:hover .flow-steps__body {
  border-color: rgba(139, 92, 246, 0.35);
  transform: translateX(4px);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);
}

.flow-steps__icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  flex-shrink: 0;
  background: linear-gradient(145deg, rgba(139, 92, 246, 0.45), rgba(31, 208, 255, 0.2));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.flow-steps__icon--login::before { content: '🔐'; }
.flow-steps__icon--download::before { content: '📥'; }
.flow-steps__icon--parse::before { content: '⚙️'; }
.flow-steps__icon--save::before { content: '💾'; }

.flow-steps__text {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.45;
  color: rgba(241, 245, 249, 0.92);
}

/* Panorama do período — mesma casca visual, dados dos gráficos */
.period-card {
  margin-top: 0.5rem;
  padding: 1px;
  border-radius: 20px;
  background: linear-gradient(
    135deg,
    rgba(34, 211, 238, 0.38),
    rgba(45, 212, 191, 0.22) 45%,
    rgba(99, 102, 241, 0.2) 100%
  );
  box-shadow:
    0 20px 50px rgba(0, 0, 0, 0.45),
    0 0 0 1px rgba(255, 255, 255, 0.06) inset;
}

.period-card__masthead {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.65rem 1rem;
  padding: 0.85rem 1.1rem 0.65rem;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.88));
  border-radius: 19px 19px 0 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.period-card__dots {
  display: flex;
  gap: 0.35rem;
}

.period-card__dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.period-card__dots span:nth-child(1) {
  background: #f87171;
  box-shadow: 0 0 8px rgba(248, 113, 113, 0.55);
}

.period-card__dots span:nth-child(2) {
  background: #fbbf24;
  box-shadow: 0 0 8px rgba(251, 191, 36, 0.45);
}

.period-card__dots span:nth-child(3) {
  background: #4ade80;
  box-shadow: 0 0 8px rgba(74, 222, 128, 0.45);
}

.period-card__masthead-copy {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
  flex: 1;
}

.period-card__eyebrow {
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(103, 232, 249, 0.85);
}

.period-card__filename {
  font-family: ui-monospace, 'Cascadia Code', Menlo, Consolas, monospace;
  font-size: 0.82rem;
  font-weight: 600;
  color: #e2e8f0;
  line-height: 1.35;
  word-break: break-word;
}

.period-card__chip {
  margin-left: auto;
  padding: 0.3rem 0.65rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(167, 139, 250, 0.98);
  background: rgba(99, 102, 241, 0.12);
  border: 1px solid rgba(139, 92, 246, 0.35);
  border-radius: 999px;
}

.period-spec-list {
  list-style: none;
  margin: 0;
  padding: 0.65rem 0.65rem 0.85rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  background: radial-gradient(120% 80% at 12% 0%, rgba(34, 211, 238, 0.1), transparent 55%),
    linear-gradient(180deg, rgba(2, 6, 23, 0.97), rgba(15, 23, 42, 0.94));
  border-radius: 0 0 18px 18px;
}

.period-spec {
  position: relative;
  display: flex;
  gap: 0;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(15, 23, 42, 0.45);
  transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
}

.period-spec:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.12);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
}

.period-spec__accent {
  width: 5px;
  flex-shrink: 0;
  background: linear-gradient(180deg, var(--period-accent, #22d3ee), transparent);
  opacity: 0.95;
}

.period-spec--avg {
  --period-accent: #fbbf24;
}

.period-spec--spread {
  --period-accent: #a78bfa;
}

.period-spec--volume {
  --period-accent: #22d3ee;
}

.period-spec__inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.45rem;
  padding: 0.85rem 1rem 0.9rem 0.85rem;
  min-width: 0;
}

.period-spec__label {
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.92);
}

.period-spec__value {
  display: block;
  width: 100%;
  font-family: ui-monospace, 'Cascadia Code', 'Segoe UI Mono', Menlo, Consolas, monospace;
  font-size: 0.95rem;
  font-weight: 700;
  color: #5eead4;
  padding: 0.45rem 0.75rem;
  border-radius: 10px;
  background: linear-gradient(145deg, rgba(2, 6, 23, 0.95), rgba(15, 23, 42, 0.85));
  border: 1px solid rgba(45, 212, 191, 0.22);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
  word-break: break-word;
}

.period-spec__value--multiline {
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.45;
}

.config-note--period {
  margin: 1.15rem 0 0;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem 1.1rem;
  border-radius: 14px;
  background: linear-gradient(125deg, rgba(34, 211, 238, 0.08), rgba(15, 23, 42, 0.55));
  border: 1px solid rgba(34, 211, 238, 0.2);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
}

.config-note__mark {
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  margin-top: 0.1rem;
  border-radius: 8px;
  background: linear-gradient(145deg, rgba(245, 158, 11, 0.35), rgba(245, 158, 11, 0.08));
  border: 1px solid rgba(251, 191, 36, 0.35);
  position: relative;
}

.config-note__mark--period {
  background: linear-gradient(145deg, rgba(34, 211, 238, 0.35), rgba(34, 211, 238, 0.08));
  border-color: rgba(103, 232, 249, 0.4);
}

.config-note__mark::after {
  content: '';
  position: absolute;
  inset: 0;
  margin: auto;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #fbbf24;
  box-shadow: 0 0 12px rgba(251, 191, 36, 0.6);
}

.config-note__mark--period::after {
  background: #22d3ee;
  box-shadow: 0 0 12px rgba(34, 211, 238, 0.55);
}

.config-note__text {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.55;
  color: rgba(226, 232, 240, 0.88);
}

/* Enhanced Charts with Higher Specificity */
.charts-container {
  display: grid !important;
  gap: 3rem !important;
  margin: 2rem 0 !important;
}

.chart-card {
  position: relative !important;
  background: rgba(15, 23, 42, 0.8) !important;
  backdrop-filter: blur(12px) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 32px !important;
  padding: 2.5rem !important;
  overflow: visible;
  transition: box-shadow 0.25s ease, border-color 0.25s ease !important;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3) !important;
}

.chart-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05), transparent 50%);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.chart-card:hover {
  transform: none !important;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35) !important;
}

.chart-card:hover::before {
  opacity: 1;
}

.chart-card--primary {
  background: 
    radial-gradient(circle at 20% 80%, rgba(31, 208, 255, 0.15), transparent 60%),
    rgba(15, 23, 42, 0.8) !important;
  border-color: rgba(31, 208, 255, 0.2) !important;
}

.chart-card--secondary {
  background: 
    radial-gradient(circle at 80% 20%, rgba(132, 204, 22, 0.15), transparent 60%),
    rgba(15, 23, 42, 0.8) !important;
  border-color: rgba(132, 204, 22, 0.2) !important;
}

/* Enhanced Chart Elements with Specificity */
.chart-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: flex-start !important;
  margin-bottom: 2rem !important;
  gap: 2rem !important;
  flex-wrap: wrap !important;
}

.chart-info {
  flex: 1 !important;
  min-width: 250px !important;
}

.chart-badge {
  display: inline-flex !important;
  align-items: center !important;
  gap: 0.5rem !important;
  padding: 0.75rem 1.5rem !important;
  background: rgba(31, 208, 255, 0.15) !important;
  color: #1fd0ff !important;
  border-radius: 20px !important;
  font-size: 0.875rem !important;
  font-weight: 700 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.1em !important;
  margin-bottom: 1.5rem !important;
  box-shadow: 0 4px 16px rgba(31, 208, 255, 0.2) !important;
}

.chart-badge--monthly {
  background: rgba(34, 197, 94, 0.12) !important;
  color: #4ade80 !important;
  box-shadow: 0 4px 16px rgba(34, 197, 94, 0.15) !important;
}

.chart-icon::before {
  content: "📊" !important;
  font-size: 1.2rem !important;
  margin-right: 0.5rem !important;
}

.chart-title {
  margin: 0 0 0.75rem !important;
  font-size: 2rem !important;
  font-weight: 800 !important;
  color: #f8fafc !important;
  line-height: 1.2 !important;
  background: linear-gradient(135deg, #f8fafc 0%, #1fd0ff 50%, #2f6df6 100%) !important;
  -webkit-background-clip: text !important;
  background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
}

.chart-subtitle {
  margin: 0 !important;
  color: #f8fafc !important;
  font-size: 1.1rem !important;
  font-weight: 500 !important;
  line-height: 1.4 !important;
  opacity: 0.9 !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3) !important;
}

.chart-controls {
  display: flex !important;
  gap: 1.5rem !important;
  align-items: end !important;
  flex-wrap: wrap !important;
}

/* Chart Controls with Enhanced Specificity */
.chart-date-control {
  min-width: 200px !important;
}

.chart-date-control label {
  display: flex !important;
  flex-direction: column !important;
  gap: 0.5rem !important;
}

.chart-date-control span {
  font-size: 0.875rem !important;
  color: #f8fafc !important;
  font-weight: 600 !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3) !important;
  opacity: 0.95 !important;
}

.export-controls {
  display: flex !important;
  gap: 0.75rem !important;
}

.export-btn {
  display: flex !important;
  align-items: center !important;
  gap: 0.5rem !important;
  padding: 0.75rem 1.25rem !important;
  border-radius: 16px !important;
  font-weight: 600 !important;
  font-size: 0.875rem !important;
  cursor: pointer !important;
  transition: var(--transition-bounce) !important;
  border: none !important;
  position: relative !important;
  overflow: hidden !important;
}

.export-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(255,255,255,0.18), transparent 45%);
  opacity: 0;
  transition: opacity 0.35s ease;
  pointer-events: none;
}

.export-btn:hover::after {
  opacity: 1;
}

.export-btn:active {
  transform: scale(0.97) !important;
}

.export-btn--primary {
  background: var(--primary-gradient) !important;
  color: #0a0f1a !important;
  box-shadow: 0 4px 16px rgba(31, 208, 255, 0.3) !important;
}

.export-btn--secondary {
  background: rgba(255, 255, 255, 0.1) !important;
  color: #f8fafc !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
}

.export-btn:hover {
  transform: translateY(-2px) scale(1.05) !important;
}

.export-btn:disabled {
  opacity: 0.6 !important;
  cursor: not-allowed !important;
  transform: none !important;
}

/* Contraste legível — Visualização (Heatmap/Barras) e exportação PNG/PDF */
.kzn-charts .chart-mode-group .field-label {
  color: rgba(248, 250, 252, 1) !important;
}

.kzn-charts .chart-mode-group .toggle-group {
  background: rgba(15, 23, 42, 0.95) !important;
  border: 1px solid rgba(148, 163, 184, 0.35) !important;
}

/* Inativo: texto sólido + sombra; evita texto “sumido” por clip/gradient herdado */
.kzn-charts .chart-mode-group .toggle-btn:not(.toggle-btn--active) {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  -webkit-background-clip: border-box !important;
  background-clip: border-box !important;
  background-color: transparent !important;
  background-image: none !important;
  opacity: 1 !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.55);
}

/* Selecionado: fundo em gradiente explícito + texto claro (legível se o gradiente falhar no paint) */
.kzn-charts .chart-mode-group .toggle-btn--active {
  -webkit-background-clip: border-box !important;
  background-clip: border-box !important;
  background-color: #0ea5e9 !important;
  background-image: linear-gradient(135deg, #22d3ee 0%, #0ea5e9 50%, #2563eb 100%) !important;
  color: #f8fafc !important;
  -webkit-text-fill-color: #f8fafc !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35) !important;
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.22) !important;
  font-weight: 700 !important;
}

.chart-controls .export-btn--primary {
  background: linear-gradient(135deg, #22d3ee 0%, #0ea5e9 55%, #2563eb 100%) !important;
  color: #f8fafc !important;
  -webkit-text-fill-color: #f8fafc !important;
  font-weight: 700 !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.35) !important;
}

.chart-controls .export-btn--primary:hover:not(:disabled) {
  filter: brightness(1.07) !important;
}

.chart-controls .export-btn--secondary {
  color: #f8fafc !important;
  -webkit-text-fill-color: #f8fafc !important;
  background: rgba(30, 41, 59, 0.9) !important;
  border: 1px solid rgba(148, 163, 184, 0.35) !important;
}

.export-icon::before { 
  content: "🖼️" !important; 
}
.pdf-icon::before { 
  content: "📄" !important; 
}

/* Enhanced Stats Showcase */
.stats-showcase {
  display: grid !important;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)) !important;
  gap: 1rem !important;
  margin-bottom: 2rem !important;
}

.stat-tile {
  position: relative !important;
  padding: 1.8rem 1.2rem !important;
  background: rgba(30, 41, 59, 0.85) !important;
  border: 2px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 24px !important;
  text-align: center !important;
  transition: var(--transition-bounce) !important;
  overflow: hidden !important;
  cursor: pointer !important;
  backdrop-filter: blur(20px) !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
}

.stat-tile:hover {
  transform: scale(1.08) !important;
  border-color: rgba(31, 208, 255, 0.4) !important;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4), 0 0 20px rgba(31, 208, 255, 0.2) !important;
}

.stat-background {
  position: absolute !important;
  inset: 0 !important;
  background: radial-gradient(circle, rgba(31, 208, 255, 0.05), transparent 70%) !important;
  opacity: 0 !important;
  transition: var(--transition-smooth) !important;
}

.stat-tile:hover .stat-background {
  opacity: 1 !important;
}

.stat-value {
  display: block !important;
  font-size: 1.8rem !important;
  font-weight: 900 !important;
  margin-bottom: 0.5rem !important;
  color: #ffffff !important;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3) !important;
  line-height: 1.2 !important;
}

.stat-value--type-0 {
  color: #1fd0ff !important;
  text-shadow: 0 0 20px rgba(31, 208, 255, 0.5) !important;
}

.stat-value--type-1 {
  color: #84cc16 !important;
  text-shadow: 0 0 20px rgba(132, 204, 22, 0.5) !important;
}

.stat-value--type-2 {
  color: #a855f7 !important;
  text-shadow: 0 0 20px rgba(168, 85, 247, 0.5) !important;
}

.stat-label {
  color: #f8fafc !important;
  font-size: 0.9rem !important;
  font-weight: 600 !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5) !important;
  opacity: 0.95 !important;
}

/* Enhanced Chart Legend */
.chart-legend {
  display: flex !important;
  gap: 1.5rem !important;
  margin-bottom: 2rem !important;
  flex-wrap: wrap !important;
}

.legend-item {
  display: flex !important;
  align-items: center !important;
  gap: 0.75rem !important;
  padding: 0.75rem 1rem !important;
  background: rgba(30, 41, 59, 0.8) !important;
  border-radius: 12px !important;
  color: #f8fafc !important;
  font-weight: 600 !important;
  font-size: 0.875rem !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3) !important;
}

.legend-dot {
  width: 12px !important;
  height: 12px !important;
  border-radius: 50% !important;
}

.legend-item__text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  line-height: 1.25;
}

.legend-item__sub {
  font-size: 0.75rem !important;
  font-weight: 500 !important;
  color: rgba(226, 232, 240, 0.75) !important;
}

.chart-legend-note {
  margin: -0.75rem 0 1.25rem !important;
  font-size: 0.8125rem !important;
  line-height: 1.45 !important;
  color: rgba(148, 163, 184, 0.95) !important;
  max-width: min(52rem, 100%);
}

.legend-item--ontime .legend-dot {
  background: #7ecfb9 !important;
  box-shadow: none !important;
}

.legend-item--late .legend-dot {
  background: #e8b4b0 !important;
  box-shadow: none !important;
}

.chart-container {
  position: relative !important;
  min-height: 400px !important;
  padding: 1.25rem 1rem 1.25rem 0.75rem !important;
  background: rgba(30, 41, 59, 0.88) !important;
  border: 1px solid rgba(255, 255, 255, 0.12) !important;
  border-radius: 24px !important;
  backdrop-filter: blur(8px) !important;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25) !important;
  overflow-x: auto;
  overflow-y: visible;
}

/* Área capturada em PNG/PDF: só o bloco do gráfico (título Apex + heatmap + eixos) */
.chart-container--export {
  isolation: isolate;
  background: rgba(30, 41, 59, 0.98) !important;
}

.chart-loading {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  height: 400px !important;
  gap: 1rem !important;
  color: rgba(248, 250, 252, 0.8) !important;
}

.chart-empty {
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  min-height: 400px !important;
  padding: 1rem !important;
  text-align: center !important;
  color: #9db4d1 !important;
  font-size: 0.95rem !important;
}

.loading-spinner {
  width: 40px !important;
  height: 40px !important;
  border: 3px solid rgba(31, 208, 255, 0.2) !important;
  border-top-color: #1fd0ff !important;
  border-radius: 50% !important;
  animation: spin 1s linear infinite !important;
}

.loading-spinner--large {
  width: 60px !important;
  height: 60px !important;
  border-width: 4px !important;
}

.chart-component {
  border-radius: 16px !important;
  overflow: visible !important;
  min-width: min(100%, 520px);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: geometricPrecision;
}

.chart-heatmap-hint {
  margin: -0.5rem 0 1.25rem !important;
  font-size: 0.8125rem !important;
  line-height: 1.45 !important;
  color: rgba(148, 163, 184, 0.95) !important;
  max-width: min(52rem, 100%);
}

/* Data Section - Enhanced Table */
.data-section {
  margin-top: 2rem;
}

.data-card {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius-xl);
  padding: 2.5rem;
  overflow: hidden;
}

.data-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  gap: 2rem;
  flex-wrap: wrap;
}

.data-info {
  flex: 1;
  min-width: 250px;
}

.data-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  border-radius: 16px;
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 1rem;
}

.data-icon::before {
  content: "📊";
}

.data-title {
  margin: 0 0 0.5rem;
  font-size: 1.75rem;
  font-weight: 700;
  color: #f8fafc;
}

.data-subtitle {
  margin: 0;
  color: rgba(248, 250, 252, 0.7);
}

.data-controls {
  display: flex;
  gap: 2rem;
  align-items: end;
  flex-wrap: wrap;
}

.filter-control {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.filter-label {
  font-size: 0.875rem;
  color: rgba(248, 250, 252, 0.8);
  font-weight: 600;
}

.filter-buttons {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(15, 23, 42, 0.8);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.filter-btn {
  position: relative;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 12px;
  background: transparent;
  color: rgba(248, 250, 252, 0.7);
  font-weight: 600;
  font-size: 0.875rem;
  cursor: pointer;
  transition: var(--transition-smooth);
  overflow: hidden;
}

.filter-btn--active {
  background: var(--primary-gradient) !important;
  color: #0a0f1a !important;
  font-weight: 700 !important;
}

.filter-ripple {
  position: absolute !important;
  inset: 0 !important;
  background: radial-gradient(circle, rgba(31, 208, 255, 0.2) 0%, transparent 50%) !important;
  opacity: 0 !important;
  transform: scale(0) !important;
  transition: var(--transition-smooth) !important;
}

.filter-btn:hover .filter-ripple {
  opacity: 1 !important;
  transform: scale(1) !important;
}

.refresh-btn {
  display: flex !important;
  align-items: center !important;
  gap: 0.75rem !important;
  padding: 0.875rem 1.5rem !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  border-radius: 16px !important;
  background: rgba(255, 255, 255, 0.05) !important;
  color: #f8fafc !important;
  font-weight: 600 !important;
  cursor: pointer !important;
  transition: var(--transition-bounce) !important;
}

.refresh-btn:hover {
  background: rgba(255, 255, 255, 0.1) !important;
  border-color: rgba(31, 208, 255, 0.3) !important;
  transform: scale(1.05) !important;
}

.refresh-icon::before {
  content: "🔄";
}

.refresh-icon--spinning {
  animation: spin 1s linear infinite;
}

/* Enhanced Status Messages with Specificity */
.message-container {
  margin: 1.5rem 0 !important;
}

.status-message {
  display: flex !important;
  align-items: center !important;
  gap: 1rem !important;
  padding: 1rem 1.5rem !important;
  border-radius: 16px !important;
  margin-bottom: 0.75rem !important;
  backdrop-filter: blur(10px) !important;
  border: 1px solid transparent !important;
  transition: var(--transition-smooth) !important;
}

.status-message--error {
  background: rgba(239, 68, 68, 0.1) !important;
  border-color: rgba(239, 68, 68, 0.3) !important;
  color: #fecaca !important;
}

.status-message--success {
  background: rgba(34, 197, 94, 0.1) !important;
  border-color: rgba(34, 197, 94, 0.3) !important;
  color: #bbf7d0 !important;
}

.status-message--warning {
  background: rgba(245, 158, 11, 0.1) !important;
  border-color: rgba(245, 158, 11, 0.3) !important;
  color: #fde68a !important;
}

.message-icon {
  font-size: 1.25rem;
}

.message-icon--error::before { content: "❌"; }
.message-icon--success::before { content: "✅"; }
.message-icon--warning::before { content: "⚠️"; }

/* Message Transitions */
.message-slide-enter-active, .message-slide-leave-active {
  transition: var(--transition-smooth);
}

.message-slide-enter-from, .message-slide-leave-to {
  opacity: 0 !important;
  transform: translateY(-10px) !important;
}

/* Expand Transition */
.expand-enter-active, .expand-leave-active {
  transition: var(--transition-smooth) !important;
  transform-origin: top !important;
}

.expand-enter-from, .expand-leave-to {
  opacity: 0 !important;
  max-height: 0 !important;
  transform: scaleY(0) !important;
}

/* Enhanced Sync Log with Specificity */
.sync-log-section {
  margin: 2rem 0 !important;
  background: rgba(15, 23, 42, 0.8) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 20px !important;
  padding: 1.5rem !important;
  backdrop-filter: blur(10px) !important;
}

.log-header {
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  margin-bottom: 1.5rem !important;
  gap: 1rem !important;
}

.log-title {
  display: flex !important;
  align-items: center !important;
  gap: 0.75rem !important;
  color: #f8fafc !important;
  font-weight: 700 !important;
}

.log-icon::before {
  content: "📋" !important;
}

.log-status {
  padding: 0.5rem 1rem !important;
  border-radius: 12px !important;
  font-size: 0.875rem !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
}

.log-status--running {
  background: rgba(31, 208, 255, 0.1) !important;
  color: #1fd0ff !important;
}

.log-status--completed {
  background: rgba(34, 197, 94, 0.1) !important;
  color: #22c55e !important;
}

.log-status--failed {
  background: rgba(239, 68, 68, 0.1) !important;
  color: #ef4444 !important;
}

.log-container {
  max-height: 300px !important;
  overflow-y: auto !important;
  padding-right: 0.5rem !important;
}

.log-container::-webkit-scrollbar {
  width: 6px !important;
}

.log-container::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05) !important;
  border-radius: 3px !important;
}

.log-container::-webkit-scrollbar-thumb {
  background: rgba(31, 208, 255, 0.3) !important;
  border-radius: 3px !important;
}

.log-entry {
  position: relative !important;
  display: grid !important;
  grid-template-columns: 100px 1fr auto !important;
  align-items: center !important;
  gap: 1rem !important;
  padding: 1rem !important;
  margin-bottom: 0.75rem !important;
  background: rgba(255, 255, 255, 0.03) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 12px !important;
  transition: var(--transition-smooth) !important;
  animation: slide-in-up 0.4s ease-out both !important;
  animation-delay: var(--delay) !important;
}

.log-entry:hover {
  background: rgba(255, 255, 255, 0.05) !important;
  border-color: rgba(31, 208, 255, 0.2) !important;
}

.log-entry--error {
  border-color: rgba(239, 68, 68, 0.3) !important;
}

.log-entry--warning {
  border-color: rgba(245, 158, 11, 0.3) !important;
}

.log-time {
  font-family: monospace !important;
  font-size: 0.875rem !important;
  color: #1fd0ff !important;
  font-weight: 600 !important;
}

.log-message {
  color: rgba(248, 250, 252, 0.9) !important;
  font-size: 0.875rem !important;
  line-height: 1.4 !important;
}

.log-indicator {
  width: 8px !important;
  height: 8px !important;
  border-radius: 50% !important;
  background: #22c55e !important;
  flex-shrink: 0 !important;
}

.log-entry--error .log-indicator {
  background: #ef4444 !important;
}

.log-entry--warning .log-indicator {
  background: #f59e0b !important;
}

/* Enhanced Modern Data Table */
.table-container {
  margin-top: 2rem !important;
}

.table-loading {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;
  height: 200px !important;
  gap: 1rem !important;
  color: rgba(248, 250, 252, 0.8) !important;
}

.table-wrapper {
  overflow: auto !important;
  border-radius: 20px !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  background: rgba(15, 23, 42, 0.8) !important;
  backdrop-filter: blur(10px) !important;
}

.modern-table {
  width: 100% !important;
  min-width: 800px !important;
  border-collapse: separate !important;
  border-spacing: 0 !important;
}

.table-head {
  background: rgba(15, 23, 42, 0.9) !important;
  border-bottom: 2px solid rgba(31, 208, 255, 0.2) !important;
}

.table-header {
  padding: 1.25rem 1rem !important;
  text-align: left !important;
  font-size: 0.875rem !important;
  font-weight: 700 !important;
  color: #ffffff !important;
  text-transform: uppercase !important;
  letter-spacing: 0.05em !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important;
  position: sticky !important;
  top: 0 !important;
  z-index: 10 !important;
  background: rgba(15, 23, 42, 0.95) !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5) !important;
}

.table-body {
  background: transparent !important;
}

.table-row {
  transition: var(--transition-smooth);
  animation: slide-in-up 0.3s ease-out both;
  animation-delay: var(--delay);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.table-row:hover {
  background: rgba(31, 208, 255, 0.05);
  transform: scale(1.01);
}

.table-cell {
  padding: 1rem;
  color: rgba(248, 250, 252, 0.9);
  font-size: 0.875rem;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  vertical-align: middle;
}

.table-cell:last-child {
  border-right: none;
}

.table-cell--date {
  font-weight: 600;
  color: #1fd0ff;
  font-family: monospace;
}

.table-cell--team {
  font-weight: 600;
}

.team-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.team-name {
  font-weight: 700;
  color: #f8fafc;
}

.team-base {
  font-size: 0.75rem;
  color: rgba(248, 250, 252, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.table-cell--time {
  text-align: center;
}

.time-badge {
  display: inline-block;
  padding: 0.5rem 0.75rem;
  border-radius: 12px;
  font-weight: 600;
  font-family: monospace;
  font-size: 0.875rem;
}

.time-badge--ontime {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.time-badge--late {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.time-badge--empty {
  background: rgba(255, 255, 255, 0.05);
  color: rgba(248, 250, 252, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.table-cell--source {
  text-align: center;
}

.source-tag {
  display: inline-block;
  padding: 0.5rem 0.75rem;
  background: rgba(99, 102, 241, 0.1);
  color: #6366f1;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.table-cell--sync {
  font-family: monospace;
  font-size: 0.8rem;
  color: rgba(248, 250, 252, 0.7);
}

.empty-row {
  height: 200px;
}

.empty-cell {
  text-align: center;
  padding: 3rem 2rem;
  border: none;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  color: rgba(248, 250, 252, 0.6);
}

.empty-icon::before {
  content: "📄";
  font-size: 3rem;
  opacity: 0.5;
}

/* Barra de ações: empilha em telas estreitas; evita faixa vazia entre toggle e sync */
@media (max-width: 600px) {
  .control-panel__toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .period-selector--toolbar {
    max-width: none;
  }

  .sync-button--toolbar {
    width: 100%;
  }
}

/* Responsive Design */
@media (max-width: 1200px) {
  .controls-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .chart-header,
  .data-header {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 768px) {
  .kzn-page__wrap {
    padding: 0.9rem max(0.65rem, env(safe-area-inset-left, 0px)) 2.25rem max(0.65rem, env(safe-area-inset-right, 0px));
    gap: 1.65rem;
  }

  .charts-container.kzn-charts {
    gap: 2rem !important;
    margin: 1.25rem 0 !important;
  }

  .kzn-charts .chart-card {
    padding: clamp(1.15rem, 3.5vw, 2rem) !important;
  }
  
  .title-section {
    min-width: auto;
  }
  
  .main-title .title-gradient {
    font-size: clamp(2rem, 10vw, 4rem);
  }

  .toggle-group--toolbar {
    width: 100%;
  }

  .toggle-group--toolbar .toggle-btn {
    flex: 1 1 0;
    min-width: 0;
    padding: 0.65rem 0.85rem;
    font-size: 0.9rem;
  }
  
  .control-group {
    flex-direction: column;
    align-items: stretch;
  }
  
  .modern-field {
    min-width: auto;
  }
  
  .toggle-group:not(.toggle-group--toolbar) {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .stats-showcase {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .chart-legend {
    justify-content: center;
  }
  
  .filter-buttons {
    flex-wrap: wrap;
  }
  
  .data-controls {
    flex-direction: column;
    align-items: stretch;
  }
}

@media (max-width: 480px) {
  .kzn-page__wrap {
    padding: 0.7rem 0.6rem 1.85rem;
  }
  
  .info-card,
  .chart-card,
  .data-card {
    padding: clamp(1rem, 4vw, 1.5rem);
  }
  
  .stats-showcase {
    grid-template-columns: 1fr;
  }

  .metrics-row {
    grid-template-columns: 1fr;
  }
  
  .chart-container {
    padding: 1rem;
  }
}

/* Enhanced ApexCharts Integration */
:global(.apexcharts-canvas) {
  font-family: inherit !important;
}

/* Nomes das equipes: âncora à direita para o texto não invadir o heatmap */
:global(.chart-component .apexcharts-yaxis-label text),
:global(.chart-component .apexcharts-yaxis-label tspan) {
  text-anchor: end !important;
}

:global(.apexcharts-tooltip.apexcharts-theme-dark) {
  background: rgba(15, 23, 42, 0.95) !important;
  border: 1px solid rgba(31, 208, 255, 0.3) !important;
  box-shadow: var(--shadow-glow) !important;
  backdrop-filter: blur(20px);
}

:global(.apexcharts-heatmap-rect) {
  stroke: rgba(15, 23, 42, 0.94) !important;
  stroke-width: 2px !important;
}

/* Anotações X só exibem rótulos de data (sem linhas verticais) */
:global(.chart-component .apexcharts-xaxis-annotations line) {
  stroke: transparent !important;
  stroke-width: 0 !important;
}

/* Horários nas células — peso/contraste (tamanho nas opções Apex: maior no mensal para WhatsApp) */
:global(.chart-component .apexcharts-heatmap-series text.apexcharts-text),
:global(.chart-component .apexcharts-heatmap-series text.apexcharts-datalabel-label) {
  font-weight: 700 !important;
  letter-spacing: 0.03em;
  fill: #0f172a !important;
}

/* Destaque da linha (equipe) ao passar o mouse */
:global(.chart-component .apexcharts-inner:hover .apexcharts-heatmap-series:not(:hover) .apexcharts-heatmap-rect) {
  opacity: 0.42;
}

:global(.chart-component .apexcharts-heatmap-series:hover .apexcharts-heatmap-rect) {
  opacity: 1;
  stroke: rgba(56, 189, 248, 0.85) !important;
  stroke-width: 2px !important;
}

:global(.kaizen-tooltip) {
  padding: 0.85rem 1rem !important;
  border-radius: 12px !important;
  background: rgba(15, 23, 42, 0.98) !important;
  border: 1px solid rgba(148, 163, 184, 0.25) !important;
  backdrop-filter: blur(8px);
  min-width: 220px;
}

:global(.kaizen-tooltip__row) {
  display: flex !important;
  justify-content: space-between !important;
  gap: 1rem !important;
  align-items: baseline !important;
  margin-bottom: 0.4rem !important;
  font-size: 0.8125rem !important;
}

:global(.kaizen-tooltip__row--accent) {
  margin-top: 0.35rem !important;
  padding-top: 0.35rem !important;
  border-top: 1px solid rgba(148, 163, 184, 0.2) !important;
}

:global(.kaizen-tooltip__key) {
  color: rgba(148, 163, 184, 0.95) !important;
  font-weight: 600 !important;
}

:global(.kaizen-tooltip__val) {
  color: #f1f5f9 !important;
  font-weight: 600 !important;
  text-align: right !important;
}

:global(.kaizen-tooltip__row--accent .kaizen-tooltip__val) {
  font-size: 1rem !important;
  font-weight: 700 !important;
  color: #e2e8f0 !important;
}

:global(.kaizen-tooltip__status) {
  display: flex !important;
  align-items: center !important;
  gap: 0.45rem !important;
  margin: 0.5rem 0 !important;
  padding: 0.35rem 0.5rem !important;
  border-radius: 8px !important;
  font-size: 0.8125rem !important;
  font-weight: 600 !important;
}

:global(.kaizen-tooltip__status.is-ok) {
  background: rgba(126, 207, 185, 0.18) !important;
  color: #a7e8d3 !important;
}

:global(.kaizen-tooltip__status.is-late) {
  background: rgba(232, 180, 176, 0.2) !important;
  color: #f5cfcb !important;
}

:global(.kaizen-tooltip__status.is-empty) {
  background: rgba(148, 163, 184, 0.12) !important;
  color: #94a3b8 !important;
}

:global(.kaizen-tooltip__icon) {
  font-weight: 800 !important;
  opacity: 0.95;
}

:global(.kaizen-tooltip__avg) {
  display: flex !important;
  flex-direction: column !important;
  gap: 0.2rem !important;
  margin-top: 0.35rem !important;
  padding-top: 0.5rem !important;
  border-top: 1px solid rgba(148, 163, 184, 0.25) !important;
}

:global(.kaizen-tooltip__avg-label) {
  font-size: 0.7rem !important;
  text-transform: uppercase !important;
  letter-spacing: 0.06em !important;
  color: rgba(148, 163, 184, 0.9) !important;
  font-weight: 700 !important;
}

:global(.kaizen-tooltip__avg-val) {
  font-size: 1.05rem !important;
  font-weight: 800 !important;
  color: #7ecfb9 !important;
}

/* —— Seções de gráficos e dados (layout v2) —— */
.charts-container.kzn-charts {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  padding: 0;
}

.kzn-charts .chart-card {
  border-radius: 26px !important;
  border-color: rgba(99, 179, 237, 0.14) !important;
  background:
    linear-gradient(165deg, rgba(15, 23, 42, 0.65) 0%, rgba(2, 6, 23, 0.85) 100%) !important;
}

.data-section.kzn-data {
  padding: 0;
}

.kzn-data .data-card {
  border-radius: 26px;
  border: 1px solid rgba(99, 179, 237, 0.12);
  background: linear-gradient(180deg, rgba(11, 18, 38, 0.92), rgba(3, 7, 18, 0.96));
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
}

@media (max-width: 768px) {
  .page-header.kzn-hero {
    gap: 1.25rem;
  }

  .control-panel__toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .period-selector--toolbar {
    width: 100%;
  }

  .toggle-group--toolbar {
    width: 100%;
  }

  .sync-button--toolbar {
    width: 100%;
  }
}
</style>
