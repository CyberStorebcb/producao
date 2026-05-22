<template>
  <div v-if="appLoading" class="app-loading-screen">
    <div class="app-loading-card" role="status" aria-live="polite">
      <div class="app-loading-robot">
        <div class="robot-antenna"></div>
        <div class="robot-head">
          <span class="robot-eye robot-eye--left"></span>
          <span class="robot-eye robot-eye--right"></span>
          <span class="robot-mouth"></span>
        </div>
        <div class="robot-body"></div>
      </div>
      <div class="app-loading-copy">
        <strong>Robô Kaizen</strong>
        <span>Sincronizando dados em segundo plano</span>
      </div>
    </div>
  </div>
  <div class="d-flex min-vh-100 app-shell">
    <aside v-if="isAuthenticated" :class="['sidebar d-flex flex-column flex-shrink-0', { collapsed: sidebarCollapsed, 'mobile-open': mobileSidebarOpen }]">
      <div class="sidebar-panel">
        <div class="profile-card">
          <div class="profile-core">
            <div class="profile-avatar">
              <span class="profile-avatar__initials">{{ profileInitials }}</span>
              <span class="profile-status" aria-hidden="true"></span>
            </div>
            <div class="profile-text">
              <h2>{{ authUser || 'Usuário' }}</h2>
              <p class="profile-kicker">Squad Orion</p>
              <p class="profile-meta">{{ currentDateTimeLabel }} · {{ shiftSnapshot.health }}</p>
            </div>
          </div>
          <div class="profile-actions">
            <button type="button" class="ghost-btn" @click.prevent="toggleTheme" :title="theme === 'dark' ? 'Desativar modo escuro' : 'Ativar modo escuro'">
              <i :class="theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars'"></i>
            </button>
            <button type="button" class="ghost-btn" @click.prevent="toggleSidebar" :title="sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'">
              <i :class="sidebarCollapsed ? 'bi bi-arrows-angle-expand' : 'bi bi-arrows-angle-contract'"></i>
            </button>
          </div>
        </div>

        <div class="sidebar-scroll" role="navigation" aria-label="Menu primário">
          <div v-for="section in navSections" :key="section.title" class="nav-section">
            <div class="nav-section-heading">
              <p class="nav-section-label">{{ section.title }}</p>
              <span v-if="section.tag" class="nav-section-tag">{{ section.tag }}</span>
            </div>
            <div class="nav-chips">
              <button
                v-for="item in section.items"
                :key="item.id"
                type="button"
                class="nav-chip"
                :class="{ active: tab === (item.target || item.id) }"
                :aria-label="item.label"
                :title="item.label"
                @click.prevent="setTab(item.target || item.id)"
              >
                <i :class="['bi', item.icon]"></i>
                <div class="nav-chip-copy">
                  <span>{{ item.label }}</span>
                  <small>{{ item.meta }}</small>
                </div>
                <span v-if="item.badge" class="chip-badge">{{ item.badge }}</span>
              </button>
            </div>
          </div>
        </div>

        <div class="sidebar-radar mt-auto">
          <p class="radar-title">{{ radarCard.title }}</p>
          <p class="radar-desc">{{ radarCard.description }}</p>
          <p class="radar-trend">{{ radarCard.trend }}</p>
          <div class="radar-tags">
            <span v-for="tag in activityBadges" :key="tag.label" class="radar-chip">{{ tag.label }} · {{ tag.value }}</span>
          </div>
          <button type="button" class="radar-cta" @click.prevent="setTab('equipes')">
            <span>Monitorar equipes</span>
            <i class="bi bi-arrow-up-right" aria-hidden="true"></i>
          </button>
        </div>

        <button type="button" class="sidebar-logout" @click="logout">
          <i class="bi bi-box-arrow-right"></i>
          <span>Sair da conta</span>
        </button>
      </div>
    </aside>
    <div v-if="isAuthenticated && mobileSidebarOpen" class="mobile-backdrop" @click="closeMobileSidebar"></div>
    <main
      @click="handleMainClick"
      :class="[
        'flex-grow-1 app-main',
        {
          'full-bleed-active':
            tab === 'menu' ||
            tab === 'producao' ||
            tab === 'programacao' ||
            tab === 'obras-status' ||
            tab === 'kaizen' ||
            tab === 'desligamento',
        },
      ]"
    >
      <button v-if="isAuthenticated" class="mobile-menu-btn btn btn-sm btn-light d-md-none" @click.stop.prevent="toggleMobileSidebar" :aria-pressed="mobileSidebarOpen" aria-label="Abrir menu">
        <i :class="mobileSidebarOpen ? 'bi bi-x-lg' : 'bi bi-list'"></i>
      </button>
      <template v-if="!isAuthenticated">
        <Login @login="handleLogin" />
      </template>
      <template v-else>
        <KaizenPage ref="kaizenPage" v-if="mountedTabs.kaizen" v-show="tab==='kaizen'" />
        <DesligamentoAd v-if="mountedTabs.desligamento" v-show="tab==='desligamento'" />
        <ObrasStatus v-if="mountedTabs['obras-status']" v-show="tab==='obras-status'" />
        <ProducaoView v-if="mountedTabs.producao" v-show="tab==='producao'" />
        <MenuHero v-if="mountedTabs.menu" v-show="tab==='menu'" @select="setTab" />
        <Oportunidades v-if="mountedTabs.programacao" v-show="tab==='programacao'" />
        <div v-if="mountedTabs.apontamento" v-show="tab==='apontamento'" class="dev-hero">
          <div class="dev-topbar"></div>
          <div class="dev-content text-center">
            <h1 class="display-4 fw-bold">EM DESENVOLVIMENTO</h1>
            <p class="lead mt-2">Área de Apontamento em desenvolvimento. Voltaremos em breve com funcionalidades completas.</p>
            <div class="pulse mt-4" aria-hidden="true"></div>
          </div>
        </div>
        <EquipesPage v-if="mountedTabs.equipes" v-show="tab==='equipes'"/>
        <LigaDasBases v-if="mountedTabs['liga-bases']" v-show="tab==='liga-bases'" />
      </template>
    </main>
    <KaizenRobotMonitor v-if="isAuthenticated && tab === 'kaizen'" @sync-finished="handleKaizenSyncFinished" />
  </div>
  <Teleport to="body">
    <div class="app-toasts" aria-live="polite">
      <div v-for="t in toasts" :key="t.id" :class="['toast-item', t.type]">
        {{ t.message }}
      </div>
    </div>
  </Teleport>

  <!-- Badge do timer trial (canto superior direito) -->
  <Teleport to="body">
    <div v-if="isTrial && !trialExpired" class="trial-badge" aria-live="polite">
      <span class="trial-badge__icon">⏱</span>
      <span class="trial-badge__time">{{ trialMinutes }}:{{ trialSeconds }}</span>
      <span class="trial-badge__label">demo gratuito</span>
    </div>
  </Teleport>

  <!-- Tela de expiração do trial -->
  <Teleport to="body">
    <Transition name="trial-fade">
      <div v-if="trialExpired" class="trial-wall" role="dialog" aria-modal="true" aria-label="Período de demonstração encerrado">
        <div class="trial-wall__card">
          <div class="trial-wall__glow" aria-hidden="true"></div>

          <div class="trial-wall__icon">
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="28" cy="28" r="28" fill="url(#tg)" opacity=".15"/>
              <circle cx="28" cy="28" r="20" stroke="url(#tg)" stroke-width="2" fill="none"/>
              <path d="M28 18v10l6 4" stroke="#a78bfa" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
              <defs>
                <linearGradient id="tg" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
                  <stop stop-color="#6366f1"/><stop offset="1" stop-color="#a855f7"/>
                </linearGradient>
              </defs>
            </svg>
          </div>

          <h2 class="trial-wall__title">Período de demonstração encerrado</h2>
          <p class="trial-wall__desc">
            Seus 5 minutos de acesso gratuito foram utilizados.<br>
            Entre em contato para liberar o acesso completo ao sistema.
          </p>

          <div class="trial-wall__contacts">
            <a
              class="trial-contact trial-contact--whatsapp"
              href="https://wa.me/5599984491810?text=Ol%C3%A1%2C%20vi%20o%20portf%C3%B3lio%20e%20gostaria%20de%20saber%20mais%20sobre%20o%20sistema."
              target="_blank" rel="noopener noreferrer"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              <span>WhatsApp</span>
              <small>+55 99 9 8449-1810</small>
            </a>

            <a
              class="trial-contact trial-contact--instagram"
              href="https://www.instagram.com/italofontes__"
              target="_blank" rel="noopener noreferrer"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg>
              <span>Instagram</span>
              <small>@italofontes__</small>
            </a>

            <a
              class="trial-contact trial-contact--email"
              href="mailto:italo.fontes2026@gmail.com?subject=Interesse%20no%20sistema%20de%20gest%C3%A3o"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 7L2 7"/></svg>
              <span>E-mail</span>
              <small>italo.fontes2026@gmail.com</small>
            </a>
          </div>

          <p class="trial-wall__footer">
            Desenvolvido por <strong>Ítalo Fontes</strong> · Sistema de gestão operacional
          </p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
