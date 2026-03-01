<template>
  <section class="menu-hero">
    <div class="hero-inner">
      <header class="hero-header text-center">
        <h1 class="hero-title">Bem-vindo!</h1>
        <p class="hero-sub">Escolha uma área para acessar</p>
      </header>

      <div class="cards-grid" role="list">
        <button role="listitem" class="card-cta" @click="$emit('select','producao')" aria-label="Acessar Produção">
          <div class="card-glow"></div>
          <div class="card-content">
            <i class="bi bi-gear card-icon" aria-hidden="true"></i>
            <h3 class="card-title">Produção</h3>
            <p class="card-desc">Acompanhe e gerencie a produção em tempo real.</p>
          </div>
        </button>

        <button role="listitem" class="card-cta" @click="$emit('select','programacao')" aria-label="Acessar Programação">
          <div class="card-glow"></div>
          <div class="card-content">
            <i class="bi bi-calendar-check card-icon" aria-hidden="true"></i>
            <h3 class="card-title">Programação</h3>
            <p class="card-desc">Visualize e organize a programação das atividades.</p>
          </div>
        </button>

        <button role="listitem" class="card-cta" @click="$emit('select','apontamento')" aria-label="Acessar Apontamento">
          <div class="card-glow"></div>
          <div class="card-content">
            <i class="bi bi-pencil-square card-icon" aria-hidden="true"></i>
            <h3 class="card-title">Apontamento</h3>
            <p class="card-desc">Registre e acompanhe os apontamentos facilmente.</p>
          </div>
        </button>
      </div>
    </div>
  </section>
</template>

<script>
export default { name: 'MenuHero' };
</script>

<style scoped>
:root{ --card-gradient-1: rgba(6,78,209,0.12); --card-gradient-2: rgba(62,198,224,0.06); }
.menu-hero{min-height:82vh;display:flex;align-items:center;justify-content:center;padding:40px 18px;background:linear-gradient(180deg, rgba(4,10,18,0.96) 0%, rgba(14,19,27,0.96) 100%);}
.hero-inner{width:100%;max-width:1200px;}
.hero-header{margin-bottom:28px;color:var(--text);}
.hero-title{font-size:3.4rem;margin:0;color:linear-gradient(90deg,var(--primary-1),var(--primary-2));background-clip:text;-webkit-background-clip:text;color:transparent;background-image:linear-gradient(90deg,var(--primary-1),var(--primary-2));}
.hero-sub{color:rgba(255,255,255,0.65);margin-top:8px;font-size:1.1rem}
.cards-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:26px;align-items:stretch}
.card-cta{position:relative;display:block;overflow:visible;border:0;padding:0;background:transparent;border-radius:18px;cursor:pointer;outline:none;text-align:left;}
.card-cta:focus{box-shadow:0 0 0 4px rgba(3,169,244,0.12);}
.card-glow{position:absolute;inset:0;border-radius:18px;background:linear-gradient(120deg, rgba(2,132,199,0.08), rgba(99,102,241,0.05));filter:blur(22px);opacity:0;transition:opacity .22s ease, transform .22s ease;pointer-events:none;}
.card-content{position:relative;background:linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01));backdrop-filter: blur(6px);border:1px solid rgba(255,255,255,0.03);padding:34px 26px;border-radius:18px;min-height:220px;display:flex;flex-direction:column;align-items:center;justify-content:center;transition:transform .18s ease,box-shadow .18s ease;}
.card-icon{font-size:70px;color:transparent;background-image:linear-gradient(90deg,var(--primary-1),var(--primary-2));-webkit-background-clip:text;background-clip:text;margin-bottom:18px}
.card-title{font-size:1.25rem;margin:0 0 8px 0;color:var(--text);font-weight:700}
.card-desc{margin:0;color:rgba(255,255,255,0.65);text-align:center;max-width:260px}
.card-cta:hover .card-content,.card-cta:focus .card-content{transform:translateY(-8px);box-shadow:0 18px 40px rgba(2,6,23,0.6);}
.card-cta:hover .card-glow,.card-cta:focus .card-glow{opacity:1;transform:scale(1.02)}

/* subtle floating animation */
@keyframes floaty{0%{transform:translateY(0)}50%{transform:translateY(-6px)}100%{transform:translateY(0)}}
.card-cta .card-content{animation:none}
.card-cta:hover .card-content{animation:floaty 1.6s ease-in-out 0s 1}

@media (max-width:980px){.cards-grid{grid-template-columns:repeat(2,1fr)}.hero-title{font-size:2.6rem}}
@media (max-width:640px){.cards-grid{grid-template-columns:1fr} .hero-title{font-size:2.2rem}.card-content{min-height:180px;padding:22px}}
</style>
