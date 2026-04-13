<template>
  <div class="async-fallback" role="status" aria-live="polite">
    <div class="async-fallback__spinner" aria-hidden="true"></div>
    <p class="async-fallback__text">{{ message }}</p>
  </div>
</template>

<script>
export default {
  name: 'AsyncViewFallback',
  props: {
    message: {
      type: String,
      default: 'Carregando…',
    },
  },
};
</script>

<style scoped>
.async-fallback {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  min-height: min(60vh, 560px);
  width: 100%;
  padding: 2rem 1.25rem;
  box-sizing: border-box;
  color: var(--text, #e6eef8);
  background: linear-gradient(165deg, rgba(15, 23, 42, 0.35), rgba(15, 23, 42, 0.08));
}

.async-fallback__spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(148, 163, 184, 0.25);
  border-top-color: rgba(56, 189, 248, 0.95);
  border-radius: 50%;
  animation: async-spin 0.75s linear infinite;
}

.async-fallback__text {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  opacity: 0.9;
}

@keyframes async-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