import { defineAsyncComponent } from 'vue';

// Loaded immediately — shown before/during auth
import MenuHero from './components/MenuHero.vue';
import Login from './components/Login.vue';
import AsyncViewFallback from './components/AsyncViewFallback.vue';
import AsyncViewError from './components/AsyncViewError.vue';

/** Evita tela “preta” enquanto o chunk da rota baixa (code-splitting). */
function createAsyncPage(loader) {
  return defineAsyncComponent({
    loader,
    loadingComponent: AsyncViewFallback,
    errorComponent: AsyncViewError,
    delay: 120,
    timeout: 120000,
  });
}

// Loaded on-demand — only when the user navigates to each tab
const ProducaoView = createAsyncPage(() => import('./components/ProducaoView.vue'));
const EquipesPage = createAsyncPage(() => import('./components/EquipesPage.vue'));
const KaizenPage = createAsyncPage(() => import('./components/KaizenPage.vue'));
const DesligamentoAd = createAsyncPage(() => import('./components/DesligamentoAd.vue'));
const ObrasStatus = createAsyncPage(() => import('./components/ObrasStatus.vue'));
const KaizenRobotMonitor = createAsyncPage(() => import('./components/KaizenRobotMonitor.vue'));
const Oportunidades = createAsyncPage(() => import('./components/Oportunidades.vue'));
const LigaDasBases = createAsyncPage(() => import('./components/LigaDasBases.vue'));

