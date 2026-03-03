<template>
  <div
    v-if="showTruck"
    class="experience-overlay animate__animated animate__fadeInDown animate__faster"
    @click="handleClose"
    role="button"
    tabindex="0"
    aria-label="Fechar animação"
    @keyup.enter.prevent="handleClose"
    @keyup.space.prevent="handleClose"
  >
    <div class="experience-card animate__animated animate__zoomIn animate__delay-1s">
      <header class="experience-header">
        <span class="eyebrow">{{ isWelcome ? 'Boas-vindas' : 'Linha premium' }}</span>
        <h1 v-if="isWelcome">Bem-vindo, {{ displayName }}</h1>
        <h1 v-else>Comboio em rota perfeita</h1>
        <p class="lede" v-if="isWelcome">
          Sua sessão está pronta. Aproveite o cenário para entrar no ritmo e conduzir a operação com confiança.
        </p>
        <p class="lede" v-else>
          Telemetria, estilo e fluidez para mostrar que sua operação não para. Observe o caminhão cruzando o corredor dinâmico 3D.
        </p>
      </header>

      <section class="scene" aria-hidden="true">
        <div class="sky-gradient"></div>
        <div class="sun"></div>
        <div class="stars"></div>
        <div
          v-for="(cloud, index) in clouds"
          :key="`cloud-${index}`"
          class="cloud"
          :style="{
            left: cloud.left,
            top: cloud.top,
            animationDelay: cloud.delay,
            '--cloud-scale': cloud.scale
          }"
        ></div>

        <div class="mountains back"></div>
        <div class="mountains front"></div>

        <div class="cityline">
          <span
            v-for="block in skylineBlocks"
            :key="`block-${block.id}`"
            class="building"
            :style="{
              height: block.height,
              animationDelay: block.delay
            }"
          ></span>
        </div>

        <div class="trees">
          <span
            v-for="tree in 14"
            :key="`tree-${tree}`"
            class="tree"
            :style="{ animationDelay: `${tree * 0.2}s` }"
          ></span>
        </div>

        <div class="road-shadow"></div>
        <div class="road">
          <div class="road-strip"></div>
        </div>

        <div
          v-for="(trail, idx) in speedTrails"
          :key="`trail-${idx}`"
          class="speed-trail"
          :style="{ animationDelay: `${trail.delay}s`, top: trail.top }"
        ></div>

        <div class="truck" aria-label="Caminhão avançando">
          <div class="truck-shadow"></div>
          <div class="truck-body">
            <div class="truck-top"></div>
            <div class="truck-cab">
              <div class="cab-detail"></div>
              <div class="cab-window"></div>
              <div class="cab-window cab-window-small"></div>
            </div>
            <div class="truck-cargo">
              <div class="cargo-stripe"></div>
              <div class="cargo-stripe stripe-two"></div>
              <div class="cargo-logo">VX</div>
            </div>
            <div class="truck-door"></div>
            <div class="truck-handle"></div>
            <div class="truck-headlight"></div>
          </div>
          <div class="wheel wheel-front">
            <span class="wheel-rim"></span>
            <span class="wheel-cap"></span>
          </div>
          <div class="wheel wheel-back">
            <span class="wheel-rim"></span>
            <span class="wheel-cap"></span>
          </div>
        </div>
      </section>

      <footer class="experience-footer">
        <div class="tag">{{ isWelcome ? 'Sessão iniciada' : 'Animação interativa' }}</div>
        <p class="exit-hint">{{ isWelcome ? 'Clique ou pressione Enter/Espaço para começar' : 'Clique ou pressione Enter/Espaço para retornar' }}</p>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';

const emit = defineEmits(['close']);

const props = defineProps({
  userName: {
    type: String,
    default: ''
  },
  variant: {
    type: String,
    default: 'page'
  }
});

const isWelcome = computed(() => props.variant === 'welcome');
const displayName = computed(() => {
  const value = (props.userName || '').trim();
  return value || 'Operador';
});

const showTruck = ref(false);

const clouds = [
  { left: '6%', top: '8%', scale: 1.2, delay: '0s' },
  { left: '28%', top: '5%', scale: 0.8, delay: '1.2s' },
  { left: '58%', top: '11%', scale: 1.1, delay: '0.8s' },
  { left: '78%', top: '6%', scale: 0.9, delay: '1.6s' }
];

const skylineBlocks = Array.from({ length: 9 }, (_, idx) => ({
  id: idx,
  height: `${60 + (idx % 3) * 18}px`,
  delay: `${idx * 0.25}s`
}));

const speedTrails = Array.from({ length: 6 }, (_, idx) => ({
  delay: idx * 0.35,
  top: `${55 + idx * 8}px`
}));

const handleClose = () => {
  showTruck.value = false;
  emit('close');
};

onMounted(() => {
  showTruck.value = false;
  setTimeout(() => {
    showTruck.value = true;
  }, 10);
});
</script>

