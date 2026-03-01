// ...existing code...
<template>
  <div class="d-flex min-vh-100">
    <aside v-if="isAuthenticated" :class="['sidebar d-flex flex-column flex-shrink-0 p-3 text-white align-items-center', { collapsed: sidebarCollapsed, 'mobile-open': mobileSidebarOpen }]" style="width: 260px;">
        <div class="sidebar-header d-flex flex-column align-items-center mb-4">
          <img src="https://ui-avatars.com/api/?name=User&background=3ec6e0&color=fff&size=80" class="rounded-circle mb-2 shadow avatar-img" alt="Avatar" width="72" height="72">
          <div class="d-flex align-items-center gap-2">
            <span class="fw-bold fs-5 sidebar-logo mb-1">Olá, {{ authUser || 'Usuário' }}!</span>
            <div class="d-flex gap-1">
              <button class="btn btn-sm btn-light" @click.prevent="toggleSidebar" :title="sidebarCollapsed ? 'Expandir menu' : 'Recolher menu'">
                <i :class="sidebarCollapsed ? 'bi bi-list' : 'bi bi-layout-sidebar-reverse'"></i>
              </button>
              <button class="btn btn-sm btn-light ms-1" @click.prevent="toggleTheme" :title="theme === 'dark' ? 'Desativar modo escuro' : 'Ativar modo escuro'">
                <i :class="theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-fill'"></i>
              </button>
            </div>
          </div>
          <a href="#" class="sidebar-menu-link text-white text-decoration-none" @click.prevent="setTab('menu')">
            <i class="bi bi-house-door me-2"></i> <span class="link-label">Menu</span>
          </a>
        </div>
      <hr class="bg-light w-100">
      <ul class="nav nav-pills flex-column mb-auto gap-2 w-100">
        <li class="nav-item">
          <a href="#" class="nav-link sidebar-link text-white" :class="{active: tab==='producao'}" @click.prevent="setTab('producao')">
            <i class="bi bi-gear me-2"></i> <span class="link-label">Produção</span>
          </a>
        </li>
        <li>
          <a href="#" class="nav-link sidebar-link text-white" :class="{active: tab==='programacao'}" @click.prevent="setTab('programacao')">
            <i class="bi bi-calendar-check me-2"></i> <span class="link-label">Programação</span>
          </a>
        </li>
        <li>
          <a href="#" class="nav-link sidebar-link text-white" :class="{active: tab==='apontamento'}" @click.prevent="setTab('apontamento')">
            <i class="bi bi-pencil-square me-2"></i> <span class="link-label">Apontamento</span>
          </a>
        </li>
        <li>
          <a href="#" class="nav-link sidebar-link text-white" :class="{active: tab==='equipes'}" @click.prevent="setTab('equipes')">
            <i class="bi bi-people me-2"></i> <span class="link-label">Equipes</span>
          </a>
        </li>
      </ul>
      <hr class="bg-light w-100 mt-auto mb-3">
      <button class="btn btn-outline-light w-100 sidebar-logout" style="border-radius: 1rem;" @click="logout">
        <i class="bi bi-box-arrow-right me-2"></i> <span class="link-label">Sair</span>
      </button>
    </aside>
    <div v-if="isAuthenticated && mobileSidebarOpen" class="mobile-backdrop" @click="closeMobileSidebar"></div>
    <main class="flex-grow-1 p-4 app-main">
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
          <div class="dev-hero">
            <div class="dev-topbar"></div>
            <div class="dev-content text-center">
              <h1 class="display-4 fw-bold">EM DESENVOLVIMENTO</h1>
              <p class="lead mt-2">Área de Programação em desenvolvimento. Voltaremos em breve com funcionalidades completas.</p>
              <div class="pulse mt-4" aria-hidden="true"></div>
            </div>
          </div>
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

export default {
  name: 'App',
  components: { MenuHero, ProducaoView, EquipesPage, Login },
  data() {
    return {
      tab: 'menu',
      theme: 'light',
      toasts: [],
      isAuthenticated: !!localStorage.getItem('auth_token'),
      authUser: localStorage.getItem('auth_user') || null,
      sidebarCollapsed: localStorage.getItem('sidebar_collapsed') === '1',
      mobileSidebarOpen: false
    };
  },
  mounted() {
    const saved = localStorage.getItem('theme');
    if (saved) this.theme = saved;
    else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) this.theme = 'dark';
    this.applyTheme();

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
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Você saiu.', type: 'info' } }));
    },
    handleLogin(payload) {
      if (!payload || !payload.token) return;
      localStorage.setItem('auth_token', payload.token);
      localStorage.setItem('auth_user', payload.user || 'user');
      this.isAuthenticated = true;
      this.authUser = payload.user || 'user';
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Login realizado.', type: 'success' } }));
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
  min-height: 100vh;
  box-shadow: 2px 0 16px rgba(0,0,0,0.07);
  z-index: 10;
  transition: width 0.2s;
  background: var(--sidebar-bg);
  position: relative;
  overflow: visible; /* allow hovered items to rise without being clipped by parent */
  isolation: isolate; /* create local stacking context */
}
.sidebar.collapsed { width: 88px !important; }
.sidebar.collapsed .sidebar-logo { display: none; }
.sidebar.collapsed .nav-link span { display: none; }
.sidebar.collapsed .link-label { display: none; }
.sidebar.collapsed .sidebar-menu-link { font-size: 0; }
.sidebar.collapsed .avatar-img { width: 40px !important; height: 40px !important; }
.sidebar.collapsed .prefix-badge-lg { font-size: 1.1rem; padding: 8px 16px; }
.sidebar.collapsed .sidebar-logout .link-label { display: none; }
.sidebar-logo {
  letter-spacing: 2px;
  color: #fff;
}
.sidebar-header {
  width: 100%;
}
.avatar-img {
  border: 3px solid #fff;
  box-shadow: 0 2px 12px rgba(0,0,0,0.10);
}
  .nav { display: flex; flex-direction: column; gap: 8px; }

  .nav .nav-item { width: 100%; }

  .nav-link {
    overflow: visible; /* allow shadow to extend */
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0.9rem;
    height: 48px;
    box-sizing: border-box;
    z-index: 0;
    isolation: isolate; /* ensure each link has its own stacking context */
  }

  .sidebar-link {
    border-radius: 0.7rem;
    font-size: 1.05rem;
    font-weight: 500;
    transition: background 0.12s ease, color 0.12s ease, box-shadow 0.12s ease, transform 0.12s ease;
    width: 100%;
    display: flex;
    align-items: center;
  }

  .sidebar-link.active, .sidebar-link:hover {
    background: rgba(255,255,255,0.14) !important;
    color: #222 !important;
    box-shadow: 0 8px 22px rgba(0,0,0,0.14);
    transform: translateX(3px);
    z-index: 20; /* lift hovered item above neighbors */
  }

  /* collapsed layout: center icons and remove extra spacing */
  .sidebar.collapsed .nav-link {
    justify-content: center;
    padding: 0.45rem 0;
    height: 56px;
  }
  .sidebar.collapsed .nav-link i { margin-right: 0 !important; }
