<template>
  <div class="liga-page liga-page--gamer">
    <div class="liga-bg" aria-hidden="true" />
    <div class="liga-bg-grid" aria-hidden="true" />
    <div class="liga-scanlines" aria-hidden="true" />

    <!-- ——— Arena 1: bases ——— -->
    <header class="liga-hero">
      <div class="liga-hero__frame">
        <div class="liga-hero__titles">
          <p class="liga-eyebrow">
            <span class="liga-eyebrow__dot" aria-hidden="true" />
            Temporada ativa · placar competitivo
          </p>
          <h1 class="liga-title">
            <i class="bi bi-trophy-fill liga-title__icon" aria-hidden="true" />
            Liga das bases
          </h1>
          <p class="liga-lede">
            Ranking por <strong>resultado da base</strong>. Metas, medição, produção e pastas — modo
            <span class="liga-lede__tag">ARENA</span>.
          </p>
        </div>
        <div class="liga-hero__badge">
          <span class="liga-chip liga-chip--live"><span class="liga-chip__pulse" aria-hidden="true" /> Ao vivo</span>
          <span class="liga-chip liga-chip--muted">{{ baseRows.length }} bases</span>
        </div>
      </div>
    </header>

    <LigaPodiumBlock
      section-key="bases"
      :places="podiumBases"
      label-key="base"
      hint="Resultado da base"
      aria-label="Pódio top 3 bases"
    />

    <div class="liga-grid">
      <section class="liga-panel liga-panel--rank liga-panel--hud" aria-labelledby="rank-bases-h">
        <div class="panel-head">
          <span class="panel-head__deco" aria-hidden="true" />
          <h2 id="rank-bases-h" class="panel-title">Classificação</h2>
        </div>
        <div class="rank-table-wrap">
          <LigaRankTable :rows="rankedBases" name-header="Base" name-key="base" />
        </div>
      </section>

      <section class="liga-panel liga-panel--chart liga-panel--hud" aria-labelledby="chart-bases-h">
        <div class="panel-head">
          <span class="panel-head__deco panel-head__deco--alt" aria-hidden="true" />
          <h2 id="chart-bases-h" class="panel-title">Resultado por base</h2>
        </div>
        <apexchart type="bar" :height="chartHeightBases" class="liga-apex" :options="basesBarOptions" :series="basesBarSeries" />
      </section>
    </div>

    <section class="liga-panel liga-panel--full liga-panel--hud" aria-labelledby="detail-bases-h">
      <div class="panel-head">
        <span class="panel-head__deco" aria-hidden="true" />
        <h2 id="detail-bases-h" class="panel-title">Detalhamento por base</h2>
      </div>
      <div class="detail-scroll">
        <table class="detail-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Base</th>
              <th>Meta</th>
              <th>Medição atingida</th>
              <th>Produção atingida</th>
              <th>Entrega pastas (3 dias)</th>
              <th>Devoluções pasta</th>
              <th>Resultado da base</th>
              <th>Quant. obras</th>
              <th>Quant. dev.</th>
              <th>Dev. em R$</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rankedBases" :key="row.id">
              <td class="mono">{{ row.id }}</td>
              <td class="detail-base">{{ row.base }}</td>
              <td>{{ formatBRL(row.meta) }}</td>
              <td :class="cellMoneyClass(row.medicaoOk)">{{ formatBRL(row.medicaoAtingida) }}</td>
              <td :class="cellMoneyClass(row.producaoOk)">{{ formatBRL(row.producaoAtingida) }}</td>
              <td class="cell-pink">{{ formatDecimal(row.entregaPastas) }}</td>
              <td :class="devolucaoClass(row.devolucoesPct)">{{ formatPct(row.devolucoesPct) }}</td>
              <td class="cell-result">{{ formatPct(row.resultadoPct) }}</td>
              <td class="mono">{{ row.quantObras }}</td>
              <td class="mono">{{ row.quantDev }}</td>
              <td :class="devReaisClass(row.devEmReaisPct)">{{ formatPct(row.devEmReaisPct) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- ——— Arena 2: projetistas ——— -->
    <div class="liga-block-divider" aria-hidden="true">
      <span class="liga-block-divider__line" />
      <span class="liga-block-divider__label">Arena 2</span>
      <span class="liga-block-divider__line" />
    </div>

    <header class="liga-hero liga-hero--tier2">
      <div class="liga-hero__frame">
        <div class="liga-hero__titles">
          <p class="liga-eyebrow">
            <span class="liga-eyebrow__dot liga-eyebrow__dot--magenta" aria-hidden="true" />
            Performance individual · projetistas
          </p>
          <h1 class="liga-title liga-title--tier2">
            <i class="bi bi-joystick liga-title__icon" aria-hidden="true" />
            Liga dos projetistas
          </h1>
          <p class="liga-lede">
            Ranking por <strong>resultado</strong> (meta, conclusão no sistema e devoluções). Mesmo visual
            <span class="liga-lede__tag">ARENA</span>.
          </p>
        </div>
        <div class="liga-hero__badge">
          <span class="liga-chip liga-chip--muted">{{ projetistaRows.length }} projetistas</span>
        </div>
      </div>
    </header>

    <LigaPodiumBlock
      section-key="proj"
      :places="podiumProjetistas"
      label-key="nome"
      hint="Resultado"
      aria-label="Pódio top 3 projetistas"
    />

    <div class="liga-grid">
      <section class="liga-panel liga-panel--rank liga-panel--hud" aria-labelledby="rank-proj-h">
        <div class="panel-head">
          <span class="panel-head__deco" aria-hidden="true" />
          <h2 id="rank-proj-h" class="panel-title">Classificação</h2>
        </div>
        <div class="rank-table-wrap">
          <LigaRankTable :rows="rankedProjetistas" name-header="Projetista" name-key="nome" row-key-prefix="pr" />
        </div>
      </section>

      <section class="liga-panel liga-panel--chart liga-panel--hud" aria-labelledby="chart-proj-h">
        <div class="panel-head">
          <span class="panel-head__deco panel-head__deco--alt" aria-hidden="true" />
          <h2 id="chart-proj-h" class="panel-title">Resultado por projetista</h2>
        </div>
        <apexchart type="bar" :height="chartHeightProj" class="liga-apex" :options="projBarOptions" :series="projBarSeries" />
      </section>
    </div>

    <section class="liga-panel liga-panel--full liga-panel--hud" aria-labelledby="detail-proj-h">
      <div class="panel-head">
        <span class="panel-head__deco" aria-hidden="true" />
        <h2 id="detail-proj-h" class="panel-title">Detalhamento por projetista</h2>
      </div>
      <div class="detail-scroll">
        <table class="detail-table">
          <thead>
            <tr>
              <th>Projetista</th>
              <th>Meta</th>
              <th>Conc. sistema</th>
              <th>Devolução</th>
              <th>% conc.</th>
              <th>% dev.</th>
              <th>Resultado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in rankedProjetistas" :key="row.id">
              <td class="detail-base">{{ row.nome }}</td>
              <td>{{ formatBRL(row.meta) }}</td>
              <td :class="cellMoneyClass(row.concOk)">{{ formatBRL(row.concSistema) }}</td>
              <td>{{ formatBRL(row.devolucao) }}</td>
              <td class="cell-result">{{ formatPct(row.concPct) }}</td>
              <td :class="devolucaoClass(row.devPct)">{{ formatPct(row.devPct) }}</td>
              <td class="cell-result">{{ formatPct(row.resultadoPct) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>

<script>
import { defineAsyncComponent } from 'vue';
import LigaPodiumBlock from './liga/LigaPodiumBlock.vue';
import LigaRankTable from './liga/LigaRankTable.vue';
import { LIGA_BASE_ROWS, LIGA_PROJETISTA_ROWS } from './liga/ligaSampleData.js';
import {
  buildLigaHorizontalBarOptions,
  buildPodiumPlaces,
  ligaBarSeries,
  ligaChartHeight,
} from './liga/ligaApexHorizontalBar.js';

const ApexChart = defineAsyncComponent(() => import('vue3-apexcharts'));

const BASES_CHART_X_MAX = 150;

export default {
  name: 'LigaDasBases',
  components: {
    apexchart: ApexChart,
    LigaPodiumBlock,
    LigaRankTable,
  },
  data() {
    return {
      baseRows: [...LIGA_BASE_ROWS],
      projetistaRows: [...LIGA_PROJETISTA_ROWS],
    };
  },
  computed: {
    rankedBases() {
      return [...this.baseRows].sort((a, b) => b.resultadoPct - a.resultadoPct);
    },
    rankedProjetistas() {
      return [...this.projetistaRows].sort((a, b) => b.resultadoPct - a.resultadoPct);
    },
    podiumBases() {
      return buildPodiumPlaces(this.rankedBases);
    },
    podiumProjetistas() {
      return buildPodiumPlaces(this.rankedProjetistas);
    },
    chartHeightBases() {
      return ligaChartHeight(this.rankedBases.length, 52);
    },
    chartHeightProj() {
      return ligaChartHeight(this.rankedProjetistas.length, 48);
    },
    basesBarSeries() {
      return ligaBarSeries(this.rankedBases);
    },
    basesBarOptions() {
      return buildLigaHorizontalBarOptions({
        categories: this.rankedBases.map((r) => r.base),
        xMax: BASES_CHART_X_MAX,
      });
    },
    projBarSeries() {
      return ligaBarSeries(this.rankedProjetistas);
    },
    projBarOptions() {
      const rows = this.rankedProjetistas;
      const maxVal = rows.reduce((m, r) => Math.max(m, r.resultadoPct), 0);
      const xMax = Math.max(170, Math.ceil(maxVal / 10) * 10 + 10);
      return buildLigaHorizontalBarOptions({
        categories: rows.map((r) => r.nome),
        xMax,
      });
    },
  },
  methods: {
    formatBRL(value) {
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    },
    formatPct(value) {
      return `${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
    },
    formatDecimal(value) {
      return Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    cellMoneyClass(ok) {
      return ok ? 'cell-good' : 'cell-bad';
    },
    devolucaoClass(pct) {
      if (pct <= 22) return 'cell-good';
      if (pct <= 30) return 'cell-warn';
      return 'cell-bad';
    },
    devReaisClass(pct) {
      if (pct <= 12) return 'cell-heat-low';
      if (pct <= 20) return 'cell-heat-mid';
      return 'cell-heat-high';
    },
  },
};
</script>

<style scoped>
.liga-page {
  --liga-bg0: #020617;
  --liga-bg1: #0f172a;
  --liga-edge: rgba(34, 211, 238, 0.35);
  --liga-neon: #22d3ee;
  --liga-magenta: #e879f9;
  --liga-text: #f8fafc;
  --liga-muted: #94a3b8;
  min-height: 100vh;
  padding: clamp(1.25rem, 3vw, 2.5rem);
  color: var(--liga-text);
  position: relative;
  overflow-x: clip;
}

.liga-page--gamer {
  font-family: 'Rajdhani', system-ui, sans-serif;
  font-weight: 500;
}

.liga-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse 90% 55% at 50% -15%, rgba(34, 211, 238, 0.18), transparent 58%),
    radial-gradient(ellipse 50% 45% at 100% 30%, rgba(232, 121, 249, 0.1), transparent 50%),
    radial-gradient(ellipse 45% 40% at 0% 70%, rgba(99, 102, 241, 0.12), transparent 55%),
    linear-gradient(180deg, var(--liga-bg0), var(--liga-bg1));
}

.liga-bg-grid {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.5;
  background-image:
    linear-gradient(rgba(34, 211, 238, 0.045) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.045) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: radial-gradient(ellipse 88% 72% at 50% 22%, #000 18%, transparent 72%);
}

.liga-scanlines {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.035;
  background: repeating-linear-gradient(180deg, transparent, transparent 2px, rgba(0, 0, 0, 0.4) 2px, rgba(0, 0, 0, 0.4) 3px);
  mix-blend-mode: overlay;
}

.liga-hero,
.liga-grid,
.liga-panel,
.liga-block-divider {
  position: relative;
  z-index: 1;
}

.liga-hero {
  margin-bottom: 2rem;
}

.liga-hero__frame {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1.25rem;
  width: 100%;
  padding: 1.35rem 1.5rem;
  clip-path: polygon(0 18px, 18px 0, calc(100% - 18px) 0, 100% 18px, 100% calc(100% - 18px), calc(100% - 18px) 100%, 18px 100%, 0 calc(100% - 18px));
  background: linear-gradient(155deg, rgba(15, 23, 42, 0.94), rgba(2, 6, 23, 0.92));
  border: 1px solid rgba(34, 211, 238, 0.28);
  box-shadow:
    0 0 48px rgba(34, 211, 238, 0.1),
    inset 0 0 0 1px rgba(255, 255, 255, 0.04),
    inset 0 -30px 50px rgba(99, 102, 241, 0.05);
  animation: liga-hud-breathe 5s ease-in-out infinite;
}

@keyframes liga-hud-breathe {
  0%,
  100% {
    box-shadow:
      0 0 48px rgba(34, 211, 238, 0.1),
      inset 0 0 0 1px rgba(255, 255, 255, 0.04),
      inset 0 -30px 50px rgba(99, 102, 241, 0.05);
  }
  50% {
    box-shadow:
      0 0 64px rgba(99, 102, 241, 0.16),
      inset 0 0 0 1px rgba(34, 211, 238, 0.12),
      inset 0 -30px 60px rgba(34, 211, 238, 0.07);
  }
}

.liga-eyebrow {
  margin: 0 0 0.35rem;
  font-size: 0.72rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: var(--liga-muted);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.liga-eyebrow__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 12px #4ade80;
  animation: liga-dot-pulse 1.8s ease-in-out infinite;
}

.liga-eyebrow__dot--magenta {
  background: #d946ef;
  box-shadow: 0 0 14px rgba(232, 121, 249, 0.85);
}

@keyframes liga-dot-pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.75;
    transform: scale(1.15);
  }
}

.liga-title {
  margin: 0;
  font-family: 'Orbitron', sans-serif;
  font-size: clamp(1.65rem, 4vw, 2.25rem);
  font-weight: 800;
  letter-spacing: 0.04em;
  display: flex;
  align-items: center;
  gap: 0.55rem;
  text-transform: uppercase;
  color: #f1f5f9;
  text-shadow:
    0 0 24px rgba(34, 211, 238, 0.35),
    0 0 48px rgba(99, 102, 241, 0.2);
}

.liga-title__icon {
  font-size: 1.35em;
  filter: drop-shadow(0 0 14px rgba(251, 191, 36, 0.55));
}

.liga-lede {
  margin: 0.6rem 0 0;
  max-width: 42rem;
  color: var(--liga-muted);
  line-height: 1.55;
  font-size: 0.95rem;
}

.liga-lede strong {
  color: #e2e8f0;
}

.liga-lede__tag {
  display: inline-block;
  padding: 0.1rem 0.45rem;
  margin-left: 0.15rem;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.72em;
  font-weight: 800;
  letter-spacing: 0.12em;
  color: #a5f3fc;
  border: 1px solid rgba(34, 211, 238, 0.45);
  border-radius: 4px;
  background: rgba(34, 211, 238, 0.1);
  box-shadow: 0 0 16px rgba(34, 211, 238, 0.2);
}

.liga-hero__badge {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.liga-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.65rem;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border-radius: 6px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.65);
  color: #cbd5e1;
}

.liga-chip--live {
  border-color: rgba(34, 211, 238, 0.45);
  color: #a5f3fc;
  box-shadow: 0 0 20px rgba(34, 211, 238, 0.15);
}

.liga-chip__pulse {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #22c55e;
  box-shadow: 0 0 10px #4ade80;
  animation: liga-dot-pulse 1.5s ease-in-out infinite;
}

.liga-chip--muted {
  opacity: 0.9;
}

.liga-block-divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: clamp(2.5rem, 5vw, 3.5rem) 0 1.75rem;
}

.liga-block-divider__line {
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.35), rgba(232, 121, 249, 0.35), transparent);
  box-shadow: 0 0 12px rgba(34, 211, 238, 0.2);
}

.liga-block-divider__label {
  font-family: 'Orbitron', sans-serif;
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.28em;
  color: rgba(148, 163, 184, 0.95);
  text-transform: uppercase;
  white-space: nowrap;
}

.liga-hero--tier2 {
  margin-bottom: 1.75rem;
}

.liga-hero--tier2 .liga-hero__frame {
  border-color: rgba(232, 121, 249, 0.22);
  box-shadow:
    0 0 40px rgba(232, 121, 249, 0.08),
    inset 0 0 0 1px rgba(255, 255, 255, 0.04),
    inset 0 -24px 48px rgba(34, 211, 238, 0.04);
}

.liga-title--tier2 {
  font-size: clamp(1.35rem, 3.2vw, 1.85rem);
  text-shadow:
    0 0 20px rgba(232, 121, 249, 0.35),
    0 0 40px rgba(34, 211, 238, 0.18);
}

.liga-title--tier2 .liga-title__icon {
  filter: drop-shadow(0 0 12px rgba(232, 121, 249, 0.55));
}

.liga-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.25fr);
  gap: 1.25rem;
  margin-bottom: 1.5rem;
}

@media (max-width: 1100px) {
  .liga-grid {
    grid-template-columns: 1fr;
  }
}

.liga-panel {
  clip-path: polygon(0 14px, 14px 0, calc(100% - 14px) 0, 100% 14px, 100% calc(100% - 14px), calc(100% - 14px) 100%, 14px 100%, 0 calc(100% - 14px));
  background: linear-gradient(160deg, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.88));
  border: 1px solid rgba(34, 211, 238, 0.22);
  box-shadow: 0 0 40px rgba(2, 6, 23, 0.5);
}

.liga-panel--hud {
  box-shadow:
    0 0 36px rgba(34, 211, 238, 0.08),
    0 18px 48px rgba(0, 0, 0, 0.35);
}

.liga-panel--full {
  margin-bottom: 0;
}

.panel-head {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.85rem 1rem 0.5rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.panel-head__deco {
  width: 10px;
  height: 10px;
  background: linear-gradient(135deg, #22d3ee, #6366f1);
  clip-path: polygon(50% 0, 100% 50%, 50% 100%, 0 50%);
  box-shadow: 0 0 12px rgba(34, 211, 238, 0.45);
}

.panel-head__deco--alt {
  background: linear-gradient(135deg, #e879f9, #22d3ee);
}

.panel-title {
  margin: 0;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #e2e8f0;
}

.rank-table-wrap {
  padding: 0.5rem 0.65rem 1rem;
  max-height: min(70vh, 520px);
  overflow: auto;
}

.detail-scroll {
  overflow: auto;
  max-height: min(75vh, 640px);
  border-radius: 0 0 4px 4px;
}

.detail-table {
  width: 100%;
  min-width: 720px;
  border-collapse: collapse;
  font-size: 0.82rem;
}

.detail-table th,
.detail-table td {
  padding: 0.55rem 0.65rem;
  text-align: left;
  border-bottom: 1px solid rgba(148, 163, 184, 0.12);
}

.detail-table th {
  position: sticky;
  top: 0;
  z-index: 1;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.62rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #94a3b8;
  background: rgba(15, 23, 42, 0.97);
  white-space: nowrap;
}

.detail-table tbody tr:hover {
  background: rgba(34, 211, 238, 0.06);
}

.detail-base {
  font-weight: 600;
  color: #f1f5f9;
  max-width: 12rem;
  white-space: normal;
}

.mono {
  font-variant-numeric: tabular-nums;
  color: var(--liga-muted);
}

.cell-good {
  color: #4ade80;
  font-weight: 600;
}

.cell-bad {
  color: #f87171;
  font-weight: 600;
}

.cell-warn {
  color: #fbbf24;
  font-weight: 600;
}

.cell-pink {
  background: rgba(251, 113, 133, 0.18);
  color: #fecdd3;
  font-weight: 600;
}

.cell-result {
  font-weight: 800;
  color: #7dd3fc;
  font-variant-numeric: tabular-nums;
}

.cell-heat-low {
  background: rgba(74, 222, 128, 0.15);
  color: #86efac;
  font-weight: 600;
}

.cell-heat-mid {
  background: rgba(251, 191, 36, 0.15);
  color: #fde047;
  font-weight: 600;
}

.cell-heat-high {
  background: rgba(248, 113, 113, 0.2);
  color: #fca5a5;
  font-weight: 600;
}

.liga-apex {
  padding: 0.35rem 0.5rem 0.75rem;
}

:global(html:not(.dark-theme)) .liga-page {
  --liga-text: #0f172a;
  --liga-muted: #64748b;
  --liga-bg0: #f1f5f9;
  --liga-bg1: #e2e8f0;
}

:global(html:not(.dark-theme)) .liga-bg {
  background:
    radial-gradient(ellipse 80% 50% at 50% -20%, rgba(14, 165, 233, 0.15), transparent 55%),
    linear-gradient(180deg, #f8fafc, #e2e8f0);
}

:global(html:not(.dark-theme)) .liga-panel {
  background: rgba(255, 255, 255, 0.94);
  border-color: rgba(15, 23, 42, 0.12);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
}

:global(html:not(.dark-theme)) .liga-panel--hud {
  box-shadow:
    0 0 24px rgba(14, 165, 233, 0.08),
    0 12px 32px rgba(15, 23, 42, 0.08);
}

:global(html:not(.dark-theme)) .detail-table th {
  background: rgba(248, 250, 252, 0.98);
  color: #475569;
}
</style>