export default {
  name: 'App',
  components: { MenuHero, ProducaoView, EquipesPage, KaizenPage, DesligamentoAd, ObrasStatus, KaizenRobotMonitor, Login, Oportunidades, LigaDasBases },
  data() {
    return {
      tab: 'menu',
      theme: 'light',
      toasts: [],
      mountedTabs: { menu: true },
      isAuthenticated: !!localStorage.getItem('auth_token'),
      authUser: localStorage.getItem('auth_user') || null,
      sidebarCollapsed: localStorage.getItem('sidebar_collapsed') !== '0',
      mobileSidebarOpen: false,
      currentDateTime: new Date(),
      currentDateTimeTimer: null,

      shiftSnapshot: {
        window: 'Turno 02 · 00h - 08h',
        health: 'Operacional estável'
      },
      navSections: [
        {
          title: 'Visão geral',
          tag: 'ao vivo',
          items: [
            { id: 'menu', label: 'Lobby', meta: 'Atalhos principais', icon: 'bi-house-door', badge: 'Home' }
          ]
        },
        {
          title: 'Operações',
          items: [
            { id: 'producao', label: 'Produção', meta: 'Linha em tempo real', icon: 'bi-gear', badge: 'Live' },
            { id: 'programacao', label: 'OPORTUNIDADES', meta: 'Cronogramas e slots', icon: 'bi-kanban' },
            { id: 'obras-status', label: 'Obras - Status', meta: 'Status de obras', icon: 'bi-building' },
            { id: 'kaizen', label: 'Kaizen', meta: 'Melhoria contínua', icon: 'bi-bar-chart-line-fill' },
            { id: 'desligamento', label: 'Desligamento - AD', meta: 'Gestão de desligamentos', icon: 'bi-power' },
            { id: 'liga-bases', label: 'Liga das bases', meta: 'Ranking e performance', icon: 'bi-trophy' },
            { id: 'equipes', label: 'Equipes', meta: 'Times e escalas', icon: 'bi-people', badge: '12' }
          ]
        }
      ],
      radarCard: {
        title: 'Radar operacional',
        description: '3 alertas aguardando revisão e 12 escalas ativas.',
        trend: '+8% produtividade nas últimas 4h'
      },
      activityBadges: [
        { label: 'Alertas', value: '03' },
        { label: 'Escalas', value: '12' },
        { label: 'Rotas', value: '04' }
      ],
      appLoadingCount: 0,

      // ── Trial mode ──────────────────────────────────────────────────
      isTrial: false,
      trialExpired: false,
      trialSecondsLeft: 300,
      _trialInterval: null,
    };
  },
  computed: {
    trialMinutes() { return String(Math.floor(this.trialSecondsLeft / 60)).padStart(2, '0'); },
    trialSeconds() { return String(this.trialSecondsLeft % 60).padStart(2, '0'); },
    profileInitials() {
      const source = String(this.authUser || 'Usuário').trim();
      if (!source) return 'U';
      const parts = source.split(/\s+/).filter(Boolean);
      return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || 'U';
    },
    currentDateTimeLabel() {
      return new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      }).format(this.currentDateTime);
    },
    appLoading() {
      return this.appLoadingCount > 0;
    },
  },
  mounted() {
    const saved = localStorage.getItem('theme');
    if (saved) this.theme = saved;
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) this.theme = 'dark';
    this.applyTheme();

    const savedTab = localStorage.getItem('app_tab');
    const allowedTabs = ['menu', 'producao', 'kaizen', 'programacao', 'obras-status', 'desligamento', 'liga-bases', 'apontamento', 'equipes'];
    if (savedTab && allowedTabs.includes(savedTab) && this.isAuthenticated) {
      this.tab = savedTab;
      this.mountedTabs[savedTab] = true;
    }

    this.currentDateTimeTimer = setInterval(() => {
      this.currentDateTime = new Date();
    }, 1000 * 30);

    this._appLoadingStartHandler = () => {
      this.appLoadingCount += 1;
    };

    this._appLoadingEndHandler = () => {
      this.appLoadingCount = Math.max(0, this.appLoadingCount - 1);
    };

    window.addEventListener('app-loading-start', this._appLoadingStartHandler);
    window.addEventListener('app-loading-end', this._appLoadingEndHandler);

    // setup global toast listener
    this._appToastHandler = (e) => {
      const { message, type } = e.detail || {};
      if (!message) return;
      this.toasts.push({ id: Date.now() + Math.random(), message, type: type || 'info' });
      setTimeout(() => { this.toasts.shift(); }, 3800);
    };
    window.addEventListener('app-toast', this._appToastHandler);

    // setup click outside handler to close/collapse sidebar
    this._handleClickOutside = (e) => {
      if (!this.isAuthenticated) return;
      const sidebar = this.$el.querySelector('aside');
      if (!sidebar || sidebar.contains(e.target)) return;
      const menuBtn = this.$el.querySelector('.mobile-menu-btn');
      if (menuBtn && menuBtn.contains(e.target)) return;
      if (this.mobileSidebarOpen) {
        this.closeMobileSidebar();
      } else if (!this.sidebarCollapsed) {
        this.sidebarCollapsed = true;
        localStorage.setItem('sidebar_collapsed', '1');
      }
    };
    document.addEventListener('click', this._handleClickOutside, true);
  },
  beforeUnmount() {
    this.stopTrialTimer();
    window.removeEventListener('app-toast', this._appToastHandler);
    document.removeEventListener('click', this._handleClickOutside, true);
    if (this._appLoadingStartHandler) {
      window.removeEventListener('app-loading-start', this._appLoadingStartHandler);
      this._appLoadingStartHandler = null;
    }
    if (this._appLoadingEndHandler) {
      window.removeEventListener('app-loading-end', this._appLoadingEndHandler);
      this._appLoadingEndHandler = null;
    }
    if (this.currentDateTimeTimer) {
      clearInterval(this.currentDateTimeTimer);
      this.currentDateTimeTimer = null;
    }
  },
  methods: {
    setTab(tab) {
      this.mountedTabs[tab] = true;
      this.tab = tab;
      try {
        localStorage.setItem('app_tab', tab);
      } catch (error) {
        console.warn('Falha ao persistir aba atual', error);
      }
    },
    handleMainClick() {
      if (this.mobileSidebarOpen) {
        this.closeMobileSidebar();
      } else if (!this.sidebarCollapsed) {
        this.sidebarCollapsed = true;
        localStorage.setItem('sidebar_collapsed', '1');
      }
    },
    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
      localStorage.setItem('theme', this.theme);
      this.applyTheme();
    },
    applyTheme() {
      if (this.theme === 'dark') document.documentElement.classList.add('dark-theme');
      else document.documentElement.classList.remove('dark-theme');
    },
    logout() {
      this.stopTrialTimer();
      this.isTrial = false;
      this.trialExpired = false;
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      this.isAuthenticated = false;
      this.authUser = null;
      this.tab = 'menu';
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Você saiu.', type: 'info' } }));
    },
    handleLogin(payload) {
      // Trial expirado — só mostra tela de contato sem logar
      if (payload?.trialExpired) {
        this.trialExpired = true;
        return;
      }
      if (!payload || !payload.token) return;
      localStorage.setItem('auth_token', payload.token);
      localStorage.setItem('auth_user', payload.user || 'user');
      this.isAuthenticated = true;
      this.authUser = payload.user || 'user';
      this.isTrial = !!payload.isTrial;
      const savedTab = localStorage.getItem('app_tab');
      const allowedTabs = ['menu', 'producao', 'kaizen', 'programacao', 'obras-status', 'desligamento', 'liga-bases', 'apontamento', 'equipes'];
      this.tab = savedTab && allowedTabs.includes(savedTab) ? savedTab : 'menu';
      this.mountedTabs[this.tab] = true;
      if (this.isTrial) {
        this.startTrialTimer();
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: '⏱ Modo demo — 5 minutos de acesso gratuito', type: 'info' } }));
      } else {
        window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Login realizado.', type: 'success' } }));
      }
    },
    startTrialTimer() {
      const TRIAL_DURATION_MS = 5 * 60 * 1000;
      const TRIAL_STORAGE_KEY = 'demo_trial_start';
      const raw = `${navigator.userAgent}|${screen.width}x${screen.height}|${navigator.language}`;
      let hash = 0;
      for (let i = 0; i < raw.length; i++) { hash = ((hash << 5) - hash) + raw.charCodeAt(i); hash |= 0; }
      const fpKey = `${TRIAL_STORAGE_KEY}_fp_${Math.abs(hash)}`;
      const startTime = parseInt(localStorage.getItem(fpKey) || String(Date.now()), 10);

      const tick = () => {
        const remaining = Math.max(0, TRIAL_DURATION_MS - (Date.now() - startTime));
        this.trialSecondsLeft = Math.ceil(remaining / 1000);
        if (remaining <= 0) {
          clearInterval(this._trialInterval);
          this._trialInterval = null;
          this.trialExpired = true;
          this.isAuthenticated = false;
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        }
      };
      tick();
      this._trialInterval = setInterval(tick, 1000);
    },
    stopTrialTimer() {
      if (this._trialInterval) { clearInterval(this._trialInterval); this._trialInterval = null; }
    }
    ,
    handleKaizenSyncFinished() {
      const kaizen = this.$refs.kaizenPage;
      if (kaizen && typeof kaizen.loadHistory === 'function') {
        kaizen.loadHistory({ preserveMessages: true });
        if (typeof kaizen.loadStartCharts === 'function') {
          kaizen.loadStartCharts();
        }
      }
    }
    ,
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
      localStorage.setItem('sidebar_collapsed', this.sidebarCollapsed ? '1' : '0');
    }
    ,
    toggleMobileSidebar() {
      this.mobileSidebarOpen = !this.mobileSidebarOpen;
      if (this.mobileSidebarOpen) document.documentElement.style.overflow = 'hidden';
      else document.documentElement.style.overflow = '';
    },
    closeMobileSidebar() {
      this.mobileSidebarOpen = false;
      document.documentElement.style.overflow = '';
    }
  }
};
</script>

