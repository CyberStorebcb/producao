<template>
  <section class="menu-hero">
    <div class="matrix">
      <header class="hero-head">
        <div class="hero-copy">
          <p class="eyebrow">Operação Centro</p>
          <h1>Lobby Operacional</h1>
          <p class="subtext">Painel de acompanhamento em tempo real do turno.</p>
        </div>
        <div class="hero-actions">
          <button class="live-pill">
            <i class="bi bi-broadcast-pin" aria-hidden="true"></i>
            <span>AO VIVO</span>
          </button>
          <button class="mini-cta" @click="$emit('select','programacao')">
            Agenda
            <i class="bi bi-arrow-up-right"></i>
          </button>
          <button class="mini-cta" :disabled="sheetUpdating" @click="updateFromSheets">
            <span v-if="!sheetUpdating">Atualizar dados</span>
            <span v-else>Atualizando...</span>
            <i class="bi bi-arrow-repeat"></i>
          </button>
        </div>
      </header>

      <div class="info-belt">
        <template v-for="(card, idx) in statusCards" :key="card.id">  
          <article v-if="card.id === 'window'" class="info-card janela-card">
            <div class="janela-header">
              <p>{{ card.label }}</p>
              <i class="bi bi-clock-history janela-ico"></i>
            </div>
            <div class="janela-main">
              <span class="janela-horas">{{ card.value }}</span>
              <span class="janela-descanso">{{ card.meta }}</span>
            </div>
          </article>
          <article v-else-if="card.id === 'status'" class="info-card status-card">
            <div class="status-header">
              <p>{{ card.label }}</p>
              <i class="bi bi-patch-check-fill status-ico"></i>
            </div>
            <div class="status-main">
              <span class="status-value">{{ card.value }}</span>
              <span class="status-meta">{{ card.meta }}</span>
            </div>
          </article>
          <article v-else-if="card.id === 'routes'" class="info-card rotas-card">
            <div class="rotas-header">
              <p>{{ card.label }}</p>
              <i class="bi bi-geo-alt-fill rotas-ico"></i>
            </div>
            <div class="rotas-main">
              <span class="rotas-value">{{ card.value }}</span>
              <span class="rotas-meta">{{ card.meta }}</span>
            </div>
          </article>
          <article v-else class="info-card">
            <p>{{ card.label }}</p>
            <strong>{{ card.value }}</strong>
            <span>{{ card.meta }}</span>
          </article>
          <!-- Após o primeiro card, insere o card de clima como um card separado -->
          <template v-if="idx === 0 && weather">
            <article class="info-card weather-card">
              <div class="weather-header">
                <span class="weather-city">Bacabal-MA</span>
                <img :src="weather.iconUrl" :alt="weather.description" v-if="weather.iconUrl" class="weather-icon-big" />
              </div>
              <div class="weather-main">
                <span class="weather-temp">{{ weather.temp }}°C</span>
                <span class="weather-desc">{{ weather.description }}</span>
              </div>
            </article>
          </template>
        </template>
      </div>

      <div class="canvas-grid">
        <section class="tile tile-flow">
          <div class="tile-head">
            <h2>Fluxo</h2>
            <button class="chip" @click="$emit('select','equipes')">
              Equipes
              <i class="bi bi-arrow-up-right"></i>
            </button>
          </div>
          <div class="flow-stats">
            <div
              v-for="stat in flowStats"
              :key="stat.id"
              :class="['flow-card', stat.id === 'prod' ? 'producao-card' : '', `flow-${stat.id}`]"
            >
              <div class="flow-card-top">
                <p>{{ stat.label }}</p>
                <i :class="['bi', getFlowIcon(stat.id), 'flow-icon']"></i>
              </div>

              <div class="flow-value-row">
                <strong v-if="stat.id === 'prod'">R$ {{ formatCurrency(stat.value) }}</strong>
                <strong v-else>{{ stat.value }}</strong>
                <span
                  v-if="extractTrend(stat.hint)"
                  :class="['trend-pill', isNegativeTrend(stat.hint) ? 'down' : 'up']"
                >
                  {{ extractTrend(stat.hint) }}
                </span>
              </div>

              <small>{{ stat.hint }}</small>

              <div class="flow-progress" role="presentation" aria-hidden="true">
                <span :style="{ width: `${getFlowProgress(stat.id)}%` }"></span>
              </div>
            </div>
          </div>
        </section>

        <section class="tile tile-timeline">
          <div class="tile-head">
            <h3>Timeline</h3>
            <span class="tile-note">4 eventos</span>
          </div>
          <ul class="timeline" role="list">
            <li v-for="item in timeline" :key="item.id">
              <span class="time">{{ item.time }}</span>
              <div class="timeline-copy">
                <p>{{ item.title }}</p>
                <small :class="item.status">{{ item.statusLabel }}</small>
              </div>
              <button class="bare" :aria-label="`Abrir ${item.title}`" @click="$emit('select', item.target)">
                <i class="bi bi-arrow-up-right"></i>
              </button>
            </li>
          </ul>
        </section>

        <section class="tile tile-zones">
          <div class="tile-head">
            <h3>Zonas</h3>
            <button class="chip" @click="$emit('select','equipes')">
              Ajustar
              <i class="bi bi-people"></i>
            </button>
          </div>
          <ul class="zones" role="list">
            <li v-for="zone in zones" :key="zone.id">
              <div>
                <p>{{ zone.label }}</p>
                <small>{{ zone.window }}</small>
              </div>
              <div class="zone-meta">
                <span>{{ zone.load }}</span>
                <span>{{ zone.crew }}</span>
                <span class="zone-risk" :class="zone.risk">{{ zone.riskLabel }}</span>
              </div>
            </li>
          </ul>
        </section>

        <section class="tile tile-alerts">
          <div class="tile-head">
            <h3>Alertas</h3>
            <button class="chip" @click="$emit('select','apontamento')">
              Ver tudo
              <i class="bi bi-clipboard-data"></i>
            </button>
          </div>
          <ul class="alerts" role="list">
            <li v-for="alert in alerts" :key="alert.id" @click="$emit('select', alert.target)">
              <div>
                <p>{{ alert.title }}</p>
                <small>{{ alert.meta }}</small>
              </div>
              <span class="alert-pill" :class="alert.severity">{{ alert.severityLabel }}</span>
              <i class="bi bi-arrow-up-right"></i>
            </li>
          </ul>
        </section>
      </div>

      <div class="quick-strip">
        <button v-for="action in quickActions" :key="action.id" class="quick-pill" @click="$emit('select', action.target)" :aria-label="action.label">
          <i :class="['bi', action.icon]"></i>
          <span>{{ action.label }}</span>
        </button>
      </div>
    </div>
  </section>
