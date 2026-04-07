<template>
  <section class="kaizen-page">
    <!-- Modern Floating Header -->
    <header class="page-header" data-aos="fade-down">
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
      
      <!-- Dynamic Control Panel -->
      <div class="control-panel" data-aos="fade-left" data-aos-delay="100">
        <div class="controls-grid">
          <div class="control-group">
            <label class="modern-field">
              <span class="field-label">{{ historySelectorLabel }}</span>
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
            
            <label class="modern-field">
              <span class="field-label">Início do sync</span>
              <div class="input-container">
                <input v-model="syncStartDate" type="date" class="modern-input">
                <div class="input-glow"></div>
              </div>
            </label>
            
            <label class="modern-field">
              <span class="field-label">Fim do sync</span>
              <div class="input-container">
                <input v-model="syncEndDate" type="date" class="modern-input">
                <div class="input-glow"></div>
              </div>
            </label>
          </div>

          <div class="control-group">
            <div class="period-selector">
              <span class="field-label">Visualização</span>
              <div class="toggle-group">
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
              class="sync-button"
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
        
        <!-- Enhanced Sync Status Panel -->
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

    <!-- Dynamic Info Grid -->
    <section class="info-grid" data-aos="fade-up" data-aos-delay="200">
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
      <article class="info-card info-card--bases" data-tilt data-aos="fade-up" data-aos-delay="300">
        <div class="card-background">
          <div class="card-glow"></div>
        </div>
        <div class="card-content">
          <div class="card-header">
            <span class="card-badge">
              <i class="badge-icon"></i>
              Distribuição por Base
            </span>
          </div>
          <h3 class="card-title">Equipes por localização</h3>
          <div class="base-grid">
            <div 
              v-for="(count, base) in baseSummary" 
              :key="base"
              class="base-item"
              @mouseenter="highlightBase(base)"
              @mouseleave="clearHighlight"
            >
              <div class="base-info">
                <strong class="base-name">{{ getBaseName(base) }}</strong>
                <div class="base-count-container">
                  <span class="base-count" :data-count="count">{{ count }}</span>
                  <div class="count-animation"></div>
                </div>
              </div>
              <div class="base-progress">
                <div 
                  class="base-progress-fill" 
                  :style="{ width: `${(count / Math.max(1, Object.values(baseSummary).reduce((a, b) => Math.max(a, b), 1))) * 100}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </article>

      <!-- Interactive Features Card -->
      <article class="info-card info-card--features" data-tilt data-aos="fade-up" data-aos-delay="400">
        <div class="card-background">
          <div class="card-glow"></div>
        </div>
        <div class="card-content">
          <div class="card-header">
            <span class="card-badge">
              <i class="badge-icon"></i>
              Automação Ativa
            </span>
          </div>
          <h3 class="card-title">Fluxo configurado</h3>
          <ul class="feature-list">
            <li class="feature-item" data-aos="fade-right" data-aos-delay="500">
              <div class="feature-icon feature-icon--login"></div>
              <span>Login automatizado no SIGA com Playwright</span>
            </li>
            <li class="feature-item" data-aos="fade-right" data-aos-delay="600">
              <div class="feature-icon feature-icon--download"></div>
              <span>Download do relatório TXT</span>
            </li>
            <li class="feature-item" data-aos="fade-right" data-aos-delay="700">
              <div class="feature-icon feature-icon--parse"></div>
              <span>Parser dos IDs das equipes e horários</span>
            </li>
            <li class="feature-item" data-aos="fade-right" data-aos-delay="800">
              <div class="feature-icon feature-icon--save"></div>
              <span>Persistência no Neon para histórico rápido</span>
            </li>
          </ul>
        </div>
      </article>

      <!-- Configuration Requirements -->
      <article class="info-card info-card--config" data-tilt data-aos="fade-up" data-aos-delay="500">
        <div class="card-background">
          <div class="card-glow"></div>
        </div>
        <div class="card-content">
          <div class="card-header">
            <span class="card-badge card-badge--warning">
              <i class="badge-icon"></i>
              Configuração
            </span>
          </div>
          <h3 class="card-title">Variáveis necessárias</h3>
          <div class="config-requirements">
            <div class="requirement-item">
              <code>DATABASE_URL</code>
            </div>
            <div class="requirement-item">
              <code>KAIZEN_SIGA_USERNAME</code>
            </div>
            <div class="requirement-item">
              <code>KAIZEN_SIGA_PASSWORD</code>
            </div>
          </div>
          <p class="config-note">
            Defina essas variáveis no ambiente do servidor ou na máquina que executará o sync diário.
          </p>
        </div>
      </article>
    </section>

    <!-- Enhanced Chart Section -->
    <section class="charts-container" data-aos="fade-up" data-aos-delay="600">
      <!-- Weekly Chart -->
      <article ref="weeklyChartCard" class="chart-card chart-card--primary" data-aos="zoom-in" data-aos-delay="700">
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

        <div class="chart-legend">
          <span class="legend-item legend-item--ontime">
            <div class="legend-dot"></div>
            No horário
          </span>
          <span class="legend-item legend-item--late">
            <div class="legend-dot"></div>
            Atrasado
          </span>
        </div>

        <div class="chart-container">
          <div v-if="chartLoading" class="chart-loading">
            <div class="loading-spinner"></div>
            <span>Preparando visualização...</span>
          </div>
          <apexchart
            v-else
            :type="weeklyChartType"
            :height="weeklyChartHeight"
            :options="weeklyChartOptions"
            :series="weeklyStartChart.series"
            class="chart-component"
          />
        </div>
      </article>

      <!-- Monthly Chart -->
      <article ref="monthlyChartCard" class="chart-card chart-card--secondary" data-aos="zoom-in" data-aos-delay="900">
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

        <div class="chart-legend">
          <span class="legend-item legend-item--ontime">
            <div class="legend-dot"></div>
            No horário
          </span>
          <span class="legend-item legend-item--late">
            <div class="legend-dot"></div>
            Atrasado
          </span>
        </div>

        <div class="chart-container">
          <div v-if="chartLoading" class="chart-loading">
            <div class="loading-spinner"></div>
            <span>Preparando visualização...</span>
          </div>
          <apexchart
            v-else
            :type="monthlyChartType"
            :height="monthlyChartHeight"
            :options="monthlyChartOptions"
            :series="monthlyStartChart.series"
            class="chart-component"
          />
        </div>
      </article>
    </section>

    <!-- Enhanced Data Table Section -->
    <section class="data-section" data-aos="fade-up" data-aos-delay="1100">
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
  </section>