<style scoped>
.app-shell {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  /* Evitar overflow-x: clip/hidden aqui: com overflow-y: visible o eixo Y vira "auto" e duplica a barra com o documento. */
  overflow: visible;
}

.sidebar {
  width: clamp(240px, 22vw, 300px);
  min-height: 100vh;
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border-soft);
  box-shadow: var(--shadow-strong);
  transition: width 0.25s ease;
  position: relative;
  overflow: hidden;
  z-index: 12;
}

.sidebar-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  padding: clamp(18px, 2vw, 24px);
  gap: clamp(14px, 2vw, 22px);
  background: var(--sidebar-bg);
  backdrop-filter: blur(8px);
}

.profile-card {
  width: 100%;
  padding: 16px;
  border-radius: 20px;
  background:
    radial-gradient(circle at top right, rgba(34, 211, 238, 0.12), transparent 34%),
    linear-gradient(180deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01)),
    var(--surface-overlay);
  border: 1px solid rgba(255,255,255,0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  box-shadow: 0 12px 24px rgba(2, 6, 23, 0.18);
}

.profile-core {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1 1 auto;
  min-width: 0;
}

.profile-avatar {
  width: 54px;
  height: 54px;
  border-radius: 16px;
  position: relative;
  box-shadow: 0 10px 18px rgba(1,4,9,0.24);
  display: grid;
  place-items: center;
  background: linear-gradient(145deg, #56d4f0, #2ea7cf);
  border: 1px solid rgba(255,255,255,0.18);
  flex: 0 0 auto;
}

.profile-avatar__initials {
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.05em;
  color: #f8fafc;
}

.profile-status {
  position: absolute;
  bottom: 6px;
  right: 6px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #30f2a3;
  box-shadow: 0 0 10px rgba(48,242,163,0.8);
}

.profile-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.profile-kicker {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.62rem;
  color: var(--muted);
  margin: 0;
  order: -1;
}

.profile-text h2 {
  font-size: 1.05rem;
  margin: 0;
  font-family: 'Space Grotesk', sans-serif;
  color: var(--text);
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.profile-meta {
  margin: 0;
  font-size: 0.8rem;
  color: var(--text-soft);
  line-height: 1.35;
}

.profile-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
}

.ghost-btn {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(255,255,255,0.03);
  color: var(--text);
  font-size: 0.95rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.15s ease, border 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
}

.ghost-btn:hover {
  transform: translateY(-2px);
  border-color: rgba(62,198,224,0.45);
  background: rgba(255,255,255,0.06);
  box-shadow: 0 10px 18px rgba(2, 6, 23, 0.2);
}

.sidebar-scroll {
  flex: 1;
  width: 100%;
  overflow-y: auto;
  padding-right: 6px;
  padding-bottom: 10px;
}

.nav-section {
  margin-bottom: 20px;
}

.nav-section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.nav-section-label {
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
  margin: 0;
}

.nav-section-tag {
  font-size: 0.7rem;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(37,99,235,0.12);
  color: var(--primary-1);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.nav-chips {
  display: flex;
  flex-direction: column;
  gap: clamp(8px, 1.5vw, 12px);
}

.nav-chip {
  width: 100%;
  border-radius: 16px;
  border: 1px solid var(--border-soft);
  background: var(--surface-1);
  padding: 14px clamp(12px, 2vw, 18px);
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--text);
  cursor: pointer;
  transition: transform 0.18s ease, border 0.18s ease, background 0.18s ease;
  position: relative;
  min-height: 60px;
}

.nav-chip i {
  font-size: 1.05rem;
  color: var(--text-soft);
}

.sidebar.collapsed .nav-chip i {
  margin: 0;
}

.nav-chip-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}