.sidebar-menu-link {
  font-size: 1.1rem;
  font-weight: 500;
  margin-bottom: 0.5rem;
  transition: color 0.18s;
}
.sidebar-menu-link:hover {
  color: #222 !important;
}
.sidebar-logout {
  font-size: 1.1rem;
  font-weight: 500;
  border-width: 2px;
  margin-bottom: 0.5rem;
  transition: background 0.18s, color 0.18s;
}
.sidebar-logout:hover {
  background: #fff;
  color: #005bea;
  border-color: #005bea;
}
.nav-link.active, .nav-link.active:focus {
  background: rgba(255,255,255,0.18) !important;
  color: #222 !important;
}
.menu-title {
  font-size: 2.2rem;
  font-weight: 700;
  color: #005bea;
  text-align: center;
}
.menu-item {
  background: linear-gradient(90deg, #005bea 0%, #3ec6e0 100%);
  color: #fff;
  border: none;
  border-radius: 12px;
  font-size: 1.3rem;
  font-weight: 500;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
  min-width: 180px;
  transition: transform 0.2s, box-shadow 0.2s;
}
.menu-item:hover {
  transform: translateY(-6px) scale(1.04);
  box-shadow: 0 8px 32px rgba(0,0,0,0.13);
  background: linear-gradient(90deg, #3ec6e0 0%, #005bea 100%);
  color: #fff;
}
@media (max-width: 900px) {
  .sidebar {
    width: 100px !important;
    padding: 0.5rem !important;
  }
  .sidebar-logo {
    font-size: 1.2rem;
  }
  .nav-link span {
    display: none;
  }
}
@media (max-width: 640px) {
  .sidebar {
    position: fixed !important;
    top: 0; left: 0; height: 100vh; width: 260px !important;
    transform: translateX(-110%);
    transition: transform 0.26s ease, opacity 0.26s ease;
    box-shadow: 4px 0 30px rgba(0,0,0,0.6);
    z-index: 30;
  }
  .sidebar.mobile-open { transform: translateX(0); }
  .app-main { padding: 18px; }
  .mobile-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 25; }
  .mobile-menu-btn { position: fixed; left: 12px; top: 12px; z-index: 40; }
  .sidebar.collapsed { width: 88px !important; }
}
/* Toasts */
.app-toasts {
  position: fixed; right: 18px; bottom: 18px; z-index: 9999; display:flex; flex-direction:column; gap:8px; align-items:flex-end;
}
.toast-item { background: rgba(0,0,0,0.8); color: #fff; padding: 10px 14px; border-radius: 10px; box-shadow: 0 8px 20px rgba(0,0,0,0.2); min-width: 180px; max-width: 320px; }
.toast-item.success { background: linear-gradient(90deg,#28a745,#198754); }
.toast-item.error { background: linear-gradient(90deg,#dc3545,#b02a37); }
.toast-item.info { background: linear-gradient(90deg,#0d6efd,#3b82f6); }

/* Dev banner styles reused across simple pages */
.dev-hero { max-width:980px; margin:40px auto; border-radius:14px; overflow:hidden; box-shadow: 0 18px 40px rgba(2,6,23,0.18); }
.dev-topbar { height:8px; background: linear-gradient(90deg,var(--primary-1),var(--primary-2)); position:relative; }
.dev-topbar::after { content: ''; position:absolute; left:-40%; top:0; width:40%; height:100%; background:linear-gradient(90deg, rgba(255,255,255,0.15), rgba(255,255,255,0.02)); transform: skewX(-18deg); animation: sweep 2.2s linear infinite; opacity:0.6 }
@keyframes sweep { 0% { left:-40% } 100% { left:140% } }
.dev-content { padding:44px 28px; background: linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01)); }
.pulse { width:80px; height:8px; margin:0 auto; border-radius:8px; background: linear-gradient(90deg, rgba(62,198,224,0.9), rgba(6,78,209,0.9)); box-shadow: 0 8px 20px rgba(6,78,209,0.12); animation: pulse 1.6s ease-in-out infinite; }
@keyframes pulse { 0% { transform: scaleX(0.92); opacity:0.9 } 50% { transform: scaleX(1.06); opacity:1 } 100% { transform: scaleX(0.92); opacity:0.9 } }
</style>
