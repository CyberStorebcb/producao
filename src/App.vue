// ...existing code...
<template>
  <TruckAnimation
    v-if="showWelcomeAnimation"
    :user-name="authUser || 'Usuário'"
    variant="welcome"
    @close="handleWelcomeClose"
  />
  <div class="d-flex min-vh-100">
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
              <p class="profile-kicker">Squad Atlas</p>
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
    <main :class="['flex-grow-1 app-main', { 'full-bleed-active': tab === 'menu' || tab === 'producao' }]">
      <button v-if="isAuthenticated" class="mobile-menu-btn btn btn-sm btn-light d-md-none" @click.prevent="toggleMobileSidebar" :aria-pressed="mobileSidebarOpen" aria-label="Abrir menu">
        <i :class="mobileSidebarOpen ? 'bi bi-x-lg' : 'bi bi-list'"></i>
      </button>
      <template v-if="!isAuthenticated">
        <Login @login="handleLogin" />
      </template>
      <template v-else>
        <MenuHero v-if="tab==='menu'" @select="setTab" />
        <ProducaoView v-else-if="tab==='producao'"/>
        <div v-else-if="tab==='programacao'">
          <Oportunidades />
        </div>
        <div v-else-if="tab==='apontamento'">
          <div class="dev-hero">
            <div class="dev-topbar"></div>
            <div class="dev-content text-center">
              <h1 class="display-4 fw-bold">EM DESENVOLVIMENTO</h1>
              <p class="lead mt-2">Área de Apontamento em desenvolvimento. Voltaremos em breve com funcionalidades completas.</p>
              <div class="pulse mt-4" aria-hidden="true"></div>
            </div>
          </div>
        </div>
        <EquipesPage v-else-if="tab==='equipes'"/>
      </template>
    </main>
  </div>
  <Teleport to="body">
    <div class="app-toasts" aria-live="polite">
      <div v-for="t in toasts" :key="t.id" :class="['toast-item', t.type]">
        {{ t.message }}
      </div>
    </div>
  </Teleport>
</template>

<script>
import MenuHero from './components/MenuHero.vue';
import ProducaoView from './components/ProducaoView.vue';
import EquipesPage from './components/EquipesPage.vue';
import Login from './components/Login.vue';
import TruckAnimation from './components/TruckAnimation.vue';
import Oportunidades from './components/Oportunidades.vue';

export default {
  name: 'App',
  components: { MenuHero, ProducaoView, EquipesPage, Login, TruckAnimation, Oportunidades },
  data() {
    return {
      tab: 'menu',
      theme: 'light',
      toasts: [],
      isAuthenticated: !!localStorage.getItem('auth_token'),
      authUser: localStorage.getItem('auth_user') || null,
      sidebarCollapsed: localStorage.getItem('sidebar_collapsed') === '1',
      mobileSidebarOpen: false,
      currentDateTime: new Date(),
      currentDateTimeTimer: null,
      showWelcomeAnimation: false,
      welcomeAnimationTimer: null,
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
      ]
    };
  },
  computed: {
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
  },
  mounted() {
    const saved = localStorage.getItem('theme');
    if (saved) this.theme = saved;
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) this.theme = 'dark';
    this.applyTheme();
    this.currentDateTimeTimer = setInterval(() => {
      this.currentDateTime = new Date();
    }, 1000 * 30);

    // setup global toast listener
    this._appToastHandler = (e) => {
      const { message, type } = e.detail || {};
      if (!message) return;
      this.toasts.push({ id: Date.now() + Math.random(), message, type: type || 'info' });
      setTimeout(() => { this.toasts.shift(); }, 3800);
    };
    window.addEventListener('app-toast', this._appToastHandler);
  },
  beforeUnmount() {
    window.removeEventListener('app-toast', this._appToastHandler);
    this.clearWelcomeAnimationTimer();
    if (this.currentDateTimeTimer) {
      clearInterval(this.currentDateTimeTimer);
      this.currentDateTimeTimer = null;
    }
  },
  methods: {
    setTab(tab) {
      this.tab = tab;
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
      localStorage.removeItem('auth_token');
      localStorage.removeItem('auth_user');
      this.isAuthenticated = false;
      this.authUser = null;
      this.tab = 'menu';
      this.showWelcomeAnimation = false;
      this.clearWelcomeAnimationTimer();
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Você saiu.', type: 'info' } }));
    },
    handleLogin(payload) {
      if (!payload || !payload.token) return;
      localStorage.setItem('auth_token', payload.token);
      localStorage.setItem('auth_user', payload.user || 'user');
      this.isAuthenticated = true;
      this.authUser = payload.user || 'user';
      this.tab = 'menu';
      this.clearWelcomeAnimationTimer();
      this.showWelcomeAnimation = true;
      this.welcomeAnimationTimer = setTimeout(() => {
        this.showWelcomeAnimation = false;
        this.welcomeAnimationTimer = null;
      }, 3000);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Login realizado.', type: 'success' } }));
    }
    ,
    handleWelcomeClose() {
      this.showWelcomeAnimation = false;
      this.clearWelcomeAnimationTimer();
    }
    ,
    clearWelcomeAnimationTimer() {
      if (this.welcomeAnimationTimer) {
        clearTimeout(this.welcomeAnimationTimer);
        this.welcomeAnimationTimer = null;
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

@media (max-width: 640px) {
  .sidebar {
    position: fixed !important;
    top: 0;
    left: 0;
    height: 100vh;
    width: min(86vw, 320px);
    transform: translateX(-110%);
    transition: transform 0.26s ease, opacity 0.26s ease;
    z-index: 30;
  }
  .sidebar.mobile-open {
    transform: translateX(0);
  }
  .app-main { padding: 18px; }
  .mobile-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    z-index: 25;
  }
  .mobile-menu-btn {
    position: fixed;
    left: 12px;
    top: 12px;
    z-index: 40;
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
  padding: clamp(18px, 3vw, 40px) !important;
}

.app-main.full-bleed-active {
  padding: 0 !important;
  max-width: none !important;
  margin: 0 !important;
  background: transparent !important;
  border-radius: 0 !important;
  box-shadow: none !important;
  min-height: 100vh;
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
</style>
