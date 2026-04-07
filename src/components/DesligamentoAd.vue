<template>
  <section class="desligamento-ad-page">
    <header class="page-header">
      <p class="page-kicker">Desligamento - AD</p>
      <h1>Desligamento - AD</h1>
      <p class="page-description">
        Painel de desligamento de ativos e checagem de disponibilidade de clientes.
      </p>
    </header>
    <div class="page-content">
      <p>Esta página ainda está em desenvolvimento. Aqui iremos apresentar indicadores de desligamento e acompanhamento AD.</p>
    </div>
  </section>
</template>

<script>
export default {
  name: 'DesligamentoAd',
};
</script>

<style scoped>
.desligamento-ad-page {
  min-height: 100%;
  padding: 28px 24px;
}

.page-header {
  margin-bottom: 28px;
}

.page-kicker {
  margin: 0 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.18em;
  color: rgba(191, 219, 254, 0.64);
  font-size: 0.84rem;
}

.page-description {
  max-width: 680px;
  color: rgba(226, 232, 240, 0.78);
}

.page-content {
  background: rgba(15, 23, 42, 0.78);
  border: 1px solid rgba(125, 211, 252, 0.12);
  border-radius: 24px;
  padding: 22px;
  color: #e2e8f0;
}
</style>
