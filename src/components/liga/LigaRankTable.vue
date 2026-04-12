<template>
  <table class="rank-table">
    <thead>
      <tr>
        <th scope="col">Nº</th>
        <th scope="col">{{ nameHeader }}</th>
        <th scope="col">Resultado</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="(row, idx) in rows"
        :key="`${rowKeyPrefix}-${row.id}`"
        :class="['rank-row', { 'rank-row--podium': idx < 3 }]"
      >
        <td class="rank-num">
          <span class="rank-mark" :class="`rank-mark--${idx + 1}`">
            <i v-if="idx === 0" class="bi bi-trophy-fill rank-mark__ico" aria-hidden="true" />
            <i v-else-if="idx === 1" class="bi bi-award-fill rank-mark__ico" aria-hidden="true" />
            <i v-else-if="idx === 2" class="bi bi-award rank-mark__ico" aria-hidden="true" />
            <span class="rank-mark__n">{{ idx + 1 }}</span>
          </span>
        </td>
        <td class="rank-base">{{ row[nameKey] }}</td>
        <td class="rank-pct">{{ formatPct(row[scoreKey]) }}</td>
      </tr>
    </tbody>
  </table>
</template>

<script>
export default {
  name: 'LigaRankTable',
  props: {
    rows: { type: Array, required: true },
    nameHeader: { type: String, required: true },
    nameKey: { type: String, required: true },
    scoreKey: { type: String, default: 'resultadoPct' },
    rowKeyPrefix: { type: String, default: 'r' },
  },
  methods: {
    formatPct(value) {
      return `${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
    },
  },
};
</script>

<style scoped>
.rank-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

.rank-table th {
  text-align: left;
  padding: 0.45rem 0.5rem;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #94a3b8;
  border-bottom: 1px solid rgba(148, 163, 184, 0.2);
}

.rank-table td {
  padding: 0.5rem 0.5rem;
  border-bottom: 1px solid rgba(148, 163, 184, 0.1);
}

.rank-row--podium {
  background: linear-gradient(90deg, rgba(34, 211, 238, 0.08), transparent 72%);
}

.rank-num {
  width: 3.5rem;
  vertical-align: middle;
}

.rank-mark {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.45rem;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.25);
  font-family: 'Orbitron', sans-serif;
  font-weight: 800;
  font-size: 0.78rem;
  color: #cbd5e1;
}

.rank-mark__ico {
  font-size: 0.85rem;
  opacity: 0.95;
}

.rank-mark__n {
  min-width: 1rem;
  text-align: center;
}

.rank-base {
  font-weight: 700;
  color: #f1f5f9;
  letter-spacing: 0.02em;
}

.rank-pct {
  font-family: 'Orbitron', sans-serif;
  font-weight: 700;
  color: #67e8f9;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

:global(html:not(.dark-theme)) .rank-row--podium {
  background: linear-gradient(90deg, rgba(14, 165, 233, 0.08), transparent 70%);
}

:global(html:not(.dark-theme)) .rank-mark {
  background: rgba(248, 250, 252, 0.95);
  border-color: rgba(15, 23, 42, 0.12);
  color: #64748b;
}
</style>
