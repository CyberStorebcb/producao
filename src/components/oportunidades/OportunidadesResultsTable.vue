<template>
  <div v-if="visibleDistrictTotals.length" class="district-overview">
    <div v-for="district in visibleDistrictTotals" :key="district.code" class="district-card">
      <span>{{ district.label }}</span>
      <strong>{{ formatCurrency(district.totalValue) }}</strong>
    </div>
  </div>

  <div
    ref="scrollWrap"
    class="results-table-wrap"
    :class="{ 'results-table-wrap--virtual': virtualActive }"
    role="region"
    :aria-labelledby="regionLabelledBy"
    tabindex="-1"
    @scroll.passive="onTableScroll"
  >
    <p :id="summaryId" class="oportunidades-table-summary oportunidades-visually-hidden">
      {{ tableSummaryText }}
    </p>
    <table
      class="oportunidades-table"
      aria-label="Ranking de obras por faturamento após os filtros atuais"
      :aria-describedby="summaryId"
    >
      <thead>
        <tr>
          <th scope="col" style="width: 56px">
            <span class="oportunidades-th-text">#</span>
          </th>
          <th scope="col">
            <span class="oportunidades-th-text">Obra / Projeto</span>
          </th>
          <th scope="col" style="width: 170px">
            <span class="oportunidades-th-text">Distrital</span>
          </th>
          <th scope="col" style="width: 180px">
            <span class="oportunidades-th-text">Município</span>
          </th>
          <th scope="col" style="width: 170px">
            <span class="oportunidades-th-text">Nota</span>
          </th>
          <th scope="col" style="width: 180px" class="text-end">
            <span class="oportunidades-th-text">Faturamento</span>
          </th>
          <th scope="col" style="width: 180px">
            <span class="oportunidades-th-text">Status</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-if="virtualActive && paddingTop > 0"
          class="oportunidades-vpad"
          aria-hidden="true"
        >
          <td colspan="7" class="oportunidades-vpad__cell" :style="{ height: `${paddingTop}px` }"></td>
        </tr>

        <tr v-for="(item, idx) in visibleRows" :key="`${item.code}__${displayRank(idx)}`">
          <td>
            <span class="rank-badge">{{ displayRank(idx) }}</span>
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

        <tr
          v-if="virtualActive && paddingBottom > 0"
          class="oportunidades-vpad"
          aria-hidden="true"
        >
          <td colspan="7" class="oportunidades-vpad__cell" :style="{ height: `${paddingBottom}px` }"></td>
        </tr>

        <tr v-if="rows.length === 0">
          <td colspan="7" class="empty-row">Nenhuma obra encontrada com os filtros atuais.</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script>
const ROW_HEIGHT = 72;
const BUFFER = 10;
const VIRTUAL_THRESHOLD = 48;

export default {
  name: 'OportunidadesResultsTable',
  props: {
    rows: { type: Array, required: true },
    visibleDistrictTotals: { type: Array, required: true },
    formatCurrency: { type: Function, required: true },
    showFullListMode: { type: Boolean, default: false },
    regionLabelledBy: { type: String, required: true },
  },
  data() {
    return {
      scrollTop: 0,
      viewportHeight: 520,
      resizeObserver: null,
      summaryId: `oportunidades-table-summary-${Math.random().toString(36).slice(2, 9)}`,
    };
  },
  computed: {
    virtualActive() {
      return this.showFullListMode && this.rows.length >= VIRTUAL_THRESHOLD;
    },
    virtualWindow() {
      const total = this.rows.length;
      if (!this.virtualActive || total === 0) {
        return { firstIndex: 0, lastIndex: total, paddingTop: 0, paddingBottom: 0 };
      }
      const vh = Math.max(this.viewportHeight, 200);
      const first = Math.max(0, Math.floor(this.scrollTop / ROW_HEIGHT) - BUFFER);
      const visibleCount = Math.ceil(vh / ROW_HEIGHT) + BUFFER * 2;
      const last = Math.min(total, first + visibleCount);
      return {
        firstIndex: first,
        lastIndex: last,
        paddingTop: first * ROW_HEIGHT,
        paddingBottom: (total - last) * ROW_HEIGHT,
      };
    },
    paddingTop() {
      return this.virtualWindow.paddingTop;
    },
    paddingBottom() {
      return this.virtualWindow.paddingBottom;
    },
    visibleRows() {
      if (!this.virtualActive) return this.rows;
      const { firstIndex, lastIndex } = this.virtualWindow;
      return this.rows.slice(firstIndex, lastIndex);
    },
    tableSummaryText() {
      const n = this.rows.length;
      if (n === 0) return 'Nenhuma linha no ranking com os filtros atuais.';
      if (!this.virtualActive) {
        return `${n} ${n === 1 ? 'obra listada' : 'obras listadas'}.`;
      }
      const { firstIndex, lastIndex } = this.virtualWindow;
      const from = firstIndex + 1;
      const to = lastIndex;
      return `${n} obras no total; área visível aproximada: linhas ${from} a ${to} (rolagem vertical na tabela).`;
    },
  },
  watch: {
    showFullListMode() {
      this.resetScroll();
    },
    rows() {
      this.$nextTick(() => {
        this.measureViewport();
        if (this.scrollTop > 0 && this.$refs.scrollWrap) {
          const max = this.$refs.scrollWrap.scrollHeight - this.$refs.scrollWrap.clientHeight;
          if (this.scrollTop > max) this.resetScroll();
        }
      });
    },
  },
  mounted() {
    this.$nextTick(() => {
      this.measureViewport();
      this.setupResizeObserver();
    });
  },
  beforeUnmount() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  },
  methods: {
    displayRank(localIdx) {
      if (!this.virtualActive) return localIdx + 1;
      return this.virtualWindow.firstIndex + localIdx + 1;
    },
    onTableScroll(e) {
      this.scrollTop = e.target.scrollTop;
    },
    measureViewport() {
      const el = this.$refs.scrollWrap;
      if (el) this.viewportHeight = el.clientHeight;
    },
    setupResizeObserver() {
      const el = this.$refs.scrollWrap;
      if (!el || typeof ResizeObserver === 'undefined') return;
      this.resizeObserver = new ResizeObserver(() => this.measureViewport());
      this.resizeObserver.observe(el);
    },
    resetScroll() {
      this.$nextTick(() => {
        const el = this.$refs.scrollWrap;
        if (el) el.scrollTop = 0;
        this.scrollTop = 0;
        this.measureViewport();
      });
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

.district-overview {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  padding: 22px 28px 16px;
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
  padding: 18px 28px 28px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior-x: contain;
  outline: none;
}

.results-table-wrap:focus-visible {
  box-shadow: inset 0 0 0 2px rgba(56, 189, 248, 0.35);
  border-radius: 12px;
}

.results-table-wrap--virtual {
  max-height: min(72vh, 960px);
  overflow-y: auto;
  overscroll-behavior-y: contain;
}

.oportunidades-table {
  width: 100%;
  min-width: 720px;
  border-collapse: separate;
  border-spacing: 0;
}

.oportunidades-th-text {
  display: inline-block;
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

.oportunidades-vpad__cell {
  padding: 0 !important;
  border: none !important;
  vertical-align: top;
  line-height: 0;
  font-size: 0;
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

.text-end {
  text-align: right;
}

@media (max-width: 820px) {
  .district-overview {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .district-overview,
  .results-table-wrap {
    padding-left: 18px;
    padding-right: 18px;
  }
}
</style>