.nav-chip-copy span {
  font-weight: 600;
  font-size: 0.95rem;
}

.nav-chip-copy small {
  font-size: 0.78rem;
  color: var(--muted);
}

.chip-badge {
  margin-left: auto;
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(37,99,235,0.12);
  color: var(--primary-1);
  white-space: nowrap;
}

.nav-chip.active {
  border-color: rgba(37,99,235,0.45);
  background: linear-gradient(120deg, rgba(37,99,235,0.14), rgba(6,182,212,0.14));
  box-shadow: var(--shadow-soft);
}

:global(html:not(.dark-theme)) .nav-chip.active {
  border-color: rgba(37,99,235,0.55);
  background: linear-gradient(120deg, rgba(219,234,254,0.98), rgba(224,242,254,0.96));
}

:global(html:not(.dark-theme)) .nav-chip.active i,
:global(html:not(.dark-theme)) .nav-chip.active .nav-chip-copy span {
  color: #0f172a;
}

:global(html:not(.dark-theme)) .nav-chip.active .nav-chip-copy small {
  color: #475569;
}

:global(html:not(.dark-theme)) .nav-chip.active .chip-badge {
  background: rgba(37,99,235,0.18);
  color: #1d4ed8;
}

.nav-chip:hover {
  transform: translateX(4px);
  border-color: var(--border-strong);
}