</template>

<script>
import { defineAsyncComponent } from 'vue';
import { captureElementAsPng, saveChartPdf } from '../utils/producaoExporters';
import AOS from 'aos';
import 'aos/dist/aos.css';

const ApexChart = defineAsyncComponent(() => import('vue3-apexcharts'));
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
  const entriesByTeamAndDate = new Map(
    filteredEntries.map((entry) => [
      `${entry.team_label || entry.team_id}:${normalizeDateOnly(entry.reference_date)}`,
      timeToMinutes(entry.shift_start),
    ])
  );

  const series = teams.map((teamLabel) => {
    const data = categories.map((date) => ({
      x: date,
      y: entriesByTeamAndDate.get(`${teamLabel}:${date}`) ?? null,
    }));
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
      console.log('📊 Weekly Chart Data:', chart);
      
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
      console.log('📊 Monthly Chart Data:', chart);
      
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
      return Math.max(420, (this.weeklyStartChart.teamsCount || 1) * 30 + 150);
    },
    monthlyChartHeight() {
      return Math.max(420, (this.monthlyStartChart.teamsCount || 1) * 30 + 150);
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
      return this.buildStartChartOptions(this.weeklyStartChart, 'Início do turno por equipe na semana', this.weeklyChartType);
    },
    monthlyChartOptions() {
      return this.buildStartChartOptions(this.monthlyStartChart, 'Início do turno por equipe no mês', this.monthlyChartType);
    },
    emptyStateLabel() {
      const filterSuffix = this.selectedBaseFilter === 'all' ? '' : ` para ${this.selectedBaseLabel}`;
      if (this.selectedPeriod === 'week') {
        return `Nenhum turno Kaizen encontrado para a semana selecionada${filterSuffix}.`;
      }
      return `Nenhum turno Kaizen encontrado para o mês selecionado${filterSuffix}.`;
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
    // Initialize AOS animations
    AOS.init({
      duration: 600,
      easing: 'ease-out-cubic',
      once: false,
      offset: 50,
      delay: 100,
    });
    
    this.loadPersistedKaizenSettings();
    await Promise.allSettled([
      this.loadHistory(),
      this.loadStartCharts(),
    ]);
    window.dispatchEvent(new CustomEvent('app-ready'));
    this.broadcastSyncMonitor();
  },
  beforeUnmount() {
    this.stopSyncTimer();
    this.stopSyncPolling();
    
    // Cleanup AOS
    AOS.refresh();
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
          refName: 'monthlyChartCard',
          filenameBase: `kaizen-inicio-turno-mensal-${this.selectedMonth}`,
          title: 'Kaizen Bot - Inicio de turno mensal',
          subtitle: this.monthlyChartTitle,
          infoLine: this.monthlyChartInfoLine,
        };
      }

      return {
        refName: 'weeklyChartCard',
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
        this.errorMessage = 'Nao foi possivel localizar o grafico para exportacao.';
        return;
      }

      this.exportingChart = chartType;
      try {
        const dataUrl = await captureElementAsPng(target, {
          backgroundColor: '#0b1422',
          pixelRatio: 2,
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
        this.errorMessage = 'Nao foi possivel localizar o grafico para exportacao.';
        return;
      }

      this.exportingChart = chartType;
      try {
        const dataUrl = await captureElementAsPng(target, {
          backgroundColor: '#0b1422',
          pixelRatio: 2,
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
      window.dispatchEvent(new CustomEvent('app-loading-start', { detail: { source: 'kaizen-page', event: 'history' } }));
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
      } catch (error) {
        this.entries = [];
        this.runs = [];
        this.range = null;
        this.errorMessage = error.message || 'Falha ao carregar histórico Kaizen.';
      } finally {
        this.loading = false;
        window.dispatchEvent(new CustomEvent('app-loading-end', { detail: { source: 'kaizen-page', event: 'history' } }));
      }
    },
    buildStartChartOptions(chartModel, title, mode = 'heatmap') {
      const categories = chartModel?.categories || [];
      const averageMinutes = Number.isFinite(chartModel?.averageMinutes) ? chartModel.averageMinutes : null;
      const onTimeLimitMinutes = 8 * 60;
      return {
        chart: {
          type: mode,
          animations: {
            enabled: true,
            easing: 'easeinout',
            speed: 650,
            animateGradually: {
              enabled: true,
              delay: 120,
            },
            dynamicAnimation: {
              enabled: true,
              speed: 400,
            },
          },
          toolbar: {
            show: true,
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
          foreColor: '#cfe4ff',
        },
        plotOptions: {
          heatmap: {
            shadeIntensity: 0.35,
            radius: 6,
            enableShades: false,
            colorScale: {
              ranges: [
                { from: 0, to: onTimeLimitMinutes, name: 'No horário', color: '#84cc16' },
                { from: onTimeLimitMinutes + 1, to: 1440, name: 'Atrasado', color: '#ef4444' },
              ],
            },
          },
        },
        dataLabels: {
          enabled: true,
          formatter: (value) => (Number.isFinite(value) ? formatMinutesToTimeLabel(value) : ''),
          style: {
            colors: ['#f8fbff'],
            fontSize: '11px',
            fontWeight: 700,
          },
          background: {
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
          borderColor: 'rgba(255, 255, 255, 0.08)',
          padding: {
            left: 8,
            right: 18,
            bottom: 12,
          },
        },
        xaxis: {
          type: 'category',
          categories,
          labels: {
            rotate: -35,
            style: {
              colors: '#9db4d1',
            },
            formatter: (value) => this.formatDate(value),
          },
          axisBorder: {
            color: 'rgba(255, 255, 255, 0.08)',
          },
          axisTicks: {
            color: 'rgba(255, 255, 255, 0.08)',
          },
        },
        yaxis: {
          labels: {
            style: {
              colors: '#9db4d1',
            },
            maxWidth: 220,
          },
          title: {
            text: 'Equipe',
            style: {
              color: '#cfe4ff',
            },
          },
        },
        tooltip: {
          theme: 'dark',
          custom: ({ seriesIndex, dataPointIndex, w }) => {
            const point = w.config.series?.[seriesIndex]?.data?.[dataPointIndex];
            const team = w.config.series?.[seriesIndex]?.name || 'Equipe';
            const date = point?.x ? this.formatDate(point.x) : '--/--/----';
            const value = Number.isFinite(point?.y) ? formatMinutesToTimeLabel(point.y) : 'Sem registro';
            const averageLabel = averageMinutes !== null ? formatMinutesToTimeLabel(averageMinutes) : '--:--';
            const statusLabel = Number.isFinite(point?.y)
              ? (point.y <= onTimeLimitMinutes ? 'No horário' : 'Atrasado')
              : 'Sem registro';
            return `<div class="kaizen-tooltip"><strong>${team}</strong><span>${date}</span><p>Início: ${value}</p><small>Status: ${statusLabel}</small><small>Média do período: ${averageLabel}</small></div>`;
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
            color: '#f5fbff',
            fontSize: '14px',
            fontWeight: 700,
          },
        },
      };
    },
    async fetchHistoryByPeriod(referenceDate, period) {
      const query = new URLSearchParams({
        date: referenceDate,
        period,
        limit: '400',
      });
      const response = await fetch(`/api/get-kaizen-history?${query.toString()}`, {
        cache: 'no-store',
      });
      const payload = await this.parseApiResponse(response);
      if (!response.ok) {
        throw new Error(payload.detail || payload.error || 'Falha ao carregar dados do gráfico Kaizen.');
      }
      return payload;
    },
    async loadWeeklyStartChart() {
      const payload = await this.fetchHistoryByPeriod(this.selectedWeekDate, 'week');
      this.weeklyChartEntries = payload.entries || [];
      this.weeklyChartRange = payload.range || null;
    },
    async loadMonthlyStartChart() {
      const payload = await this.fetchHistoryByPeriod(`${this.selectedMonth}-01`, 'month');
      this.monthlyChartEntries = payload.entries || [];
      this.monthlyChartRange = payload.range || null;
    },
    async loadStartCharts() {
      window.dispatchEvent(new CustomEvent('app-loading-start', { detail: { source: 'kaizen-page', event: 'start-charts' } }));
      this.chartLoading = true;
      try {
        await Promise.all([
          this.loadWeeklyStartChart(),
          this.loadMonthlyStartChart(),
        ]);
      } catch (error) {
        this.errorMessage = error.message || 'Falha ao carregar os gráficos de início de turno.';
      } finally {
        this.chartLoading = false;
        window.dispatchEvent(new CustomEvent('app-loading-end', { detail: { source: 'kaizen-page', event: 'start-charts' } }));
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

        if (!payload.job || !payload.job.jobId) {
          throw new Error('A API Kaizen não retornou um identificador de job para acompanhar a sincronização.');
        }

        this.applySyncJobState(payload.job);
        this.successMessage = payload.message || 'Sincronização Kaizen iniciada.';
        this.broadcastSyncMonitor();
        await this.pollSyncStatus(payload.job.jobId);
        if (this.syncing) {
          this.startSyncPolling(payload.job.jobId);
        }
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
      // Add visual feedback when hovering over base items
      this.$nextTick(() => {
        const baseItems = this.$el.querySelectorAll('.base-item');
        baseItems.forEach(item => {
          if (!item.querySelector('.base-name').textContent.includes(this.getBaseName(base))) {
            item.style.opacity = '0.5';
          } else {
            item.style.transform = 'scale(1.05)';
          }
        });
      });
    },
    
    clearHighlight() {
      // Reset visual state
      this.$nextTick(() => {
        const baseItems = this.$el.querySelectorAll('.base-item');
        baseItems.forEach(item => {
          item.style.opacity = '';
          item.style.transform = '';
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
    handleChartHover(event, chart) {
      // Enhanced chart interactivity
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
      // Refresh AOS animations when data changes
      this.$nextTick(() => {
        AOS.refresh();
      });
    },
  },
};
</script>

<style scoped>
/* Modern Variables & Animations */
:root {
  --primary-gradient: linear-gradient(135deg, #1fd0ff 0%, #2f6df6 100%);
  --secondary-gradient: linear-gradient(135deg, #84cc16 0%, #22c55e 100%);
  --accent-gradient: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%);
  --glass-bg: rgba(15, 23, 42, 0.8);
  --glass-border: rgba(255, 255, 255, 0.1);
  --shadow-glow: 0 8px 32px rgba(31, 208, 255, 0.15);
  --shadow-soft: 0 4px 16px rgba(0, 0, 0, 0.3);
  --border-radius-lg: 24px;
  --border-radius-xl: 32px;
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

/* Page Layout */
.kaizen-page {
  min-height: 100vh;
  padding: 2rem;
  background: 
    radial-gradient(circle at 20% 80%, rgba(31, 208, 255, 0.08) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(47, 109, 246, 0.06) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(132, 204, 22, 0.04) 0%, transparent 50%);
  display: flex;
  flex-direction: column;
  gap: 3rem;
  animation: slide-in-up 0.8s ease-out;
}

/* Modern Header */
.page-header {
  display: grid;
  gap: 2.5rem;
  padding: 3rem 0;
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
  min-width: 300px;
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
  margin: 2rem 0 0;
  font-size: 1.25rem;
  line-height: 1.6;
  color: rgba(248, 250, 252, 0.8);
  max-width: 600px;
  animation: slide-in-up 1s ease-out 0.7s both;
}

/* Control Panel */
.control-panel {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius-xl);
  padding: 2rem;
  box-shadow: var(--shadow-soft);
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
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(248, 250, 252, 0.9);
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

/* Info Grid - Modern Cards */
.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
}

.info-card {
  position: relative;
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: var(--border-radius-xl);
  padding: 2rem;
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
  transform: translateY(-8px) scale(1.02);
  box-shadow: 
    var(--shadow-glow),
    0 20px 60px rgba(0, 0, 0, 0.3);
}

.info-card:hover::before {
  opacity: 1;
}

.info-card--hero {
  grid-column: 1 / -1;
  background: 
    radial-gradient(circle at 80% 20%, rgba(31, 208, 255, 0.15), transparent 50%),
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
  margin: 0 0 2rem;
  color: rgba(248, 250, 252, 0.8);
  line-height: 1.6;
}

.metrics-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.metric-pill {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
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
}

/* Base Summary */
.base-grid {
  display: grid;
  gap: 1rem;
  margin-top: 1.5rem;
}

.base-item {
  padding: 1.5rem;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  transition: var(--transition-bounce);
  cursor: pointer;
}

.base-item:hover {
  background: rgba(15, 23, 42, 0.8);
  border-color: rgba(31, 208, 255, 0.3);
  transform: scale(1.02);
}

.base-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.base-name {
  color: #f8fafc;
  font-size: 1.125rem;
  font-weight: 600;
}

.base-count-container {
  position: relative;
}

.base-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 3rem;
  height: 3rem;
  background: var(--primary-gradient);
  color: #0a0f1a;
  border-radius: 50%;
  font-weight: 700;
  font-size: 1.125rem;
}

.base-progress {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.base-progress-fill {
  height: 100%;
  background: var(--primary-gradient);
  transition: width 1s ease;
  border-radius: inherit;
}

/* Feature List */
.feature-list {
  list-style: none;
  margin: 1.5rem 0 0;
  padding: 0;
  display: grid;
  gap: 1rem;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(15, 23, 42, 0.6);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: var(--transition-smooth);
  animation: slide-in-up 0.6s ease-out both;
}

.feature-item:hover {
  background: rgba(15, 23, 42, 0.8);
  border-color: rgba(31, 208, 255, 0.3);
  transform: translateX(8px);
}

.feature-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  background: var(--primary-gradient);
  color: #0a0f1a;
  flex-shrink: 0;
}

.feature-icon--login::before { content: "🔐"; }
.feature-icon--download::before { content: "📥"; }
.feature-icon--parse::before { content: "⚙️"; }
.feature-icon--save::before { content: "💾"; }

/* Configuration Requirements */
.config-requirements {
  display: grid;
  gap: 0.75rem;
  margin: 1.5rem 0;
}

.requirement-item {
  padding: 1rem;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  transition: var(--transition-smooth);
}

.requirement-item:hover {
  border-color: rgba(31, 208, 255, 0.3);
}

.requirement-item code {
  color: #1fd0ff;
  font-weight: 600;
  background: rgba(31, 208, 255, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 6px;
}

.config-note {
  margin: 1rem 0 0;
  color: rgba(248, 250, 252, 0.7);
  font-size: 0.875rem;
  line-height: 1.5;
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
  backdrop-filter: blur(20px) !important;
  border: 1px solid rgba(255, 255, 255, 0.1) !important;
  border-radius: 32px !important;
  padding: 2.5rem !important;
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.68, -0.55, 0.265, 1.55) !important;
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
  transform: translateY(-8px) scale(1.02) !important;
  box-shadow: 0 8px 32px rgba(31, 208, 255, 0.15), 0 20px 60px rgba(0, 0, 0, 0.3) !important;
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
  animation: float 3s ease-in-out infinite !important;
}

.chart-badge--monthly {
  background: rgba(132, 204, 22, 0.15) !important;
  color: #84cc16 !important;
  box-shadow: 0 4px 16px rgba(132, 204, 22, 0.2) !important;
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

.legend-item--ontime .legend-dot {
  background: #84cc16 !important;
  box-shadow: 0 0 10px rgba(132, 204, 22, 0.5) !important;
}

.legend-item--late .legend-dot {
  background: #ef4444 !important;
  box-shadow: 0 0 10px rgba(239, 68, 68, 0.5) !important;
}

.chart-container {
  position: relative !important;
  min-height: 400px !important;
  padding: 1.5rem !important;
  background: rgba(30, 41, 59, 0.95) !important;
  border: 1px solid rgba(255, 255, 255, 0.15) !important;
  border-radius: 24px !important;
  backdrop-filter: blur(20px) !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3) !important;
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
  overflow: hidden !important;
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

/* Responsive Design */
@media (max-width: 1200px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
  
  .info-card--hero {
    grid-column: 1;
  }
  
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
  .kaizen-page {
    padding: 1rem;
    gap: 2rem;
  }
  
  .title-section {
    min-width: auto;
  }
  
  .main-title .title-gradient {
    font-size: clamp(2rem, 10vw, 4rem);
  }
  
  .control-group {
    flex-direction: column;
    align-items: stretch;
  }
  
  .modern-field {
    min-width: auto;
  }
  
  .toggle-group {
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
  .kaizen-page {
    padding: 0.75rem;
  }
  
  .info-card,
  .chart-card,
  .data-card {
    padding: 1.5rem;
  }
  
  .stats-showcase {
    grid-template-columns: 1fr;
  }
  
  .metrics-row {
    flex-direction: column;
  }
  
  .chart-container {
    padding: 1rem;
  }
}

/* Enhanced ApexCharts Integration */
:global(.apexcharts-canvas) {
  font-family: inherit !important;
}

:global(.apexcharts-tooltip.apexcharts-theme-dark) {
  background: rgba(15, 23, 42, 0.95) !important;
  border: 1px solid rgba(31, 208, 255, 0.3) !important;
  box-shadow: var(--shadow-glow) !important;
  backdrop-filter: blur(20px);
}

:global(.apexcharts-heatmap-rect) {
  stroke: rgba(255, 255, 255, 0.2) !important;
  stroke-width: 1px;
  transition: all 0.2s ease;
}

:global(.apexcharts-heatmap-rect:hover) {
  stroke: rgba(31, 208, 255, 0.5) !important;
  stroke-width: 2px;
  filter: brightness(1.1);
}

:global(.kaizen-tooltip) {
  padding: 1rem !important;
  border-radius: 12px !important;
  background: rgba(15, 23, 42, 0.98) !important;
  backdrop-filter: blur(10px);
}

:global(.kaizen-tooltip strong) {
  color: #1fd0ff !important;
  font-weight: 700;
}

:global(.kaizen-tooltip span) {
  color: rgba(248, 250, 252, 0.8) !important;
}

:global(.kaizen-tooltip p) {
  color: #f8fafc !important;
  margin: 0.5rem 0 !important;
}

:global(.kaizen-tooltip small) {
  color: rgba(248, 250, 252, 0.6) !important;
  font-size: 0.8rem;
}
</style>
