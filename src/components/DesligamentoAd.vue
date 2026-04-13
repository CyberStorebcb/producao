<template>
  <section class="dashboard-container dark-theme">
    <div class="bg-glow"></div>

    <header class="main-header">
      <div class="brand">
        <div class="logo-icon">C</div>
        <div class="brand-text">
          <span class="kicker">Monitoramento em Tempo Real</span>
          <h1>CGB <span class="text-gradient">ENERGIA</span></h1>
        </div>
      </div>

      <nav class="filters-bar glass">
        <div class="filter-group">
          <i class="fas fa-calendar-alt"></i>
          <select v-model="filters.month" class="custom-select">
            <option v-for="m in mesesLista" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>
        <div class="filter-divider"></div>
        <div class="filter-group">
          <i class="fas fa-map-marker-alt"></i>
          <select v-model="filters.base" class="custom-select">
            <option value="GERAL">Visão Consolidada</option>
            <option v-for="base in basesDisponiveis" :key="base" :value="base">{{ base }}</option>
          </select>
        </div>
      </nav>
    </header>

    <main class="dashboard-content">
      <section class="kpi-grid">
        <div class="kpi-card glass main-kpi" :class="statusClass">
          <div class="kpi-content">
            <span class="label">ANS Global</span>
            <strong class="value">{{ kpiANS }}%</strong>
            <div class="status-indicator">
              <span class="dot"></span> {{ statusTexto }}
            </div>
          </div>
          <div class="kpi-icon"><i class="fas fa-chart-line"></i></div>
        </div>

        <div class="kpi-card glass">
          <div class="kpi-content">
            <span class="label">Total de SIs</span>
            <strong class="value">{{ dadosAtuais.total }}</strong>
            <span class="trend neutral">Volume mensal</span>
          </div>
        </div>

        <div class="kpi-card glass">
          <div class="kpi-content">
            <span class="label">Violações</span>
            <strong class="value danger-text">{{ dadosAtuais.violadas }}</strong>
            <span class="trend down">Urgência de ação</span>
          </div>
        </div>
      </section>

      <div class="visual-grid">
        <section class="chart-section glass">
          <div class="section-header">
            <h3>Evolução de Desempenho</h3>
            <div class="meta-badge">Meta: 85%</div>
          </div>
          <apexchart 
            type="area" 
            height="320" 
            :options="chartOptions" 
            :series="chartSeries" 
          />
        </section>

        <section class="list-section glass">
          <div class="section-header">
            <h3>Ranking por Unidade</h3>
          </div>
          <div class="custom-list">
            <div v-for="(info, base) in resumoUnidadesDinamico" :key="base" class="list-item">
              <div class="item-header">
                <span class="item-name">{{ base }}</span>
                <span class="item-value" :style="{ color: info.color }">{{ info.ans }}%</span>
              </div>
              <div class="progress-wrapper">
                <div class="progress-bar" :style="{ width: info.ans + '%', backgroundColor: info.color }"></div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  </section>
</template>

<script>
import { defineAsyncComponent } from 'vue';
const VueApexCharts = defineAsyncComponent(() => import('vue3-apexcharts'));

export default {
  name: 'DesligamentoAd',
  components: { apexchart: VueApexCharts },
  data() {
    return {
      filters: { month: 'ABRIL', base: 'GERAL' },
      mesesLista: ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL'],
      historico: {
        'GERAL': { JANEIRO: { total: 57, violadas: 7 }, FEVEREIRO: { total: 58, violadas: 16 }, MARÇO: { total: 77, violadas: 23 }, ABRIL: { total: 21, violadas: 9 } },
        'BACABAL': { JANEIRO: { total: 18, violadas: 1 }, FEVEREIRO: { total: 15, violadas: 2 }, MARÇO: { total: 13, violadas: 5 }, ABRIL: { total: 4, violadas: 1 } },
        'ITAPECURU MIRIM': { JANEIRO: { total: 17, violadas: 2 }, FEVEREIRO: { total: 15, violadas: 5 }, MARÇO: { total: 16, violadas: 5 }, ABRIL: { total: 5, violadas: 4 } },
        'SANTA INÊS': { JANEIRO: { total: 12, violadas: 2 }, FEVEREIRO: { total: 8, violadas: 2 }, MARÇO: { total: 13, violadas: 6 }, ABRIL: { total: 1, violadas: 0 } }
      }
    };
  },
  computed: {
    basesDisponiveis() { return Object.keys(this.historico).filter(b => b !== 'GERAL'); },
    dadosAtuais() { return this.historico[this.filters.base][this.filters.month]; },
    kpiANS() {
      const d = this.dadosAtuais;
      return d.total === 0 ? 0 : (((d.total - d.violadas) / d.total) * 100).toFixed(1);
    },
    statusTexto() { return parseFloat(this.kpiANS) >= 85 ? 'Em conformidade' : 'Abaixo da meta'; },
    statusClass() { return parseFloat(this.kpiANS) >= 85 ? 'is-success' : 'is-danger'; },
    chartSeries() {
      const dataANS = this.mesesLista.map(m => {
        const d = this.historico[this.filters.base][m];
        return parseFloat(((d.total - d.violadas) / d.total * 100).toFixed(1));
      });
      return [{ name: 'ANS %', data: dataANS }];
    },
    resumoUnidadesDinamico() {
      const resumo = {};
      this.basesDisponiveis.forEach(base => {
        const d = this.historico[base][this.filters.month];
        const ans = parseFloat(((d.total - d.violadas) / d.total * 100).toFixed(0));
        resumo[base] = { ans: ans, color: ans >= 85 ? '#10b981' : (ans >= 60 ? '#f59e0b' : '#ef4444') };
      });
      return resumo;
    },
    chartOptions() {
      return {
        chart: { toolbar: { show: false }, background: 'transparent', foreColor: '#94a3b8', fontFamily: 'Inter' },
        colors: ['#6366f1'],
        stroke: { curve: 'smooth', width: 4 },
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.01 } },
        xaxis: { categories: ['Jan', 'Fev', 'Mar', 'Abr'], axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { max: 100, labels: { formatter: (v) => v + '%' } },
        grid: { borderColor: 'rgba(148, 163, 184, 0.1)', strokeDashArray: 4 },
        annotations: {
          yaxis: [{ y: 85, borderColor: '#ef4444', label: { text: 'META', style: { color: '#fff', background: '#ef4444' } } }]
        },
        tooltip: { theme: 'dark', x: { show: false } }
      };
    }
  }
};
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;800&display=swap');