.sidebar-radar {
  width: 100%;
  border-radius: 22px;
  padding: clamp(16px, 2vw, 20px);
  border: 1px solid var(--border-soft);
  background: radial-gradient(circle at top left, rgba(37,99,235,0.16), transparent 36%), var(--surface-1);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radar-title {
  text-transform: uppercase;
  letter-spacing: 0.16em;
  font-size: 0.7rem;
  color: var(--muted);
  margin: 0;
}

.radar-desc {
  margin: 0;
  font-size: 0.95rem;
  color: var(--text);
}

.radar-trend {
  margin: 0;
  font-size: 0.85rem;
  color: #30f2a3;
}

.radar-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.radar-chip {
  font-size: 0.75rem;
  padding: 4px 10px;
  border-radius: 12px;
  background: rgba(37,99,235,0.08);
  color: var(--text-soft);
}

.radar-cta {
  margin-top: 6px;
  border: none;
  border-radius: 14px;
  padding: 12px 16px;
  background: linear-gradient(90deg,var(--primary-1),var(--primary-2));
  color: var(--primary-contrast);
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.radar-cta:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 32px rgba(0,91,234,0.35);
}

.sidebar-logout {
  width: 100%;
  margin-top: auto;
  border: 1px solid var(--border-soft);
  background: transparent;
  color: var(--text);
  border-radius: 16px;
  padding: 12px 16px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: border 0.15s ease, background 0.15s ease;
}

.sidebar-logout:hover {
  background: var(--surface-1);
  border-color: var(--border-strong);
}

.sidebar.collapsed {
  width: 84px !important;
}
/* allow tooltip overflow when collapsed */
.sidebar.collapsed { overflow: visible; }

.sidebar.collapsed .sidebar-panel {
  padding: 20px 10px;
}

.sidebar.collapsed .profile-text,
.sidebar.collapsed .nav-section-label,
.sidebar.collapsed .nav-section-tag,
.sidebar.collapsed .nav-chip-copy,
.sidebar.collapsed .radar-desc,
.sidebar.collapsed .radar-trend,
.sidebar.collapsed .radar-tags,
.sidebar.collapsed .radar-cta span,
.sidebar.collapsed .sidebar-logout span {
  display: none;
}

.sidebar.collapsed .nav-chip-copy,
.sidebar.collapsed .chip-badge {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

.sidebar.collapsed .nav-chip:hover .nav-chip-copy,
.sidebar.collapsed .nav-chip:hover .chip-badge {
  width: auto !important;
  height: auto !important;
  overflow: visible !important;
  clip: auto !important;
  clip-path: none !important;
}

.sidebar.collapsed .nav-chip .nav-chip-copy span,
.sidebar.collapsed .nav-chip .nav-chip-copy small,
.sidebar.collapsed .chip-badge {
  opacity: 0;
}

.sidebar.collapsed .sidebar-radar {
  align-items: center;
  text-align: center;
}

.sidebar.collapsed .profile-card {
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px 10px;
}

.sidebar.collapsed .profile-avatar {
  width: 48px;
  height: 48px;
  border-radius: 16px;
  margin: 0 auto;
}

.sidebar.collapsed .profile-avatar img {
  border-radius: 16px;
}

.sidebar.collapsed .ghost-btn {
  width: 36px;
  height: 36px;
  border-radius: 12px;
}

.sidebar.collapsed .profile-actions {
  width: 100%;
  justify-content: center;
  gap: 8px;
}

.sidebar.collapsed .nav-chip {
  justify-content: center;
  padding: 10px;
  min-height: 52px;
  border-radius: 14px;
  gap: 0;
  overflow: visible;
}

.sidebar.collapsed .nav-section {
  margin-bottom: 14px;
}

/* Tooltip-like label when sidebar is collapsed */
.sidebar.collapsed .nav-chip:hover {
  z-index: 1000;
}
.sidebar.collapsed .nav-chip:hover .nav-chip-copy {
  display: flex !important;
  position: absolute;
  left: calc(100% + 12px);
  top: 50%;
  transform: translateY(-50%) scale(0.96);
  min-width: 160px;
  max-width: 280px;
  padding: 12px 14px;
  border-radius: 20px;
  background: rgba(8, 15, 30, 0.92);
  border: 1px solid rgba(255,255,255,0.08);
  backdrop-filter: blur(18px);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.28);
  color: #f8fafc;
  white-space: nowrap;
  transition: transform 0.2s ease, opacity 0.2s ease, box-shadow 0.2s ease;
  opacity: 0;
}
.sidebar.collapsed .nav-chip:hover .nav-chip-copy span,
.sidebar.collapsed .nav-chip:hover .nav-chip-copy small {
  opacity: 1 !important;
}
.sidebar.collapsed .nav-chip:hover .nav-chip-copy {
  transform: translateY(-50%) scale(1);
  opacity: 1;
}
.sidebar.collapsed .nav-chip:hover .nav-chip-copy span {
  font-size: 0.95rem;
}
.sidebar.collapsed .nav-chip:hover .nav-chip-copy small {
  font-size: 0.76rem;
  color: rgba(255,255,255,0.72);
  display: block !important;
}
.sidebar.collapsed .nav-chip:hover .chip-badge {
  display: inline-block !important;
  position: absolute;
  right: -8px;
  top: -8px;
}

.sidebar.collapsed .radar-cta {
  padding: 10px;
  justify-content: center;
}

.sidebar.collapsed .sidebar-logout {
  padding: 12px;
}

@media (max-width: 900px) {
  .sidebar {
    width: clamp(210px, 30vw, 240px);
  }
}

@media (max-width: 767.98px) {
  .sidebar {
    position: fixed !important;
    top: 0;
    left: 0;
    height: 100vh;
    width: min(86vw, 320px);
    transform: translateX(-110%);
    transition: transform 0.26s ease, opacity 0.26s ease;
    z-index: 100;
  }
  .sidebar.mobile-open {
    transform: translateX(0);
  }
  .app-main:not(.full-bleed-active) {
    padding: 18px;
  }
  .mobile-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    z-index: 90;
  }
  .mobile-menu-btn {
    position: fixed;
    left: 12px;
    top: 12px;
    z-index: 110;
  }
  .sidebar.collapsed {
    width: 72px !important;
  }
}