<style scoped>
.experience-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: radial-gradient(circle at top, rgba(18,35,90,0.94), rgba(4,8,18,0.96));
  display: flex;
  align-items: center;
  justify-content: center;
}

.experience-card {
  width: min(880px, 90vw);
  border-radius: 28px;
  padding: 44px;
  color: #fff;
  background: linear-gradient(145deg, rgba(9,18,48,0.92), rgba(16,46,112,0.88));
  box-shadow: 0 30px 60px rgba(0,0,0,0.45);
  border: 1px solid rgba(255,255,255,0.08);
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.experience-header {
  text-align: left;
}

.eyebrow {
  text-transform: uppercase;
  font-size: 0.85rem;
  letter-spacing: 0.32em;
  color: #6df0ff;
  display: inline-block;
  margin-bottom: 10px;
}

.experience-header h1 {
  font-size: clamp(2rem, 4vw, 2.8rem);
  margin-bottom: 10px;
}

.lede {
  max-width: 520px;
  color: rgba(255,255,255,0.78);
  line-height: 1.6;
}

.scene {
  position: relative;
  height: 260px;
  border-radius: 22px;
  overflow: hidden;
  background: linear-gradient(180deg,#08122a,#0c1b3d 70%,#060a16);
  box-shadow: inset 0 0 40px rgba(0,0,0,0.45);
}

.sky-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg,#122b60,#08132b 60%, transparent);
}

.sun {
  position: absolute;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  top: -30px;
  right: 12%;
  background: radial-gradient(circle, #ffc46b 0%, #ff7b39 60%, transparent 70%);
  filter: blur(1px);
  opacity: 0.85;
}

.stars {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px);
  background-size: 120px 120px;
  opacity: 0.25;
  animation: twinkle 4s ease-in-out infinite;
}

.cloud {
  position: absolute;
  width: 140px;
  height: 50px;
  background: rgba(255,255,255,0.16);
  border-radius: 999px;
  filter: blur(0.5px);
  animation: drift 16s linear infinite;
  transform: scale(var(--cloud-scale, 1));
}

.mountains {
  position: absolute;
  bottom: 110px;
  width: 140%;
  height: 120px;
  left: -20%;
  background: linear-gradient(120deg, rgba(18,45,89,0.9), rgba(10,23,47,0.95));
  clip-path: polygon(0% 100%, 10% 60%, 18% 80%, 26% 58%, 38% 86%, 53% 48%, 66% 78%, 78% 52%, 88% 70%, 100% 40%, 100% 100%);
  opacity: 0.6;
}

.mountains.front {
  bottom: 95px;
  opacity: 0.9;
  filter: drop-shadow(0 12px 18px rgba(0,0,0,0.35));
}

.cityline {
  position: absolute;
  bottom: 80px;
  left: 0;
  width: 100%;
  display: flex;
  gap: 16px;
  padding: 0 20px;
}

.building {
  flex: 1;
  background: linear-gradient(180deg, rgba(34,76,120,0.9), rgba(9,18,36,0.9));
  border-radius: 4px 4px 2px 2px;
  animation: float 8s ease-in-out infinite;
}

.trees {
  position: absolute;
  bottom: 60px;
  width: 120%;
  left: -10%;
  display: flex;
  justify-content: space-between;
}

.tree {
  width: 18px;
  height: 36px;
  background: linear-gradient(180deg,#0a311f,#0f5c33);
  clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
  opacity: 0.6;
  animation: sway 3s ease-in-out infinite;
}

.road-shadow {
  position: absolute;
  bottom: 46px;
  left: -10%;
  width: 120%;
  height: 60px;
  background: radial-gradient(ellipse at center, rgba(0,0,0,0.5), transparent 70%);
  filter: blur(18px);
}

.road {
  position: absolute;
  bottom: 32px;
  left: -4%;
  width: 108%;
  height: 70px;
  background: linear-gradient(180deg,#0d0d0d,#050505);
  border-radius: 50px;
  overflow: hidden;
  box-shadow: inset 0 6px 12px rgba(255,255,255,0.08);
}

.road-strip {
  position: absolute;
  inset: 50% auto auto 0;
  width: 100%;
  height: 6px;
  background: repeating-linear-gradient(90deg, transparent 0 40px, rgba(255,255,255,0.85) 40px 80px);
  transform: translateY(-50%);
  animation: road-dash 1s linear infinite;
}

.speed-trail {
  position: absolute;
  right: 12%;
  width: 110px;
  height: 2px;
  background: linear-gradient(90deg, rgba(255,255,255,0), rgba(118,212,255,0.9));
  opacity: 0;
  animation: trail 1.4s ease-out infinite;
}

.truck {
  position: absolute;
  bottom: 42px;
  left: -150px;
  width: 240px;
  height: 110px;
  animation: truck-ride 6s cubic-bezier(.63,.05,.29,1) infinite;
}

.truck-shadow {
  position: absolute;
  bottom: 0;
  left: 20px;
  width: 70%;
  height: 24px;
  background: radial-gradient(ellipse at center, rgba(0,0,0,0.6), transparent 70%);
  filter: blur(6px);
}

.truck-body {
  position: absolute;
  bottom: 26px;
  left: 40px;
  width: 160px;
  height: 60px;
  border-radius: 10px 18px 16px 10px;
  background: linear-gradient(120deg,#00a6ff,#0061ff);
  box-shadow: 0 18px 25px rgba(0,0,0,0.35);
}

.truck-top {
  position: absolute;
  top: -8px;
  left: 16px;
  width: 126px;
  height: 8px;
  border-radius: 8px 8px 0 0;
  background: rgba(255,255,255,0.25);
}

.truck-cab {
  position: absolute;
  left: -38px;
  top: 4px;
  width: 58px;
  height: 48px;
  border-radius: 14px 10px 12px 12px;
  background: linear-gradient(120deg,#00d2ff,#3ec6e0);
  box-shadow: 0 12px 22px rgba(0,0,0,0.32);
}

.cab-window {
  position: absolute;
  width: 24px;
  height: 16px;
  background: linear-gradient(120deg,#dff6ff,#8bd7ff);
  border-radius: 4px;
  top: 10px;
  left: 18px;
}

.cab-window-small {
  top: 30px;
  width: 18px;
  left: 22px;
  opacity: 0.85;
}

.cab-detail {
  position: absolute;
  left: 8px;
  bottom: 8px;
  width: 10px;
  height: 18px;
  background: rgba(255,255,255,0.35);
  border-radius: 4px;
}

.truck-cargo {
  position: absolute;
  right: -14px;
  top: 8px;
  width: 34px;
  height: 44px;
  border-radius: 10px;
  background: linear-gradient(120deg,#ffd75b,#ffa62e);
  box-shadow: inset 0 0 10px rgba(255,255,255,0.35);
}

.cargo-stripe {
  position: absolute;
  left: 6px;
  right: 6px;
  height: 4px;
  border-radius: 4px;
  background: rgba(255,255,255,0.36);
  top: 10px;
}

.stripe-two {
  top: 22px;
}

.cargo-logo {
  position: absolute;
  bottom: 6px;
  right: 8px;
  font-weight: 700;
  font-size: 0.8rem;
  letter-spacing: 0.1em;
}

.truck-door {
  position: absolute;
  width: 20px;
  height: 40px;
  right: 70px;
  top: 10px;
  border-radius: 4px;
  border: 1px solid rgba(255,255,255,0.35);
}

.truck-handle {
  position: absolute;
  right: 80px;
  top: 28px;
  width: 12px;
  height: 3px;
  border-radius: 999px;
  background: rgba(255,255,255,0.8);
}

.truck-headlight {
  position: absolute;
  left: -32px;
  bottom: 20px;
  width: 18px;
  height: 8px;
  border-radius: 4px;
  background: linear-gradient(90deg,#fff7cc,#ffd86b);
  box-shadow: 0 0 12px rgba(255,235,150,0.9);
}

.wheel {
  position: absolute;
  bottom: 10px;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #4d4d4d, #050505);
  box-shadow: inset -4px -4px 10px rgba(0,0,0,0.5);
  animation: wheel-spin 1s linear infinite;
}

.wheel-front {
  left: 20px;
}

.wheel-back {
  left: 130px;
}

.wheel-rim {
  position: absolute;
  inset: 8px;
  border-radius: 50%;
  border: 3px solid rgba(255,255,255,0.1);
}

.wheel-cap {
  position: absolute;
  inset: 16px;
  background: #1b1b1b;
  border-radius: 50%;
  box-shadow: inset -2px -2px 6px rgba(0,0,0,0.5);
}

.experience-footer {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: rgba(255,255,255,0.85);
}

.tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  background: rgba(255,255,255,0.08);
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.exit-hint {
  font-size: 0.9rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.7;
}

@keyframes twinkle {
  0%, 100% { opacity: 0.2; }
  50% { opacity: 0.45; }
}

@keyframes drift {
  0% { transform: translateX(0) scale(var(--cloud-scale, 1)); }
  100% { transform: translateX(60px) scale(var(--cloud-scale, 1)); }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

@keyframes sway {
  0%, 100% { transform: rotate(0deg); }
  50% { transform: rotate(3deg); }
}

@keyframes road-dash {
  from { background-position: 0 0; }
  to { background-position: -160px 0; }
}

@keyframes trail {
  0% { opacity: 0; transform: translateX(0); }
  30% { opacity: 1; }
  100% { opacity: 0; transform: translateX(160px); }
}

@keyframes truck-ride {
  0% { left: -240px; }
  15% { left: 60px; }
  45% { left: 160px; }
  70% { left: 160px; }
  100% { left: 110%; }
}

@keyframes wheel-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
