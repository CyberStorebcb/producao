<template>
  <section class="menu-hero">
    <div class="matrix">
      <header class="hero-head">
        <div class="hero-copy">
          <p class="eyebrow">Operação Sul</p>
          <h1>Lobby Operacional</h1>
          <p class="subtext">Resumo rápido do turno em um painel ultralargo.</p>
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
        </div>
      </header>

      <div class="info-belt">
        <article v-for="card in statusCards" :key="card.id" class="info-card">
          <p>{{ card.label }}</p>
          <strong>{{ card.value }}</strong>
          <span>{{ card.meta }}</span>
        </article>
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
            <div v-for="stat in flowStats" :key="stat.id" class="flow-card">
              <p>{{ stat.label }}</p>
              <strong>{{ stat.value }}</strong>
              <small>{{ stat.hint }}</small>
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
        { id: 'window', label: 'Janela', value: '08h-16h', meta: 'Prazo 11h35' },
        { id: 'weather', label: 'Clima', value: '22º · Nublado', meta: 'Vento 11km/h' },
        { id: 'status', label: 'Status', value: 'Estável', meta: '0 bloqueios' },
        { id: 'routes', label: 'Rotas', value: '18 ativas', meta: '3 alerta' }
      ],
      flowStats: [
        { id: 'prod', label: 'Produção', value: '312 u/h', hint: '+8% vs meta' },
        { id: 'sla', label: 'SLA', value: '96.4%', hint: '+2% hoje' },
        { id: 'teams', label: 'Equipes', value: '12 em rota', hint: '2 stand-by' },
        { id: 'backlog', label: 'Backlog', value: '47 ordens', hint: '-11 na hora' },
        { id: 'routes', label: 'Rotas', value: '18 ao vivo', hint: '3 alerta' }
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
      ]
    };
  }
};
</script>

<style scoped>
  .menu-hero { width: 100%; min-height: 100vh; padding: 0; background: transparent; position: relative; overflow: hidden; }
  .matrix { position: relative; z-index: 1; width: 100%; display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 24px; padding: clamp(24px, 4vw, 90px); }

  .hero-head { grid-column: 1 / -1; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-start; gap: 16px; }
  .hero-copy h1 { margin: 0; font-size: clamp(2.4rem, 5vw, 4rem); font-family: 'Space Grotesk', sans-serif; color: #fff; }
  .hero-copy p { margin: 0; }
  .eyebrow { letter-spacing: 0.35em; text-transform: uppercase; font-size: 0.68rem; color: rgba(255,255,255,0.6); }
  .subtext { color: rgba(226,232,240,0.8); font-size: 1rem; margin-top: 8px; }
  .hero-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .live-pill { border: none; border-radius: 999px; padding: 10px 20px; background: #22d3ee; color: #05121f; font-weight: 700; letter-spacing: 0.12em; display: inline-flex; align-items: center; gap: 8px; }
  .mini-cta { border: 1px solid rgba(255,255,255,0.25); border-radius: 999px; padding: 10px 16px; background: transparent; color: #fff; display: inline-flex; align-items: center; gap: 6px; cursor: pointer; }

  .info-belt { grid-column: 1 / -1; display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: clamp(12px, 1.5vw, 20px); }
  .info-card { padding: 18px; border-radius: 22px; border: 1px solid rgba(255,255,255,0.08); background: rgba(7,12,20,0.75); color: #fff; display: flex; flex-direction: column; gap: 4px; }
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
  .flow-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
  .flow-card { padding: 14px; border-radius: 18px; border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); display: flex; flex-direction: column; gap: 4px; }
  .flow-card p { margin: 0; text-transform: uppercase; letter-spacing: 0.16em; font-size: 0.6rem; color: rgba(255,255,255,0.55); }
  .flow-card strong { font-size: 1.3rem; }
  .flow-card small { color: rgba(255,255,255,0.6); }

  .tile-timeline { grid-column: span 6; }
  .timeline { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px; }
  .timeline li { display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center; padding: 12px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); }
  .timeline .time { font-weight: 600; }
  .timeline-copy p { margin: 0; font-weight: 600; font-size: 0.95rem; }
  .timeline-copy small { font-size: 0.75rem; letter-spacing: 0.18em; text-transform: uppercase; }
  .timeline-copy small.ok { color: #22c55e; }
  .timeline-copy small.warn { color: #fbbf24; }
  .timeline-copy small.late { color: #f87171; }
  .bare { border: none; background: transparent; color: #3ec6e0; cursor: pointer; }

  .tile-zones { grid-column: span 6; }
  .zones { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 10px; }
  .zones li { display: flex; justify-content: space-between; gap: 12px; padding: 12px; border-radius: 16px; border: 1px solid rgba(255,255,255,0.05); background: rgba(255,255,255,0.02); }
  .zones p { margin: 0; font-weight: 600; }
  .zones small { color: rgba(255,255,255,0.55); }
  .zone-meta { display: flex; align-items: center; gap: 10px; font-size: 0.85rem; color: rgba(226,232,240,0.85); }
  .zone-risk { padding: 4px 10px; border-radius: 999px; font-size: 0.7rem; letter-spacing: 0.12em; text-transform: uppercase; }
  .zone-risk.low { background: rgba(34,197,94,0.2); color: #22c55e; }
  .zone-risk.med { background: rgba(251,191,36,0.2); color: #fbbf24; }
  .zone-risk.high { background: rgba(248,113,113,0.2); color: #f87171; }

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
  .quick-pill { border: 1px solid rgba(255,255,255,0.12); border-radius: 18px; padding: 10px 16px; background: rgba(255,255,255,0.04); color: #fff; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; transition: transform 0.18s ease, border 0.18s ease; font-weight: 600; }
  .quick-pill:hover { transform: translateY(-2px); border-color: rgba(62,198,224,0.4); }

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