.dark-theme {
  --primary: #6366f1;
  --success: #10b981;
  --danger: #ef4444;
  --bg: #030712;
  --card-bg: rgba(17, 24, 39, 0.7);
  
  background-color: var(--bg);
  color: #f8fafc;
  min-height: 100vh;
  padding: clamp(14px, 3vw, 28px) clamp(14px, 3vw, 32px);
  box-sizing: border-box;
  font-family: 'Inter', sans-serif;
  position: relative;
  overflow-x: hidden;
}

/* Efeito de iluminação de fundo */
.bg-glow {
  position: absolute;
  top: -10%;
  right: -5%;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%);
  pointer-events: none;
}

.glass {
  background: var(--card-bg);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24px;
}

.main-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1.5rem;
}

.brand { display: flex; align-items: center; gap: 1rem; }
.logo-icon {
  width: 48px; height: 48px; background: var(--primary);
  border-radius: 14px; display: flex; align-items: center; justify-content: center;
  font-weight: 800; font-size: 1.5rem;
}

.kicker { font-size: 0.75rem; text-transform: uppercase; color: #64748b; letter-spacing: 0.1em; }
.text-gradient { background: linear-gradient(to right, #818cf8, #c084fc); background-clip: text; -webkit-background-clip: text; -webkit-text-fill-color: transparent; }

.filters-bar {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 999px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}
.filter-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.filter-divider {
  width: 1px;
  height: 28px;
  background: rgba(148, 163, 184, 0.18);
}
.custom-select {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(148, 163, 184, 0.22);
  color: #f8fafc;
  padding: 0.75rem 1.2rem;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
  outline: none;
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  transition: background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
  min-width: 170px;
}
.custom-select:hover {
  background: rgba(255, 255, 255, 0.12);
}
.custom-select:focus {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(99, 102, 241, 0.55);
  transform: translateY(-1px);
}
.custom-select option {
  background: #0f172a;
  color: #f8fafc;
}

.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.kpi-card {
  padding: 1.8rem;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  display: flex; justify-content: space-between; align-items: flex-start;
}
.kpi-card:hover { transform: translateY(-5px); box-shadow: 0 10px 30px rgba(0,0,0,0.4); }

.label { color: #94a3b8; font-size: 0.85rem; font-weight: 600; }
.value { font-size: 2.5rem; font-weight: 800; display: block; margin: 0.4rem 0; }

.status-indicator { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; font-weight: 700; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }

.is-success .value { color: var(--success); }
.is-danger .value { color: var(--danger); }

.visual-grid {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 1.5rem;
}

.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.chart-section, .list-section { padding: 2rem; }

.meta-badge {
  background: rgba(239, 68, 68, 0.1); color: var(--danger);
  padding: 0.3rem 0.8rem; border-radius: 8px; font-size: 0.7rem; font-weight: 800;
}

.list-item { margin-bottom: 1.5rem; }
.item-header { display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.9rem; font-weight: 600; }
.progress-wrapper { height: 8px; background: rgba(255,255,255,0.05); border-radius: 10px; overflow: hidden; }
.progress-bar { height: 100%; transition: width 1s cubic-bezier(0.4, 0, 0.2, 1); }

@media (max-width: 1024px) {
  .visual-grid { grid-template-columns: 1fr; }
  .main-header { flex-direction: column; align-items: flex-start; }
}
</style>