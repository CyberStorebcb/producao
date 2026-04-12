/**
 * ApexCharts: barras horizontais neon (Liga). Uma única fonte de opções.
 */

const BAR_COLORS = ['#fbbf24', '#e2e8f0', '#ea580c', '#6366f1', '#22d3ee', '#a78bfa'];

export function ligaChartHeight(rowCount, rowStep = 52) {
  const n = Math.max(1, rowCount);
  return Math.max(320, 48 + n * rowStep);
}

export function ligaBarSeries(rows, valueKey = 'resultadoPct') {
  return [
    {
      name: 'Resultado',
      data: rows.map((r) => Number(Number(r[valueKey]).toFixed(2))),
    },
  ];
}

/**
 * @param {object} p
 * @param {string[]} p.categories — rótulos no eixo Y (Apex: categorias em yaxis para bar horizontal)
 * @param {number} p.xMax — máximo do eixo de valores (%)
 */
export function buildLigaHorizontalBarOptions({ categories, xMax }) {
  return {
    chart: {
      type: 'bar',
      fontFamily: 'inherit',
      foreColor: '#cbd5e1',
      toolbar: { show: false },
      animations: { enabled: true, speed: 500 },
      zoom: { enabled: false },
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 10,
        barHeight: '70%',
        distributed: true,
        dataLabels: { position: 'right' },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val, opts) => {
        const i = opts.dataPointIndex;
        return `${i + 1}º`;
      },
      offsetX: 6,
      style: {
        fontSize: '12px',
        fontWeight: 800,
        colors: ['#f8fafc'],
        fontFamily: 'Orbitron, sans-serif',
      },
      dropShadow: {
        enabled: true,
        top: 1,
        left: 0,
        blur: 6,
        opacity: 0.55,
        color: '#020617',
      },
    },
    colors: categories.map((_, i) => BAR_COLORS[Math.min(i, BAR_COLORS.length - 1)]),
    fill: {
      type: 'gradient',
      gradient: {
        shade: 'dark',
        type: 'vertical',
        shadeIntensity: 0.45,
        opacityFrom: 1,
        opacityTo: 0.62,
        stops: [0, 90, 100],
      },
    },
    stroke: {
      show: true,
      width: 2,
      colors: ['rgba(248, 250, 252, 0.35)'],
    },
    legend: { show: false },
    grid: {
      borderColor: 'rgba(148, 163, 184, 0.12)',
      strokeDashArray: 4,
      padding: { top: 10, right: 24, left: 12, bottom: 36 },
      xaxis: { lines: { show: true } },
      yaxis: { lines: { show: false } },
    },
    xaxis: {
      min: 0,
      max: xMax,
      tickAmount: 6,
      categories,
      labels: {
        style: { colors: '#94a3b8', fontSize: '11px' },
        formatter: (v) => {
          const n = Number(v);
          if (!Number.isFinite(n)) return '';
          return `${Math.round(n)}%`;
        },
      },
      axisBorder: { show: false },
      axisTicks: { show: true },
      title: {
        text: 'Resultado (%)',
        offsetY: 8,
        style: { color: '#94a3b8', fontSize: '11px', fontWeight: 600 },
      },
    },
    yaxis: {
      labels: {
        align: 'left',
        trim: false,
        maxWidth: 220,
        offsetX: -8,
        style: {
          colors: '#f1f5f9',
          fontSize: '11px',
          fontWeight: 700,
          fontFamily: 'Rajdhani, sans-serif',
        },
        formatter: (val) => val,
      },
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: (v, opts) => {
          const i = opts.dataPointIndex;
          const nome = categories[i] || '';
          return `${nome}: ${Number(v).toFixed(1)}%`;
        },
        title: { formatter: () => '' },
      },
    },
  };
}

/** Ordem visual do pódio: 2º · 1º · 3º */
export function buildPodiumPlaces(rankedTop3) {
  const top = rankedTop3.slice(0, 3);
  return [
    { rank: 2, row: top[1] || null, medal: String.fromCodePoint(0x1f948) },
    { rank: 1, row: top[0] || null, medal: String.fromCodePoint(0x1f947) },
    { rank: 3, row: top[2] || null, medal: String.fromCodePoint(0x1f949) },
  ];
}
