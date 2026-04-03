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
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

th,
td {
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
</style>
