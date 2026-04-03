<template>
  <div class="table-wrapper">
    <table>
      <thead>
        <tr v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
          <th v-for="header in headerGroup.headers" :key="header.id">
            <span v-if="!header.isPlaceholder">
              {{ header.column.columnDef.header }}
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in table.getRowModel().rows" :key="row.id">
          <td
            v-for="cell in row.getVisibleCells()"
            :key="cell.id"
            :class="cell.column.columnDef.meta?.isValue
              ? ['value-cell', badgeClassFn(cell.getValue())]
              : ['team-cell']"
          >
            <template v-if="cell.column.columnDef.meta?.isTeam">
              <span class="team-tag" :class="{ pinned: pinnedCheckerFn(row.original.code) }">
                {{ row.original.display }}
              </span>
              <small>{{ row.original.plate || 'Sem placa' }}</small>
            </template>
            <template v-else>
              {{ cell.getValue() }}
            </template>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { getCoreRowModel, useVueTable } from '@tanstack/vue-table';
import { createColumnHelper } from '@tanstack/table-core';

const props = defineProps({
  teams: {
    type: Array,
    default: () => [],
  },
  dates: {
    type: Array,
    default: () => [],
  },
  valueGetter: {
    type: Function,
    required: true,
  },
  formatShort: {
    type: Function,
    required: true,
  },
  badgeClass: {
    type: Function,
    required: true,
  },
  pinnedChecker: {
    type: Function,
    required: true,
  },
});

const columnHelper = createColumnHelper();

const badgeClassFn = (value) => props.badgeClass(value);
const pinnedCheckerFn = (code) => props.pinnedChecker(code);

const dateColumns = computed(() =>
  props.dates.map((col) =>
    columnHelper.accessor((row) => props.valueGetter(row, col.key), {
      id: col.key,
      header: col.label,
      cell: (info) => props.formatShort(info.getValue()),
      meta: { isValue: true },
    })
  )
);

const columns = computed(() => [
  columnHelper.display({
    id: 'team-meta',
    header: 'Equipe',
    cell: (info) => info.row.original,
    meta: { isTeam: true },
  }),
  // optional extra columns (D, L, AH) when present on team objects
  ...(() => {
    const hasD = props.teams.some((t) => t && t.colD != null);
    const hasL = props.teams.some((t) => t && t.colL != null);
    const hasAH = props.teams.some((t) => t && t.colAH != null);
    const extras = [];
    if (hasD) {
      extras.push(
        columnHelper.accessor((row) => row.colD, {
          id: 'colD',
          header: 'D',
          cell: (info) => (info.getValue() == null ? '—' : String(info.getValue())),
        })
      );
    }
    if (hasL) {
      extras.push(
        columnHelper.accessor((row) => row.colL, {
          id: 'colL',
          header: 'L',
          cell: (info) => (info.getValue() == null ? '—' : String(info.getValue())),
        })
      );
    }
    if (hasAH) {
      extras.push(
        columnHelper.accessor((row) => row.colAH, {
          id: 'colAH',
          header: 'AH',
          cell: (info) => (info.getValue() == null ? '—' : String(info.getValue())),
        })
      );
    }
    return extras;
  })(),
  ...dateColumns.value,
]);

const table = useVueTable({
  get data() {
    return props.teams;
  },
  get columns() {
    return columns.value;
  },
  getCoreRowModel: getCoreRowModel(),
});
</script>

<style scoped>
.table-wrapper {
  overflow-x: auto;
  border-radius: 18px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(2, 6, 23, 0.28);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

th,
td {
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 0.8rem 0.9rem;
  text-align: center;
}

th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgba(15, 23, 42, 0.96);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  font-size: 0.74rem;
  color: rgba(255, 255, 255, 0.72);
}

tbody tr:nth-child(even) {
  background: rgba(255, 255, 255, 0.02);
}

tbody tr:hover {
  background: rgba(59, 130, 246, 0.08);
}

.team-cell {
  text-align: left;
  min-width: 200px;
}

.team-cell small {
  display: block;
  margin-top: 0.3rem;
  color: rgba(255, 255, 255, 0.58);
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
</style>
