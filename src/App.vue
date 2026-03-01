// ...existing code...
<template>
  <div class="d-flex min-vh-100">
    <aside class="sidebar d-flex flex-column flex-shrink-0 p-3 text-white align-items-center" style="width: 260px;">
        <div class="sidebar-header d-flex flex-column align-items-center mb-4">
          <img src="https://ui-avatars.com/api/?name=User&background=3ec6e0&color=fff&size=80" class="rounded-circle mb-2 shadow avatar-img" alt="Avatar" width="72" height="72">
          <div class="d-flex align-items-center gap-2">
            <span class="fw-bold fs-5 sidebar-logo mb-1">Olá, Usuário!</span>
            <button class="btn btn-sm btn-light ms-2" @click.prevent="toggleTheme" :title="theme === 'dark' ? 'Desativar modo escuro' : 'Ativar modo escuro'">
              <i :class="theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-fill'"></i>
            </button>
          </div>
          <a href="#" class="sidebar-menu-link text-white text-decoration-none" @click.prevent="setTab('menu')">
            <i class="bi bi-house-door me-2"></i> Menu
          </a>
        </div>
      <hr class="bg-light w-100">
      <ul class="nav nav-pills flex-column mb-auto gap-2 w-100">
        <li class="nav-item">
          <a href="#" class="nav-link sidebar-link text-white" :class="{active: tab==='producao'}" @click.prevent="setTab('producao')">
            <i class="bi bi-gear me-2"></i> Produção
          </a>
        </li>
        <li>
          <a href="#" class="nav-link sidebar-link text-white" :class="{active: tab==='programacao'}" @click.prevent="setTab('programacao')">
            <i class="bi bi-calendar-check me-2"></i> Programação
          </a>
        </li>
        <li>
          <a href="#" class="nav-link sidebar-link text-white" :class="{active: tab==='apontamento'}" @click.prevent="setTab('apontamento')">
            <i class="bi bi-pencil-square me-2"></i> Apontamento
          </a>
        </li>
        <li>
          <a href="#" class="nav-link sidebar-link text-white" :class="{active: tab==='equipes'}" @click.prevent="setTab('equipes')">
            <i class="bi bi-people me-2"></i> Equipes
          </a>
        </li>
      </ul>
      <hr class="bg-light w-100 mt-auto mb-3">
      <button class="btn btn-outline-light w-100 sidebar-logout" style="border-radius: 1rem;" @click="logout">
        <i class="bi bi-box-arrow-right me-2"></i> Sair
      </button>
    </aside>
    <main class="flex-grow-1 p-4 app-main">
      <MenuHero v-if="tab==='menu'" @select="setTab" />
      <ProducaoView v-else-if="tab==='producao'"/>
      <div v-else-if="tab==='programacao'">
        <h1>Programação</h1>
        <p>Veja aqui a programação das atividades.</p>
      </div>
      <div v-else-if="tab==='apontamento'">
        <h1>Apontamento</h1>
        <p>Registre e acompanhe os apontamentos.</p>
      </div>
      <EquipesPage v-else-if="tab==='equipes'"/>
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

export default {
  name: 'App',
  components: { MenuHero, ProducaoView, EquipesPage },
  data() {
    return {
      tab: 'menu',
      theme: 'light',
      toasts: []
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
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Logout simulado!', type: 'info' } }));
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
}
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
.sidebar-link {
  border-radius: 0.7rem;
  font-size: 1.1rem;
  font-weight: 500;
  transition: background 0.18s, color 0.18s, transform 0.18s;
}
.sidebar-link.active, .sidebar-link:hover {
  background: rgba(255,255,255,0.18) !important;
  color: #222 !important;
  transform: scale(1.04);
}
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
/* Toasts */
.app-toasts {
  position: fixed; right: 18px; bottom: 18px; z-index: 9999; display:flex; flex-direction:column; gap:8px; align-items:flex-end;
}
.toast-item { background: rgba(0,0,0,0.8); color: #fff; padding: 10px 14px; border-radius: 10px; box-shadow: 0 8px 20px rgba(0,0,0,0.2); min-width: 180px; max-width: 320px; }
.toast-item.success { background: linear-gradient(90deg,#28a745,#198754); }
.toast-item.error { background: linear-gradient(90deg,#dc3545,#b02a37); }
.toast-item.info { background: linear-gradient(90deg,#0d6efd,#3b82f6); }
</style>
