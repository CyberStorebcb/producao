<template>
  <div class="menu-hero d-flex flex-column align-items-center justify-content-center text-center">
    <h1 class="display-3 fw-bold mb-3 gradient-text">Bem-vindo!</h1>
    <p class="lead mb-5">Escolha uma área para acessar:</p>
    <div class="row g-4 justify-content-center">
      <div class="col-12 col-md-4">
        <div class="menu-card card h-100 shadow-lg border-0 animate__animated animate__fadeInUp" @click="$emit('select', 'producao')">
          <div class="card-body d-flex flex-column align-items-center">
            <i class="bi bi-gear display-1 mb-3 gradient-icon"></i>
            <h5 class="card-title fw-bold">Produção</h5>
            <p class="card-text">Acompanhe e gerencie a produção em tempo real.</p>
          </div>
        </div>
      </div>
      <div class="col-12 col-md-4">
        <div class="menu-card card h-100 shadow-lg border-0 animate__animated animate__fadeInUp animate__delay-1s" @click="$emit('select', 'programacao')">
          <div class="card-body d-flex flex-column align-items-center">
            <i class="bi bi-calendar-check display-1 mb-3 gradient-icon"></i>
            <h5 class="card-title fw-bold">Programação</h5>
            <p class="card-text">Visualize e organize a programação das atividades.</p>
          </div>
        </div>
      </div>
      <div class="col-12 col-md-4">
        <div class="menu-card card h-100 shadow-lg border-0 animate__animated animate__fadeInUp animate__delay-2s" @click="$emit('select', 'apontamento')">
          <div class="card-body d-flex flex-column align-items-center">
            <i class="bi bi-pencil-square display-1 mb-3 gradient-icon"></i>
            <h5 class="card-title fw-bold">Apontamento</h5>
            <p class="card-text">Registre e acompanhe os apontamentos facilmente.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'MenuHero',
};
</script>

<style scoped>
.menu-hero {
  min-height: 80vh;
  background: linear-gradient(120deg, rgba(0,0,0,0.03) 0%, var(--bg) 100%);
  padding: 3rem 1rem;
}
.gradient-text {
  background: linear-gradient(90deg, var(--primary-1) 0%, var(--primary-2) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
.menu-card {
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  border-radius: 1.5rem;
}
.menu-card:hover {
  transform: translateY(-10px) scale(1.04);
  box-shadow: 0 12px 32px rgba(0,0,0,0.13);
}
.gradient-icon {
  background: linear-gradient(90deg, var(--primary-1) 0%, var(--primary-2) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.menu-card {
  background: var(--card-bg);
  color: var(--text);
}
.menu-card .card-body { min-height: 220px; display:flex; flex-direction:column; justify-content:center }
</style>
