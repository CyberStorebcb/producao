<template>
  <section class="podium podium--gamer" :aria-label="ariaLabel">
    <div
      v-for="place in places"
      :key="`${sectionKey}-${place.rank}`"
      class="podium-card"
      :class="[`podium-card--r${place.rank}`, { 'podium-card--empty': !place.row }]"
    >
      <template v-if="place.row">
        <div class="podium-card__glow" aria-hidden="true" />
        <div class="podium-card__accent" aria-hidden="true" />
        <div class="podium-card__inner">
          <div class="podium-medal-wrap">
            <div class="podium-medal-ring" aria-hidden="true" />
            <div class="podium-medal" :data-rank="place.rank">{{ place.medal }}</div>
          </div>
          <p class="podium-rank">
            <span class="podium-rank__pill" :data-rank="place.rank">{{ place.rank }}º lugar</span>
          </p>
          <h2 class="podium-base">{{ rowLabel(place.row) }}</h2>
          <p class="podium-score" :data-rank="place.rank">{{ formatPct(place.row[scoreKey]) }}</p>
          <p class="podium-hint">
            <span class="podium-hint__line" aria-hidden="true" />
            {{ hint }}
          </p>
        </div>
      </template>
    </div>
  </section>
</template>

<script>
export default {
  name: 'LigaPodiumBlock',
  props: {
    /** Saída de buildPodiumPlaces */
    places: { type: Array, required: true },
    /** Chave do objeto linha para o nome (ex.: 'base', 'nome') */
    labelKey: { type: String, required: true },
    scoreKey: { type: String, default: 'resultadoPct' },
    hint: { type: String, required: true },
    ariaLabel: { type: String, default: 'Pódio top 3' },
    sectionKey: { type: String, default: 'podium' },
  },
  methods: {
    formatPct(value) {
      return `${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
    },
    rowLabel(row) {
      return row[this.labelKey];
    },
  },
};
</script>

<style scoped>
.podium {
  display: grid;
  grid-template-columns: 1fr 1.08fr 1fr;
  align-items: end;
  gap: clamp(0.65rem, 2vw, 1.25rem);
  max-width: 56rem;
  margin: 0 auto 2rem;
}

.podium--gamer {
  filter: drop-shadow(0 12px 40px rgba(2, 6, 23, 0.45));
}

.podium-card {
  --podium-accent: rgba(148, 163, 184, 0.45);
  --podium-glow: rgba(34, 211, 238, 0.12);
  position: relative;
  min-height: 11.5rem;
  padding: 0.85rem 0.75rem 1rem;
  border-radius: 14px;
  background: linear-gradient(165deg, rgba(15, 23, 42, 0.92), rgba(2, 6, 23, 0.88));
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.03) inset,
    0 18px 40px rgba(0, 0, 0, 0.35);
  overflow: hidden;
  transition: transform 0.28s ease, box-shadow 0.28s ease;
}

.podium-card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow:
    0 0 0 1px rgba(255, 255, 255, 0.05) inset,
    0 22px 48px rgba(0, 0, 0, 0.4);
}

.podium-card--r1:hover {
  transform: translateY(-6px) scale(1.05);
}

.podium-card__glow {
  position: absolute;
  inset: -40% -20% 35%;
  background: radial-gradient(circle at 50% 0%, var(--podium-glow), transparent 62%);
  pointer-events: none;
}

.podium-card__accent {
  position: absolute;
  top: 0;
  left: 8%;
  right: 8%;
  height: 3px;
  border-radius: 0 0 4px 4px;
  background: linear-gradient(90deg, transparent, var(--podium-accent), transparent);
  box-shadow: 0 0 18px var(--podium-accent);
}

.podium-card__inner {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.podium-card--r1 {
  --podium-accent: rgba(251, 191, 36, 0.95);
  --podium-glow: rgba(251, 191, 36, 0.22);
  transform: scale(1.08);
  z-index: 2;
  border-color: rgba(251, 191, 36, 0.42);
  box-shadow:
    0 0 32px rgba(251, 191, 36, 0.12),
    0 0 0 1px rgba(255, 255, 255, 0.04) inset,
    0 22px 50px rgba(0, 0, 0, 0.42);
}

.podium-card--r1 .podium-card__accent {
  height: 4px;
  box-shadow: 0 0 28px rgba(251, 191, 36, 0.55);
}

.podium-card--r2 {
  --podium-accent: rgba(226, 232, 240, 0.85);
  --podium-glow: rgba(226, 232, 240, 0.12);
}

.podium-card--r3 {
  --podium-accent: rgba(251, 146, 60, 0.9);
  --podium-glow: rgba(251, 146, 60, 0.14);
}

.podium-medal-wrap {
  position: relative;
  width: 3.5rem;
  height: 3.5rem;
  display: grid;
  place-items: center;
  margin-bottom: 0.25rem;
}

.podium-medal-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2px solid rgba(34, 211, 238, 0.25);
  animation: podium-ring-pulse 3.2s ease-in-out infinite;
}

.podium-card--r1 .podium-medal-ring {
  border-color: rgba(251, 191, 36, 0.45);
  box-shadow: 0 0 20px rgba(251, 191, 36, 0.2);
}

.podium-card--r2 .podium-medal-ring {
  border-color: rgba(226, 232, 240, 0.35);
}

.podium-card--r3 .podium-medal-ring {
  border-color: rgba(251, 146, 60, 0.4);
}

@keyframes podium-ring-pulse {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.85;
  }
  50% {
    transform: scale(1.06);
    opacity: 1;
  }
}

.podium-medal {
  position: relative;
  font-size: 2.1rem;
  line-height: 1;
  animation: podium-medal-float 3.5s ease-in-out infinite;
}

.podium-card--r1 .podium-medal {
  font-size: 2.35rem;
}

@keyframes podium-medal-float {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

.podium-rank {
  margin: 0;
}

.podium-rank__pill {
  display: inline-block;
  padding: 0.2rem 0.55rem;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.85);
  border: 1px solid rgba(148, 163, 184, 0.35);
  border-radius: 4px;
  box-shadow: 0 0 14px rgba(34, 211, 238, 0.08);
}

.podium-rank__pill[data-rank='1'] {
  color: #fef08a;
  border-color: rgba(251, 191, 36, 0.55);
  box-shadow: 0 0 18px rgba(251, 191, 36, 0.2);
}

.podium-rank__pill[data-rank='2'] {
  color: #e2e8f0;
  border-color: rgba(226, 232, 240, 0.4);
}

.podium-rank__pill[data-rank='3'] {
  color: #fdba74;
  border-color: rgba(251, 146, 60, 0.5);
  box-shadow: 0 0 14px rgba(251, 146, 60, 0.15);
}

.podium-base {
  margin: 0.15rem 0 0.35rem;
  min-height: 2.6rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: clamp(0.82rem, 2.1vw, 0.98rem);
  font-weight: 700;
  line-height: 1.2;
  font-family: 'Orbitron', sans-serif;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #f1f5f9;
  text-shadow: 0 0 24px rgba(34, 211, 238, 0.12);
}

.podium-score {
  margin: 0;
  font-size: clamp(1.5rem, 3.5vw, 1.85rem);
  font-family: 'Orbitron', sans-serif;
  font-weight: 800;
  letter-spacing: 0.02em;
  line-height: 1.1;
  background: linear-gradient(100deg, #f8fafc 0%, #67e8f9 45%, #22d3ee 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  filter: drop-shadow(0 0 12px rgba(34, 211, 238, 0.35));
}

.podium-score[data-rank='1'] {
  background: linear-gradient(100deg, #fde68a 0%, #a5f3fc 50%, #22d3ee 100%);
  -webkit-background-clip: text;
  background-clip: text;
  filter: drop-shadow(0 0 16px rgba(251, 191, 36, 0.45));
}

.podium-hint {
  margin: 0.5rem 0 0;
  font-size: 0.65rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
}

.podium-hint__line {
  width: 2.5rem;
  height: 2px;
  border-radius: 2px;
  background: linear-gradient(90deg, transparent, rgba(34, 211, 238, 0.5), transparent);
}

@media (prefers-reduced-motion: reduce) {
  .podium-medal,
  .podium-medal-ring {
    animation: none;
  }

  .podium-card:hover,
  .podium-card--r1:hover {
    transform: none;
  }

  .podium-card--r1 {
    transform: scale(1.06);
  }
}

@media (max-width: 960px) {
  .podium {
    grid-template-columns: 1fr;
    max-width: 22rem;
  }

  .podium-card--r1 {
    order: -1;
    transform: scale(1.04);
  }
}
</style>

<style>
html:not(.dark-theme) .podium-card {
  background: rgba(255, 255, 255, 0.94);
  border-color: rgba(15, 23, 42, 0.12);
  box-shadow: 0 12px 32px rgba(15, 23, 42, 0.08);
}

html:not(.dark-theme) .podium-score {
  background: linear-gradient(90deg, #0f172a, #0284c7);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
</style>