@media (max-width: 480px) {
  .profile-card {
    flex-direction: column;
    align-items: flex-start;
  }
  .profile-core {
    width: 100%;
    align-items: center;
  }
  .profile-actions {
    width: 100%;
    justify-content: flex-start;
  }
  .nav-chip {
    min-height: 56px;
  }
}

/* Main spacing */
.app-main {
  min-width: 0;
  min-height: 0;
  flex: 1 1 auto;
  width: 100%;
  max-width: 100%;
  overflow: visible;
  padding: clamp(18px, 3vw, 40px) !important;
  display: flex;
  flex-direction: column;
}

.app-main.full-bleed-active {
  padding: 0 !important;
  border: 0 !important;
  max-width: none !important;
  margin: 0 !important;
  background: transparent !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  /* Mantém min-height: 0 do .app-main para o flex não criar área rolável interna duplicada; páginas usam min-height próprio. */
  min-height: 0;
  flex: 1 1 auto;
}

/* Toasts */
.app-toasts {
  position: fixed;
  right: 18px;
  bottom: 18px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

.toast-item {
  background: var(--surface-2);
  color: var(--text);
  padding: 10px 14px;
  border-radius: 10px;
  box-shadow: var(--shadow-soft);
  min-width: 180px;
  max-width: 320px;
}

.toast-item.success { background: linear-gradient(90deg,#28a745,#198754); }
.toast-item.error { background: linear-gradient(90deg,#dc3545,#b02a37); }
.toast-item.info { background: linear-gradient(90deg,#0d6efd,#3b82f6); }

/* Dev banner styles reused across simple pages */
.dev-hero {
  max-width: 980px;
  margin: 40px auto;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--shadow-strong);
}

.dev-topbar {
  height: 8px;
  background: linear-gradient(90deg,var(--primary-1),var(--primary-2));
  position: relative;
}

.dev-topbar::after {
  content: '';
  position: absolute;
  left: -40%;
  top: 0;
  width: 40%;
  height: 100%;
  background: linear-gradient(90deg, rgba(255,255,255,0.15), rgba(255,255,255,0.02));
  transform: skewX(-18deg);
  animation: sweep 2.2s linear infinite;
  opacity: 0.6;
}

@keyframes sweep {
  0% { left: -40%; }
  100% { left: 140%; }
}

.dev-content {
  padding: 44px 28px;
  background: var(--surface-2);
  color: var(--text);
}

.pulse {
  width: 80px;
  height: 8px;
  margin: 0 auto;
  border-radius: 8px;
  background: linear-gradient(90deg, rgba(62,198,224,0.9), rgba(6,78,209,0.9));
  box-shadow: 0 8px 20px rgba(6,78,209,0.12);
  animation: pulse 1.6s ease-in-out infinite;
}

@keyframes pulse {
  0% { transform: scaleX(0.92); opacity: 0.9; }
  50% { transform: scaleX(1.06); opacity: 1; }
  100% { transform: scaleX(0.92); opacity: 0.9; }
}

.app-loading-screen {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 99999;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.app-loading-card {
  min-width: 220px;
  max-width: 250px;
  border-radius: 20px;
  padding: 12px 14px;
  background: rgba(8, 18, 36, 0.82);
  border: 1px solid rgba(96, 165, 250, 0.18);
  box-shadow: 0 20px 42px rgba(5, 12, 28, 0.28);
  backdrop-filter: blur(12px);
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 12px;
  align-items: center;
  color: #eff6ff;
  animation: badge-glow 2.8s ease-in-out infinite;
}

.app-loading-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: left;
}

.app-loading-copy strong {
  font-size: 0.95rem;
}

.app-loading-copy span {
  font-size: 0.78rem;
  line-height: 1.35;
  color: rgba(239, 246, 255, 0.78);
}

.app-loading-robot {
  width: 86px;
  height: 86px;
  position: relative;
  display: grid;
  place-items: center;
}

.robot-antenna {
  position: absolute;
  top: -16px;
  width: 8px;
  height: 28px;
  border-radius: 999px;
  background: linear-gradient(180deg, #7dd3fc, #0f172a);
  box-shadow: 0 0 18px rgba(59, 130, 246, 0.7);
  animation: antenna-bounce 2.4s ease-in-out infinite;
}

.robot-head {
  width: 72px;
  height: 58px;
  border-radius: 22px 22px 18px 18px;
  background: linear-gradient(180deg, #111827, #0b1120);
  border: 1px solid rgba(255,255,255,0.12);
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 12px 10px 8px;
  box-shadow: inset 0 0 18px rgba(255,255,255,0.06);
}

.robot-eye {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #c7d2fe;
  box-shadow: 0 0 10px rgba(147, 197, 253, 0.85);
  align-self: flex-start;
  animation: robot-blink 4.4s infinite ease-in-out;
}

.robot-eye--left {
  justify-self: start;
}

.robot-eye--right {
  justify-self: end;
}

.robot-mouth {
  grid-column: 1 / -1;
  width: 34px;
  height: 8px;
  border-radius: 999px;
  background: radial-gradient(circle at 30% 30%, #38bdf8, #0ea5e9);
  margin: 0 auto;
  animation: robot-mouth 1.4s ease-in-out infinite;
}

.robot-body {
  width: 72px;
  height: 24px;
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.96), rgba(23, 33, 54, 0.96));
  border: 1px solid rgba(255,255,255,0.08);
  box-shadow: inset 0 0 16px rgba(96, 165, 250, 0.18);
  position: relative;
}

.robot-body::before {
  content: '';
  position: absolute;
  left: 16px;
  top: 6px;
  width: 12px;
  height: 8px;
  border-radius: 8px;
  background: rgba(96, 165, 250, 0.72);
  box-shadow: 0 0 14px rgba(56, 189, 248, 0.55);
}

@keyframes antenna-bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-2px); }
}

@keyframes robot-mouth {
  0%, 100% { transform: scaleX(1); }
  50% { transform: scaleX(0.92); }
}

@keyframes robot-blink {
  0%, 6%, 14%, 100% { transform: scaleY(1); }
  8%, 12% { transform: scaleY(0.2); }
}

@keyframes badge-glow {
  0%, 100% { box-shadow: 0 20px 42px rgba(5, 12, 28, 0.28); }
  50% { box-shadow: 0 24px 56px rgba(56, 189, 248, 0.24); }
}

@keyframes robot-mouth {
  0%, 100% { transform: scaleX(1); }
  50% { transform: scaleX(0.85); }
}

/* ── Trial badge ─────────────────────────────────────────────────────── */
.trial-badge {
  position: fixed;
  top: 14px;
  right: 14px;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px 6px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.92);
  border: 1px solid rgba(99, 102, 241, 0.5);
  backdrop-filter: blur(12px);
  box-shadow: 0 4px 20px rgba(99, 102, 241, 0.25);
  font-family: 'Space Grotesk', 'Inter', system-ui, sans-serif;
  color: #e2e8f0;
  pointer-events: none;
  animation: trial-badge-in 0.4s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes trial-badge-in {
  from { opacity: 0; transform: translateY(-8px) scale(0.92); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.trial-badge__icon { font-size: 14px; }
.trial-badge__time {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.03em;
  color: #a78bfa;
  font-variant-numeric: tabular-nums;
}
.trial-badge__label {
  font-size: 11px;
  color: rgba(226, 232, 240, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

/* ── Trial wall (tela de expiração) ─────────────────────────────────── */
.trial-fade-enter-active { transition: opacity 0.5s ease, transform 0.5s cubic-bezier(0.16,1,0.3,1); }
.trial-fade-enter-from   { opacity: 0; transform: scale(1.04); }

.trial-wall {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: radial-gradient(ellipse at 50% 40%, #0f172a 0%, #030712 100%);
  overflow: auto;
}
.trial-wall__card {
  position: relative;
  width: 100%;
  max-width: 480px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(99, 102, 241, 0.3);
  border-radius: 24px;
  padding: 48px 40px 40px;
  text-align: center;
  backdrop-filter: blur(24px);
  box-shadow: 0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.1);
  font-family: 'Space Grotesk', 'Inter', system-ui, sans-serif;
  color: #f1f5f9;
  overflow: hidden;
}
.trial-wall__glow {
  position: absolute;
  top: -80px; left: 50%;
  transform: translateX(-50%);
  width: 320px; height: 200px;
  background: radial-gradient(ellipse, rgba(99,102,241,0.25) 0%, transparent 70%);
  pointer-events: none;
}
.trial-wall__icon {
  margin: 0 auto 24px;
  width: 64px; height: 64px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(99,102,241,0.1);
  border-radius: 50%;
  border: 1px solid rgba(99,102,241,0.2);
}
.trial-wall__title {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 12px;
  color: #f8fafc;
  letter-spacing: -0.01em;
}
.trial-wall__desc {
  font-size: 14px;
  color: rgba(241,245,249,0.6);
  line-height: 1.7;
  margin: 0 0 36px;
}
.trial-wall__contacts {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 32px;
}
.trial-contact {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  border-radius: 14px;
  text-decoration: none;
  border: 1px solid transparent;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  text-align: left;
}
.trial-contact:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); }
.trial-contact svg { flex-shrink: 0; }
.trial-contact span { font-size: 14px; font-weight: 600; flex: 1; }
.trial-contact small { font-size: 11px; opacity: 0.65; }

.trial-contact--whatsapp {
  background: rgba(37, 211, 102, 0.08);
  border-color: rgba(37, 211, 102, 0.25);
  color: #4ade80;
}
.trial-contact--whatsapp:hover { background: rgba(37, 211, 102, 0.14); }

.trial-contact--instagram {
  background: rgba(225, 48, 108, 0.08);
  border-color: rgba(225, 48, 108, 0.25);
  color: #f472b6;
}
.trial-contact--instagram:hover { background: rgba(225, 48, 108, 0.14); }

.trial-contact--email {
  background: rgba(99, 102, 241, 0.08);
  border-color: rgba(99, 102, 241, 0.25);
  color: #818cf8;
}
.trial-contact--email:hover { background: rgba(99, 102, 241, 0.14); }

.trial-wall__footer {
  font-size: 12px;
  color: rgba(241, 245, 249, 0.3);
  margin: 0;
}
.trial-wall__footer strong { color: rgba(241,245,249,0.5); }
</style>