</template>

<script>
export default {
  name: 'MenuHero',
  data() {
    return {
      statusCards: [
        { id: 'window', label: 'Janela', value: '07h-18h', meta: 'Descanso 2h' },
        { id: 'status', label: 'Status', value: 'Estável', meta: '0 bloqueios' },
        { id: 'routes', label: 'Rotas', value: '18 ativas', meta: '3 alertas' }
      ],
      flowStats: [
        { id: 'prod', label: 'Produção', value: '312 u/h', hint: '+8% vs meta' },
        { id: 'sla', label: 'SLA', value: '96.4%', hint: '+2% hoje' },
        { id: 'teams', label: 'Equipes', value: '12 em rota', hint: '2 stand-by' },
        { id: 'backlog', label: 'Backlog', value: '47 ordens', hint: '-11 na hora' },
        { id: 'routes', label: 'Rotas', value: '18 ao vivo', hint: '3 alertas' }
      ],
      timeline: [
        { id: 1, time: '08:30', title: 'Brief matinal', status: 'ok', statusLabel: 'No horário', target: 'equipes' },
        { id: 2, time: '10:05', title: 'Recalcular slots', status: 'warn', statusLabel: 'Atenção', target: 'programacao' },
        { id: 3, time: '11:35', title: 'Checklist operação', status: 'late', statusLabel: '+10 min', target: 'apontamento' },
        { id: 4, time: '13:00', title: 'Janela climática', status: 'ok', statusLabel: 'Monitorar', target: 'programacao' }
      ],
      zones: [
        { id: 'zona-a', label: 'Zona Azul', window: '08h-12h', load: '85% carga', crew: '3 eqp', risk: 'low', riskLabel: 'Estável' },
        { id: 'zona-b', label: 'Corredor Leste', window: '09h-14h', load: '112% carga', crew: '4 eqp', risk: 'med', riskLabel: 'Atenção' },
        { id: 'zona-c', label: 'Anel Sul', window: '10h-18h', load: '74% carga', crew: '2 eqp', risk: 'low', riskLabel: 'Controlado' },
        { id: 'zona-d', label: 'Setor Industrial', window: '11h-17h', load: '129% carga', crew: '3 eqp', risk: 'high', riskLabel: 'Crítico' }
      ],
      alerts: [
        { id: 'alert-1', title: 'Rota 4 +17 min', meta: 'Equipe Delta', severity: 'warn', severityLabel: 'Atenção', target: 'equipes' },
        { id: 'alert-2', title: 'Backlog industrial', meta: '+6 ordens · Setor 7', severity: 'crit', severityLabel: 'Crítico', target: 'producao' },
        { id: 'alert-3', title: 'Chuva leve prevista', meta: '13h15 · 60%', severity: 'info', severityLabel: 'Monitorar', target: 'programacao' }
      ],
      quickActions: [
        { id: 'prod', label: 'Prod', icon: 'bi-graph-up-arrow', target: 'producao' },
        { id: 'prog', label: 'Prog', icon: 'bi-kanban', target: 'programacao' },
        { id: 'eqp', label: 'Eqp', icon: 'bi-people', target: 'equipes' },
        { id: 'apont', label: 'Apont', icon: 'bi-clipboard-data', target: 'apontamento' }
      ],
      weather: null,
      // initial query can be a place name; after first fetch we'll switch to lat,lon
      weatherQuery: 'Bacabal,MA',
      weatherTimer: null,
      sheetUpdating: false,
      sheetUpdateStatus: null,
      lastSheetUpdateAt: null,
      weatherError: null
    };
  },
  mounted() {
    this.fetchWeather();
    // start polling weather every 15 minutes
    this.weatherTimer = setInterval(() => this.fetchWeather(), 15 * 60 * 1000);
  },
  unmounted() {
    // clear polling when component is destroyed
    if (this.weatherTimer) clearInterval(this.weatherTimer);
  },
  methods: {
    async fetchWeather() {
      const apiKey = '13bac35c0c1b49bb8ce135347260304';
      const query = this.weatherQuery || 'Bacabal,MA';
      const url = `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${encodeURIComponent(query)}&lang=pt`;
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Erro ao buscar clima');
        const data = await response.json();
        // Log full response to help debug differences between providers
        console.info('weatherapi response:', data);
        this.weather = {
          temp: Math.round(data.current.temp_c),
          description: data.current.condition.text,
          iconUrl: 'https:' + data.current.condition.icon,
          // expose location (name, region, lat, lon) for debugging
          location: data.location || null,
          // human-friendly timestamp from provider
          lastUpdated: data.current.last_updated || null
        };
        // after first successful fetch, switch to precise lat,lon for subsequent requests
        if (data.location && typeof data.location.lat === 'number' && typeof data.location.lon === 'number') {
          const latlon = `${data.location.lat},${data.location.lon}`;
          if (this.weatherQuery !== latlon) this.weatherQuery = latlon;
        }
      } catch (e) {
        this.weatherError = 'Não foi possível obter o clima.';
      }
    },

    async updateFromSheets() {
      // attempts to call local server that can read Dropbox-local copies
      const endpoint = 'http://localhost:5176/dropbox-diario';
      this.sheetUpdating = true;
      this.sheetUpdateStatus = null;
      try {
        const resp = await fetch(endpoint, { cache: 'no-store' });
        if (!resp.ok) throw new Error('Falha ao buscar planilha: ' + resp.status);
        const json = await resp.json();
        console.info('dropbox-diario result:', json);
        this.sheetUpdateStatus = { ok: true, origin: json.origin || 'unknown', rows: Array.isArray(json.data) ? json.data.length : null };
        this.lastSheetUpdateAt = new Date().toISOString();
        // optional: emit event so parent can react
        this.$emit('sheets-updated', json.data);
      } catch (err) {
        console.error('Erro ao atualizar planilhas:', err);
        this.sheetUpdateStatus = { ok: false, message: err.message };
      } finally {
        this.sheetUpdating = false;
      }
    },
    formatCurrency(valor) {
      // Se já for número, converte, senão tenta extrair número
      let num = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(/[^\d,\.]/g, '').replace(',', '.'));
      if (isNaN(num)) return valor;
      return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    },
    getFlowIcon(id) {
      const icons = {
        prod: 'bi-currency-dollar',
        sla: 'bi-speedometer2',
        teams: 'bi-people-fill',
        backlog: 'bi-stack',
        routes: 'bi-signpost-split-fill'
      };
      return icons[id] || 'bi-circle-fill';
    },
    getFlowProgress(id) {
      const progress = {
        prod: 78,
        sla: 96,
        teams: 82,
        backlog: 61,
        routes: 74
      };
      return progress[id] || 50;
    },
    extractTrend(hint) {
      const match = String(hint || '').match(/[+-]?\d+%/);
      return match ? match[0] : '';
    },
    isNegativeTrend(hint) {
      return String(this.extractTrend(hint)).startsWith('-');
    }
  }
};
</script>

