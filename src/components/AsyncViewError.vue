<template>
  <div class="async-error" role="alert">
    <p class="async-error__title">Não foi possível carregar esta página</p>
    <p class="async-error__detail">{{ detail }}</p>
    <button type="button" class="async-error__btn" @click="reload">Recarregar a página</button>
  </div>
</template>

<script>
export default {
  name: 'AsyncViewError',
  props: {
    error: {
      type: Error,
      default: null,
    },
  },
  computed: {
    detail() {
      return this.error?.message || 'Erro ao baixar o módulo. Verifique a rede e tente de novo.';
    },
  },
  methods: {
    reload() {
      window.location.reload();
    },
  },
};
</script>

<style scoped>
.async-error {
  max-width: 420px;
  margin: 2rem auto;
  padding: 1.5rem;
  border-radius: 14px;
  background: rgba(127, 29, 29, 0.2);
  border: 1px solid rgba(248, 113, 113, 0.35);
  color: #fecaca;
  text-align: center;
}

.async-error__title {
  margin: 0 0 0.5rem;
  font-weight: 700;
  font-size: 1rem;
}

.async-error__detail {
  margin: 0 0 1rem;
  font-size: 0.875rem;
  opacity: 0.95;
}

.async-error__btn {
  padding: 0.5rem 1rem;
  border-radius: 10px;
  border: 1px solid rgba(252, 165, 165, 0.5);
  background: rgba(0, 0, 0, 0.25);
  color: #fff;
  cursor: pointer;
  font-weight: 600;
}

.async-error__btn:hover {
  background: rgba(0, 0, 0, 0.4);
}
</style>