<style scoped>
          .producao-card strong {
            color: #22d3ee;
            font-size: 1.5rem;
            font-weight: 700;
            letter-spacing: 0.02em;
          }
        .rotas-card {
          background: linear-gradient(120deg, rgba(59,130,246,0.13) 60%, rgba(251,191,36,0.08) 100%);
          border: 1.5px solid #38bdf8;
          box-shadow: 0 2px 16px 0 rgba(59,130,246,0.08);
          min-width: 210px;
          padding-bottom: 18px;
          padding-top: 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .rotas-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          margin-bottom: 2px;
        }
        .rotas-header p {
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-size: 0.62rem;
          color: #38bdf8;
          font-weight: 700;
        text-shadow: 0 1px 2px #222b;
        line-height: 1.1;
      }
        .rotas-ico {
          font-size: 1.2rem;
          color: #e2e8f0;
          margin-left: 6px;
        }
        .rotas-main {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 2px;
        }
        .rotas-value {
          font-size: 2.1rem;
          font-weight: 800;
          color: #fbbf24;
          letter-spacing: 0.01em;
          text-shadow: 0 2px 8px #222b44, 0 1px 2px #222b;
          line-height: 1.08;
        }
        .rotas-meta {
          font-size: 1.08rem;
          color: #fde68a;
          font-weight: 500;
          margin-top: 2px;
          letter-spacing: 0.01em;
          text-shadow: 0 1px 2px #222b;
        }
        /* Meta pill styles for consistent, prominent badges */
        .status-meta, .janela-descanso, .rotas-meta {
          display: inline-block;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 0.95rem;
          font-weight: 600;
          text-shadow: none;
        }
        .status-meta { background: rgba(34,197,94,0.06); border: 1px solid rgba(34,197,94,0.12); color: #baf7d1; }
        .janela-descanso { background: rgba(56,189,248,0.04); border: 1px solid rgba(56,189,248,0.12); color: #9fe6ff; }
        .rotas-meta { background: rgba(251,191,36,0.04); border: 1px solid rgba(251,191,36,0.12); color: #ffecb0; }

        @media (max-width: 520px) {
          .janela-main, .status-main, .rotas-main {
            flex-direction: column;
            align-items: flex-start;
            gap: 6px;
          }
        }
        .status-card {
          background: linear-gradient(120deg, rgba(34,197,94,0.10) 60%, rgba(34,211,238,0.10) 100%);
          border: 1.5px solid #22d3ee;
          box-shadow: 0 2px 16px 0 rgba(34,211,238,0.08);
          min-width: 210px;
          padding-bottom: 18px;
          padding-top: 18px;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .status-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          margin-bottom: 2px;
        }
        .status-header p {
          margin: 0;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          font-size: 0.62rem;
          color: #86efac;
          font-weight: 700;
          text-shadow: 0 1px 2px #222b;
          line-height: 1.1;
        }
        .status-main {
          display: flex;
          flex-direction: row;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 2px;
        }
        .status-value {
          font-size: 2.1rem;
          font-weight: 800;
          color: #4ade80;
          letter-spacing: 0.01em;
          text-shadow: 0 2px 8px #222b44, 0 1px 2px #222b;
          line-height: 1.08;
        }
        .status-meta {
          font-size: 1.08rem;
          color: #bbf7d0;
          font-weight: 500;
          margin-top: 2px;
          letter-spacing: 0.01em;
          text-shadow: 0 1px 2px #222b;
        }
        .status-ico {
          font-size: 1.2rem;
          color: #6ee7b7;
          margin-left: 6px;
        }
    .janela-card {
      background: linear-gradient(120deg, rgba(59,130,246,0.10) 60%, rgba(34,211,238,0.13) 100%);
      border: 1.5px solid #38bdf8;
      box-shadow: 0 2px 16px 0 rgba(59,130,246,0.08);
      min-width: 210px;
      padding-bottom: 18px;
      padding-top: 18px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .janela-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      margin-bottom: 2px;
    }
    .janela-header p {
      margin: 0;
      text-transform: uppercase;
      letter-spacing: 0.2em;
      font-size: 0.62rem;
      color: #60a5fa;
      font-weight: 700;
    }
    .janela-ico {
      font-size: 1.2rem;
      color: #38bdf8;
      margin-left: 6px;
    }
    .janela-main {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 2px;
    }
    .janela-horas {
      font-size: 2.1rem;
      font-weight: 800;
      color: #38bdf8;
      letter-spacing: 0.01em;
      text-shadow: 0 2px 8px #222b44, 0 1px 2px #222b;
      line-height: 1.08;
    }
    .janela-descanso {
      font-size: 1.08rem;
      color: #7dd3fc;
      font-weight: 500;
      margin-top: 2px;
      letter-spacing: 0.01em;
      text-shadow: 0 1px 2px #222b;
    }
  .weather-card {
    background: linear-gradient(120deg, rgba(34,211,238,0.13) 60%, rgba(59,130,246,0.10) 100%);
    color: #fff;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
    min-width: 210px;
    box-shadow: 0 2px 16px 0 rgba(34,211,238,0.08);
    border: 1.5px solid #22d3ee;
    transition: box-shadow 0.2s, border 0.2s;
  }
  .weather-card:hover {
    box-shadow: 0 4px 24px 0 rgba(34,211,238,0.18);
    border: 1.5px solid #38bdf8;
  }
  .weather-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 2px;
  }
  .weather-city {
    font-size: 0.78rem;
    color: #bae6fd;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-shadow: 0 1px 2px #222b;
  }
  .weather-icon-big {
    width: 38px;
    height: 38px;
    margin-left: 8px;
    filter: drop-shadow(0 1px 2px #222b);
  }
  .weather-main {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 2px;
    width: 100%;
  }
  .weather-temp {
    font-size: 1.7rem;
    font-weight: 700;
    line-height: 1.1;
    color: #fff;
    text-shadow: 0 1px 2px #222b;
  }
  .weather-desc {
    font-size: 1.05rem;
    color: #bae6fd;
    font-weight: 500;
    margin-top: 2px;
    text-shadow: 0 1px 2px #222b;
  }
      .info-card {
        cursor: pointer;
        transition: transform 0.15s, border 0.15s;
      }
      .info-card:hover {
        border-color: #22d3ee;
        transform: translateY(-2px) scale(1.03);
        z-index: 2;
      }
    .weather-info {
      margin-bottom: 12px;
      font-size: 1.1em;
      display: flex;
      align-items: center;
      gap: 8px;
      color: #fff;
      background: rgba(34, 211, 238, 0.12);
      border-radius: 12px;
      padding: 8px 16px;
      width: fit-content;
    }
  .menu-hero { width: 100%; min-height: 100vh; padding: 0; background: transparent; position: relative; overflow: hidden; }
  .matrix { position: relative; z-index: 1; width: 100%; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 24px; padding: clamp(24px, 4vw, 90px); }

  .hero-head { grid-column: 1 / -1; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 16px; }
  .hero-copy { flex: 1 1 720px; max-width: 920px; display: flex; flex-direction: column; align-items: flex-start; gap: 8px; }
  .hero-copy h1 { margin: 0; font-size: clamp(2.2rem, 5vw, 4rem); font-family: 'Space Grotesk', sans-serif; color: #ffffff; font-weight: 700; line-height: 1.02; letter-spacing: -0.01em; position: relative; }
  .hero-copy h1::before { content: ''; position: absolute; left: -18px; top: 50%; transform: translateY(-50%); width: 8px; height: 60%; border-radius: 4px; background: linear-gradient(180deg,#22d3ee,#38bdf8); opacity: 0.18; }
  .hero-copy p { margin: 0; }
  .eyebrow { letter-spacing: 0.35em; text-transform: uppercase; font-size: 0.68rem; color: rgba(255,255,255,0.56); font-weight: 700; }
  .subtext { color: rgba(226,232,240,0.85); font-size: 1.02rem; margin-top: 6px; max-width: 760px; opacity: 0.95; }
  @media (max-width: 920px) {
    .hero-copy { align-items: flex-start; }
    .hero-copy h1::before { left: -14px; width: 6px; }
  }
  .hero-actions { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
  .live-pill {
    border: none;
    border-radius: 999px;
    padding: 10px 22px;
    background: linear-gradient(90deg,#12c5da,#22d3ee);
    color: #042029;
    font-weight: 800;
    letter-spacing: 0.12em;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 6px 18px rgba(34,211,238,0.12);
    transition: transform 0.14s ease, box-shadow 0.14s ease;
  }
  .live-pill i { font-size: 1.05rem; color: rgba(2,10,14,0.85); }
  .live-pill:hover { transform: translateY(-3px); box-shadow: 0 12px 34px rgba(34,211,238,0.18); }
  .live-pill:focus { outline: 3px solid rgba(34,211,238,0.12); }
  .mini-cta {
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 999px;
    padding: 10px 18px;
    background: rgba(255,255,255,0.02);
    color: #e6eef6;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: background 0.12s ease, transform 0.12s ease, border-color 0.12s ease;
  }
  .mini-cta i { opacity: 0.95; }
  .mini-cta:hover { background: rgba(255,255,255,0.04); transform: translateY(-2px); border-color: rgba(34,211,238,0.12); }
  .mini-cta:focus { outline: 3px solid rgba(255,255,255,0.04); }

  .info-belt { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: clamp(12px, 1.5vw, 20px); }
  .info-card { padding: 18px; border-radius: 22px; border: 1px solid rgba(255,255,255,0.08); background: rgba(7,12,20,0.75); color: #fff; display: flex; flex-direction: column; gap: 4px; }
  .janela-card,
  .status-card,
  .rotas-card {
    min-height: 120px;
  }
  .info-card p { margin: 0; text-transform: uppercase; letter-spacing: 0.2em; font-size: 0.62rem; color: rgba(255,255,255,0.6); }
  .info-card strong { font-size: 1.2rem; }
  .info-card span { color: rgba(255,255,255,0.65); font-size: 0.85rem; }

  .canvas-grid { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 24px; }
  .tile { border-radius: 30px; border: 1px solid rgba(255,255,255,0.06); background: rgba(8,12,20,0.82); padding: clamp(18px, 2vw, 28px); display: flex; flex-direction: column; gap: 16px; color: #fff; backdrop-filter: blur(14px); }
  .tile-head { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .tile-head h2, .tile-head h3 { margin: 0; font-size: 1.3rem; }
  .chip { border: 1px solid rgba(255,255,255,0.2); background: transparent; color: #fff; border-radius: 999px; padding: 6px 14px; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; font-size: 0.85rem; }
  .tile-note { font-size: 0.8rem; color: rgba(255,255,255,0.6); }

  .tile-flow { grid-column: span 6; }
  .flow-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; }
  .flow-card { padding: 14px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.07); background: linear-gradient(165deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012)); display: flex; flex-direction: column; gap: 6px; position: relative; overflow: hidden; transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease; }
  .flow-card::before { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at top right, rgba(56,189,248,0.18), transparent 45%); opacity: 0; transition: opacity 0.22s ease; pointer-events: none; }
  .flow-card:hover { transform: translateY(-4px); border-color: rgba(62,198,224,0.45); box-shadow: 0 10px 20px rgba(3,10,18,0.35); }
  .flow-card:hover::before { opacity: 1; }
  .flow-card-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .flow-icon { color: rgba(186,230,253,0.8); font-size: 0.9rem; }
  .flow-value-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .flow-card p { margin: 0; text-transform: uppercase; letter-spacing: 0.16em; font-size: 0.6rem; color: rgba(255,255,255,0.55); }
  .flow-card strong { font-size: 1.3rem; }
  .flow-card small { color: rgba(255,255,255,0.6); }
  .trend-pill { border-radius: 999px; padding: 3px 8px; font-size: 0.65rem; letter-spacing: 0.06em; font-weight: 700; }
  .trend-pill.up { background: rgba(34,197,94,0.18); color: #22c55e; }
  .trend-pill.down { background: rgba(248,113,113,0.16); color: #f87171; }
  .flow-progress { width: 100%; height: 4px; border-radius: 999px; background: rgba(148,163,184,0.2); margin-top: 6px; overflow: hidden; }
  .flow-progress span { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, #22d3ee, #38bdf8); transition: width 0.35s ease; }
  .flow-backlog .flow-progress span { background: linear-gradient(90deg, #fbbf24, #f59e0b); }

  .tile-timeline { grid-column: span 6; }
  .timeline { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
  .timeline li {
    display: grid;
    grid-template-columns: auto 1fr auto;
    gap: 16px;
    align-items: center;
    padding: 14px 16px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.04);
    background: linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.00));
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  }
  .timeline li:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 18px rgba(2,6,23,0.5);
    border-color: rgba(62,198,224,0.12);
  }
  .timeline .time {
    font-weight: 800;
    background: rgba(255,255,255,0.03);
    color: #ffffff;
    padding: 8px 10px;
    border-radius: 10px;
    min-width: 56px;
    text-align: center;
    box-shadow: inset 0 -6px 12px rgba(0,0,0,0.12);
    font-size: 0.95rem;
    letter-spacing: 0.02em;
  }
  .timeline-copy p { margin: 0; font-weight: 700; font-size: 0.98rem; color: #e6eef6; }
  .timeline-copy small { font-size: 0.72rem; letter-spacing: 0.18em; text-transform: uppercase; display: block; margin-top: 6px; }
  .timeline-copy small.ok { color: #22c55e; }
  .timeline-copy small.warn { color: #fbbf24; }
  .timeline-copy small.late { color: #f87171; }
  .bare {
    border: none;
    background: transparent;
    color: #3ec6e0;
    cursor: pointer;
    width: 38px;
    height: 38px;
    display: inline-grid;
    place-items: center;
    border-radius: 999px;
    transition: background 0.12s ease, transform 0.12s ease;
  }
  .bare:hover { background: rgba(62,198,224,0.06); transform: translateX(3px); }

  .tile-zones { grid-column: span 6; }
  .zones { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
  .zones li {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 16px;
    border-radius: 14px;
    border: 1px solid rgba(255,255,255,0.04);
    background: linear-gradient(180deg, rgba(255,255,255,0.01), rgba(255,255,255,0.00));
    align-items: center;
    transition: transform 0.14s ease, box-shadow 0.14s ease, border-color 0.14s ease;
  }
  .zones li + li { border-top: 1px solid rgba(255,255,255,0.02); }
  .zones li:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(2,6,23,0.45); border-color: rgba(62,198,224,0.08); }
  .zones p { margin: 0; font-weight: 700; font-size: 1rem; color: #e6eef6; }
  .zones small { color: rgba(255,255,255,0.55); display: block; margin-top: 6px; font-size: 0.88rem; }
  .zone-meta { display: flex; align-items: center; gap: 14px; font-size: 0.9rem; color: rgba(226,232,240,0.85); }
  .zone-meta span { color: rgba(255,255,255,0.75); font-weight: 600; }
  .zone-risk { padding: 6px 12px; border-radius: 999px; font-size: 0.72rem; letter-spacing: 0.12em; text-transform: uppercase; font-weight: 700; }
  .zone-risk.low { background: rgba(34,197,94,0.12); color: #16a34a; border: 1px solid rgba(34,197,94,0.08); }
  .zone-risk.med { background: rgba(251,191,36,0.12); color: #b45309; border: 1px solid rgba(251,191,36,0.08); }
  .zone-risk.high { background: rgba(248,113,113,0.12); color: #b91c1c; border: 1px solid rgba(248,113,113,0.08); }

  @media (max-width: 768px) {
    .zones li { padding: 12px; }
    .zone-meta { gap: 10px; }
  }

  @media (max-width: 520px) {
    .zones li { flex-direction: column; align-items: flex-start; gap: 8px; }
    .zone-meta { width: 100%; display: flex; justify-content: space-between; }
  }

  .tile-alerts { grid-column: span 12; }
  .alerts { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 12px; }
  .alerts li { flex: 1 1 240px; min-width: 220px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 14px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.03); cursor: pointer; transition: transform 0.18s ease, border 0.18s ease; }
  .alerts li:hover { transform: translateY(-2px); border-color: rgba(62,198,224,0.4); }
  .alerts p { margin: 0; font-weight: 600; }
  .alerts small { color: rgba(255,255,255,0.65); }
  .alert-pill { padding: 4px 12px; border-radius: 999px; font-size: 0.72rem; letter-spacing: 0.16em; text-transform: uppercase; }
  .alert-pill.info { background: rgba(59,130,246,0.2); color: #60a5fa; }
  .alert-pill.warn { background: rgba(251,191,36,0.2); color: #fbbf24; }
  .alert-pill.crit { background: rgba(248,113,113,0.2); color: #f87171; }

  .quick-strip { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 12px; justify-content: flex-start; }
  /* Centraliza o menu de navegação de ações rápidas */
  .quick-strip { justify-content: center; }
  .quick-pill {
    border: 1px solid rgba(255,255,255,0.06);
    background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.00));
    border-radius: 14px;
    padding: 10px 14px;
    color: #e6eef6;
    display: inline-flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
    transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease;
    font-weight: 700;
    font-size: 0.95rem;
    min-width: 88px;
    justify-content: center;
  }
  .quick-pill i { width: 20px; height: 20px; display: inline-grid; place-items: center; font-size: 0.95rem; color: #9fdaf0; }
  .quick-pill span { display: inline-block; padding: 4px 6px; }
  .quick-pill:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(2,6,23,0.4); border-color: rgba(62,198,224,0.12); }
  .quick-pill:focus { outline: 3px solid rgba(62,198,224,0.08); }
  .quick-pill.primary { background: linear-gradient(90deg,#0ea5b6,#22d3ee); color: #03161a; border-color: rgba(34,211,238,0.18); box-shadow: 0 8px 28px rgba(34,211,238,0.12); }
  .quick-pill.ghost { background: rgba(255,255,255,0.01); color: #dbeafe; border-color: rgba(255,255,255,0.04); }
  @media (max-width: 520px) {
    .quick-strip { gap: 8px; }
    .quick-pill { padding: 8px 10px; font-size: 0.9rem; }
  }

  

  /* Leve realce nos cards principais */
  .info-card { transition: transform 0.16s, border 0.16s, box-shadow 0.16s, background 0.16s; }
  .info-card:hover { box-shadow: 0 14px 36px rgba(2,6,23,0.6); }

  @media (max-width: 1200px) {
    .tile-flow { grid-column: span 12; }
    .tile-timeline { grid-column: span 6; }
    .tile-zones { grid-column: span 6; }
    .tile-alerts { grid-column: span 12; }
  }

  @media (max-width: 768px) {
    .matrix { grid-template-columns: repeat(6, minmax(0, 1fr)); }
    .hero-actions { width: 100%; }
    .canvas-grid { grid-template-columns: repeat(6, minmax(0, 1fr)); }
    .tile-flow, .tile-alerts, .tile-timeline, .tile-zones { grid-column: span 6; }
    .alerts li { flex: 1 1 100%; }
  }

  @media (max-width: 520px) {
    .menu-hero { padding: 20px; }
    .matrix { grid-template-columns: repeat(1, minmax(0, 1fr)); }
    .canvas-grid { grid-template-columns: repeat(1, minmax(0, 1fr)); }
    .tile { grid-column: span 1; }
    .hero-actions { flex-direction: column; align-items: flex-start; }
    .mini-cta { width: 100%; justify-content: center; }
  }
</style>
