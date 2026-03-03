<template>
  <div class="login-shell">
    <div class="ambient ambient-one"></div>
    <div class="ambient ambient-two"></div>
    <div class="ambient ambient-three"></div>
    <div class="grain"></div>

    <main class="login-layout">
      <section class="brand-panel lamp-panel" :style="lampStyleVars">
        <div
          class="lamp-scene"
          :class="{ 'scene-on': lampOn }"
          aria-live="polite"
          ref="lampScene"
          :style="lampStyleVars"
        >
          <div class="hanging-wires" aria-hidden="true">
            <span class="wire wire-left"></span>
            <span class="wire wire-right"></span>
          </div>
          <div
            class="lamp-assembly"
            :class="{ 'is-on': lampOn }"
            role="button"
            tabindex="0"
            @click="toggleLamp"
            @keydown.enter.prevent="toggleLamp"
            @keydown.space.prevent="toggleLamp"
            @pointerdown="startLampDrag"
            @pointermove="dragLamp"
            @pointerup="endLampDrag"
            @pointerleave="endLampDrag"
            @pointercancel="endLampDrag"
            @lostpointercapture="endLampDrag"
            :aria-pressed="lampOn"
            aria-label="Lâmpada pendente"
          >
            <span class="lamp-socket"></span>
            <span class="lamp-collar"></span>
            <div class="lamp-shade">
              <span class="shade-shell"></span>
              <span class="shade-stripe stripe-one"></span>
              <span class="shade-stripe stripe-two"></span>
            </div>
            <div class="lamp-glass">
              <div class="glass-core">
                <span class="tube-filament filament-top"></span>
                <span class="tube-filament filament-bottom"></span>
                <span class="filament-glow"></span>
              </div>
              <span class="glass-glint glint-one"></span>
              <span class="glass-glint glint-two"></span>
            </div>
            <div class="lamp-tip">
              <span class="tip-glow"></span>
            </div>
          </div>
          <div class="light-spill" :class="{ visible: lampOn }" aria-hidden="true"></div>
          <div class="floor-glow" :class="{ visible: lampOn }" aria-hidden="true"></div>
        </div>
        <div class="power-links" :class="{ 'is-on': lampOn }" aria-hidden="true">
          <span class="link-line"></span>
          <span class="link-line"></span>
          <span class="link-line"></span>
        </div>
        <div class="lamp-info" :class="{ 'info-on': lampOn }">
          <p class="lamp-label">Construção</p>
        </div>
      </section>

      <section class="form-panel" :class="{ 'panel-lit': lampOn }">
        <div class="form-meta">
          <span class="chip">Acesso seguro</span>
          <h2>Login do gestor</h2>
          <p>Use suas credenciais corporativas para liberar o cockpit operativo.</p>
        </div>

        <form class="auth-form" @submit.prevent="submit">
          <label class="field-block">
            <span>Usuário</span>
            <div class="input-field">
              <i class="bi bi-person"></i>
              <input v-model="user" placeholder="nome.sobrenome" required autocomplete="username">
            </div>
          </label>

          <label class="field-block">
            <span>Senha</span>
            <div class="input-field">
              <i class="bi bi-shield-lock"></i>
              <input v-model="pass" :type="show ? 'text' : 'password'" placeholder="********" required autocomplete="current-password">
              <button type="button" class="toggle" @click="show = !show">{{ show ? 'Ocultar' : 'Mostrar' }}</button>
            </div>
          </label>

          <div class="form-tools">
            <label class="remember">
              <input type="checkbox" v-model="remember">
              <span>Manter sessão ativa</span>
            </label>
            <button type="button" class="ghost-link">Esqueci a senha</button>
          </div>

          <button class="primary-btn" type="submit">
            Entrar no cockpit
            <i class="bi bi-arrow-right"></i>
          </button>
        </form>

      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const emit = defineEmits(['login']);
const user = ref('');
const pass = ref('');
const remember = ref(false);
const show = ref(false);
const lampOn = ref(false);
const lampScene = ref(null);
const lampAngle = ref(0);
const isDragging = ref(false);
const dragStartY = ref(null);

const submit = () => {
  const credentials = {
    abraao: '10203040',
    italo: '10203040',
    mikeias: '10203040'
  };
  const uname = (user.value || '').trim().toLowerCase();
  const pw = (pass.value || '').trim();
  if (!credentials[uname] || credentials[uname] !== pw) {
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Credenciais inválidas', type: 'error' } }));
    return;
  }
  const fakeToken = btoa(`${uname}:${Date.now()}`);
  emit('login', { token: fakeToken, user: user.value, remember: remember.value });
};

const toggleLamp = () => {
  lampOn.value = !lampOn.value;
};

const getPointerPoint = (event) => {
  if (typeof event.clientX === 'number' && typeof event.clientY === 'number') {
    return { x: event.clientX, y: event.clientY };
  }
  const touch = event.touches?.[0] || event.changedTouches?.[0];
  if (touch) {
    return { x: touch.clientX, y: touch.clientY };
  }
  return null;
};

const updateLampAngle = (clientX) => {
  const rect = lampScene.value?.getBoundingClientRect();
  if (!rect || typeof clientX !== 'number') return;
  const ratio = ((clientX - rect.left) / rect.width - 0.5) * 2;
  const nextAngle = Math.max(-22, Math.min(22, ratio * 18));
  lampAngle.value = nextAngle;
};

const startLampDrag = (event) => {
  const point = getPointerPoint(event);
  if (!point) return;
  isDragging.value = true;
  dragStartY.value = point.y;
  updateLampAngle(point.x);
  if (typeof event.pointerId === 'number') {
    event.currentTarget?.setPointerCapture?.(event.pointerId);
  }
};

const dragLamp = (event) => {
  if (!isDragging.value) return;
  const point = getPointerPoint(event);
  if (!point) return;
  updateLampAngle(point.x);
  if (dragStartY.value != null && point.y - dragStartY.value > 35) {
    lampOn.value = true;
  }
};

const endLampDrag = (event) => {
  if (!isDragging.value) return;
  isDragging.value = false;
  dragStartY.value = null;
  releaseLamp();
  if (typeof event?.pointerId === 'number') {
    event.currentTarget?.releasePointerCapture?.(event.pointerId);
  }
};

const releaseLamp = () => {
  lampAngle.value = 0;
};

const lampStyleVars = computed(() => ({
  '--lamp-angle': `${lampAngle.value}deg`,
  '--lamp-sway-x': `${lampAngle.value * 0.8}px`,
  '--lamp-sway-y': `${Math.abs(lampAngle.value) * 0.3}px`,
  '--wire-left-angle': `${-3 + lampAngle.value * 0.2}deg`,
  '--wire-right-angle': `${4 + lampAngle.value * 0.2}deg`,
  '--light-offset': `${lampAngle.value * 1.1}px`
}));
</script>

<style scoped>
:global(:root) {
  font-family: 'Space Grotesk', 'Inter', 'Segoe UI', system-ui, sans-serif;
}

.login-shell {
  min-height: 100vh;
  height: 100vh;
  background: radial-gradient(circle at top, #0f172a, #030712);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(16px, 2.5vw, 48px);
  color: #f8fbff;
}

.ambient {
  position: absolute;
  filter: blur(60px);
  opacity: 0.4;
  pointer-events: none;
}

.ambient-one {
  width: 420px;
  height: 420px;
  background: #2563eb;
  top: 6%;
  left: 12%;
}

.ambient-two {
  width: 520px;
  height: 520px;
  background: #14b8a6;
  bottom: 12%;
  right: 18%;
}

.ambient-three {
  width: 320px;
  height: 320px;
  background: #a855f7;
  bottom: 0;
  left: 30%;
}

.grain {
  position: absolute;
  inset: 0;
  background-image: url('https://www.transparenttextures.com/patterns/asfalt-dark.png');
  opacity: 0.12;
  mix-blend-mode: screen;
}

.login-layout {
  position: relative;
  width: min(1200px, 100%);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: clamp(20px, 3vw, 48px);
  z-index: 1;
  align-items: stretch;
  grid-auto-rows: 1fr;
  height: min(760px, calc(100vh - clamp(32px, 6vh, 120px)));
  max-height: 820px;
  margin: auto;
}

.brand-panel {
  position: relative;
  border-radius: 40px;
  border: 1px solid rgba(148, 163, 184, 0.25);
  box-shadow: 0 50px 120px rgba(2, 6, 23, 0.55);
  overflow: hidden;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: clamp(24px, 3vw, 40px);
  gap: 32px;
  background: radial-gradient(circle at 20% 15%, rgba(37, 99, 235, 0.15), rgba(2, 6, 23, 0.96));
}

.lamp-panel {
  color: #f8fbff;
}

.lamp-scene {
  position: relative;
  width: min(520px, 95%);
  aspect-ratio: 3 / 4;
  border-radius: 32px;
  background: linear-gradient(180deg, #111827 0%, #0b1120 55%, #020617 100%);
  border: 1px solid rgba(148, 163, 184, 0.2);
  box-shadow: inset 0 0 60px rgba(15, 23, 42, 0.4);
  overflow: hidden;
  padding: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  transition: background 0.25s ease, box-shadow 0.25s ease;
  perspective: 1400px;
  --lamp-angle: 0deg;
  --lamp-sway-x: 0px;
  --lamp-sway-y: 0px;
  --wire-left-angle: -3deg;
  --wire-right-angle: 4deg;
  --light-offset: 0px;
}

.lamp-scene.scene-on {
  background: linear-gradient(180deg, #1f2937 0%, #111827 50%, #020617 100%);
  box-shadow: inset 0 0 80px rgba(251, 191, 36, 0.25), 0 30px 60px rgba(2, 6, 23, 0.5);
}

.power-links {
  position: relative;
  width: min(420px, 80%);
  height: 90px;
  margin: clamp(12px, 2vw, 24px) auto 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  pointer-events: none;
  opacity: 0.25;
  transition: opacity 0.3s ease, transform 0.35s ease;
  transform: translateX(calc(var(--lamp-sway-x, 0px) * 0.4));
}

.power-links::before {
  content: '';
  position: absolute;
  width: 120px;
  height: 10px;
  top: -22px;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(148, 163, 184, 0.35), rgba(226, 232, 240, 0.7), rgba(148, 163, 184, 0.35));
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
}

.power-links::after {
  content: '';
  position: absolute;
  width: 220px;
  height: 8px;
  bottom: -24px;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(15, 23, 42, 0.7), rgba(51, 65, 85, 0.8));
  box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.08);
}

.power-links.is-on::after {
  background: linear-gradient(90deg, rgba(253, 224, 71, 0.35), rgba(248, 250, 109, 0.85), rgba(253, 224, 71, 0.35));
  box-shadow: 0 0 25px rgba(253, 224, 71, 0.35);
}

.power-links .link-line {
  position: relative;
  flex: 1;
  margin: 0 8px;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.65), rgba(30, 41, 59, 0.85));
  box-shadow: inset 0 -12px 18px rgba(0, 0, 0, 0.7);
  overflow: hidden;
}

.power-links .link-line::after {
  content: '';
  position: absolute;
  inset: 18px 35%;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(148, 163, 184, 0.25), rgba(59, 130, 246, 0.15));
}

.power-links.is-on {
  opacity: 0.85;
}

.power-links.is-on .link-line {
  background: linear-gradient(180deg, rgba(253, 224, 71, 0.2), rgba(245, 158, 11, 0.5), rgba(251, 191, 36, 0.15));
  box-shadow: 0 0 20px rgba(253, 224, 71, 0.25);
}

.power-links.is-on .link-line::after {
  background: linear-gradient(180deg, rgba(253, 224, 71, 0.9), rgba(251, 146, 60, 0.35));
  box-shadow: 0 0 25px rgba(253, 224, 71, 0.4);
}

.hanging-wires {
  position: absolute;
  top: clamp(10px, 3vw, 26px);
  width: 22px;
  height: 65%;
  display: flex;
  justify-content: space-between;
  pointer-events: none;
  transform: translateX(var(--lamp-sway-x)) translateY(var(--lamp-sway-y));
}

.wire {
  width: 2px;
  height: 100%;
  background: linear-gradient(180deg, rgba(148, 163, 184, 0.9), rgba(30, 41, 59, 0.8));
  border-radius: 999px;
  transform-origin: top;
}

.wire-left {
  transform: rotate(var(--wire-left-angle));
}

.wire-right {
  transform: rotate(var(--wire-right-angle));
}

.lamp-assembly {
  position: relative;
  margin-top: 70px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  filter: drop-shadow(0 15px 25px rgba(0, 0, 0, 0.6));
  transition: transform 0.35s cubic-bezier(0.22, 0.61, 0.36, 1), box-shadow 0.25s ease;
  transform: translateX(var(--lamp-sway-x)) translateY(var(--lamp-sway-y)) rotateZ(var(--lamp-angle)) rotateX(8deg) rotateY(-6deg);
  transform-style: preserve-3d;
  cursor: pointer;
  outline: none;
  touch-action: none;
  user-select: none;
}

.lamp-assembly.is-on {
  transform: translateX(var(--lamp-sway-x)) translateY(calc(var(--lamp-sway-y) + 2px)) rotateZ(var(--lamp-angle)) rotateX(5deg) rotateY(-2deg);
  box-shadow: 0 0 35px rgba(253, 224, 71, 0.4);
}

.lamp-assembly:focus-visible {
  box-shadow: 0 0 0 3px rgba(248, 250, 109, 0.5);
}

.lamp-socket {
  width: 120px;
  height: 26px;
  border-radius: 18px 18px 6px 6px;
  background: linear-gradient(180deg, #111827, #020617);
  border: 1px solid rgba(15, 23, 42, 0.8);
  box-shadow: inset 0 4px 8px rgba(255, 255, 255, 0.06);
}

.lamp-collar {
  width: 90px;
  height: 12px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.3), rgba(148, 163, 184, 0.6));
  border: 1px solid rgba(51, 65, 85, 0.8);
  transform: translateY(-4px);
}

.lamp-shade {
  position: relative;
  width: 220px;
  height: 120px;
  transform: translateY(-20px) translateZ(10px);
}

.shade-shell {
  position: absolute;
  inset: 0;
  border-radius: 45% 45% 65% 65%;
  background: radial-gradient(circle at 30% 10%, rgba(255, 255, 255, 0.2), rgba(15, 23, 42, 0.95));
  border: 1px solid rgba(15, 23, 42, 0.8);
  box-shadow: inset 0 -25px 35px rgba(0, 0, 0, 0.75);
}

.lamp-assembly.is-on .shade-shell {
  box-shadow: inset 0 -20px 45px rgba(249, 115, 22, 0.45);
}

.shade-stripe {
  position: absolute;
  left: 12%;
  right: 12%;
  height: 8px;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.15), rgba(148, 163, 184, 0.2), rgba(255, 255, 255, 0.05));
}

.stripe-one {
  top: 26px;
}

.stripe-two {
  top: 52px;
}

.lamp-glass {
  width: 120px;
  height: 140px;
  border-radius: 60px 60px 40px 40px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.25), rgba(30, 41, 59, 0.85));
  border: 2px solid rgba(226, 232, 240, 0.25);
  display: flex;
  justify-content: center;
  align-items: flex-end;
  padding-bottom: 18px;
  position: relative;
  margin-top: -38px;
  overflow: hidden;
  transition: background 0.25s ease, border 0.25s ease;
}

.lamp-assembly.is-on .lamp-glass {
  background: linear-gradient(180deg, rgba(253, 224, 71, 0.85), rgba(249, 115, 22, 0.35));
  border-color: rgba(253, 224, 71, 0.5);
}

.glass-core {
  width: 65%;
  height: 70%;
  border-radius: 32px;
  background: linear-gradient(180deg, rgba(15, 23, 42, 0.55), rgba(2, 6, 23, 0.9));
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
}

.tube-filament {
  width: 4px;
  height: 32px;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.2), rgba(253, 224, 71, 0.3));
}

.filament-bottom {
  height: 36px;
}

.lamp-assembly.is-on .tube-filament {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.8), rgba(253, 224, 71, 0.95));
  box-shadow: 0 0 12px rgba(253, 224, 71, 0.7);
}

.filament-glow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(253, 224, 71, 0.7), rgba(249, 115, 22, 0.1));
  filter: blur(6px);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.lamp-assembly.is-on .filament-glow {
  opacity: 1;
}

.glass-glint {
  position: absolute;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.7), transparent 60%);
  opacity: 0.5;
  mix-blend-mode: screen;
}

.glint-one {
  top: 24px;
  left: 24px;
}

.glint-two {
  top: 60px;
  right: 20px;
  width: 18px;
  height: 18px;
}

.lamp-tip {
  width: 110px;
  height: 24px;
  border-radius: 50% / 60% 60% 40% 40%;
  background: linear-gradient(180deg, #fde68a, #78350f);
  border: 1px solid rgba(15, 23, 42, 0.85);
  box-shadow: inset 0 6px 12px rgba(255, 255, 255, 0.25);
  display: flex;
  justify-content: center;
  align-items: center;
  transform: translateY(-12px);
}

.tip-glow {
  width: 36px;
  height: 8px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(253, 224, 71, 0.8), transparent 70%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.lamp-assembly.is-on .tip-glow {
  opacity: 1;
}

.light-spill {
  position: absolute;
  top: 190px;
  width: 75%;
  height: 55%;
  border-radius: 50% 50% 35% 35%;
  background: radial-gradient(circle at 50% 0%, rgba(253, 224, 71, 0), rgba(253, 224, 71, 0.08));
  opacity: 0;
  transition: opacity 0.25s ease, transform 0.35s ease;
  pointer-events: none;
  transform: translateX(var(--light-offset));
}

.light-spill.visible {
  opacity: 1;
  background: radial-gradient(circle at 50% 0%, rgba(253, 224, 71, 0.35), rgba(253, 224, 71, 0.06));
}

.floor-glow {
  position: absolute;
  bottom: 36px;
  width: 60%;
  height: 40px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(253, 224, 71, 0.15), transparent 70%);
  opacity: 0;
  transition: opacity 0.25s ease, transform 0.35s ease;
  pointer-events: none;
  transform: translateX(calc(var(--light-offset) * 0.4));
}

.floor-glow.visible {
  opacity: 1;
}

.lamp-info {
  text-align: center;
  max-width: 480px;
  transition: color 0.3s ease;
}

.lamp-label {
  margin: 0;
  font-size: clamp(1.8rem, 4vw, 3rem);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(148, 163, 184, 0.35);
  text-shadow: none;
  transition: color 0.3s ease, text-shadow 0.3s ease;
}

.lamp-copy {
  margin: 12px 0 20px;
  color: rgba(148, 163, 184, 0.4);
  font-size: 0.95rem;
  transition: color 0.3s ease;
}

.lamp-info.info-on .lamp-label {
  color: #f8fbff;
  text-shadow: 0 0 25px rgba(253, 224, 71, 0.45);
}

.lamp-info.info-on .lamp-copy {
  color: rgba(248, 250, 255, 0.85);
}

.form-panel {
  background: rgba(255, 255, 255, 0.98);
  border-radius: 44px;
  padding: clamp(24px, 2.8vw, 44px);
  color: #0f172a;
  box-shadow: 0 60px 120px rgba(2, 6, 23, 0.45);
  display: grid;
  grid-template-rows: auto 1fr;
  gap: 24px;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.form-panel::before {
  content: '';
  position: absolute;
  inset: 0;
  width: 55%;
  border-top-left-radius: inherit;
  border-bottom-left-radius: inherit;
  background: radial-gradient(circle at 0% 50%, rgba(253, 224, 71, 0.45), rgba(249, 115, 22, 0.15) 55%, transparent 80%);
  opacity: 0;
  transform: translateX(-10%);
  transition: opacity 0.35s ease, transform 0.4s ease;
  pointer-events: none;
}

.form-panel.panel-lit::before {
  opacity: 1;
  transform: translateX(0);
}

.form-panel.panel-lit {
  background: linear-gradient(120deg, rgba(255, 255, 255, 0.98), rgba(254, 249, 240, 0.95));
  box-shadow: 0 70px 140px rgba(253, 224, 71, 0.25), 0 20px 45px rgba(15, 23, 42, 0.25);
}

.form-meta .chip {
  display: inline-flex;
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
  font-size: 0.78rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.form-meta h2 {
  margin: 12px 0 6px;
  font-size: 2rem;
}

.form-meta p {
  margin: 0;
  color: #4b5563;
}

.auth-form {
  display: grid;
  grid-auto-rows: min-content;
  gap: 16px;
  align-content: center;
  height: 100%;
}

.field-block span {
  font-size: 0.85rem;
  font-weight: 600;
  color: #6b7280;
}

.input-field {
  margin-top: 6px;
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 20px;
  padding: 0.95rem 1.1rem;
  background: rgba(15, 23, 42, 0.03);
  transition: border 0.15s ease, box-shadow 0.15s ease;
}

.input-field:focus-within {
  border-color: rgba(37, 99, 235, 0.5);
  box-shadow: 0 15px 25px rgba(37, 99, 235, 0.15);
}

.input-field input {
  border: none;
  background: transparent;
  flex: 1;
  font-size: 1rem;
  outline: none;
  color: inherit;
}

.input-field i {
  color: #94a3b8;
  font-size: 1rem;
}

.toggle {
  border: none;
  background: none;
  font-weight: 600;
  color: #2563eb;
  cursor: pointer;
}

.form-tools {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  gap: 12px;
}

.remember {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #4b5563;
}

.remember input {
  width: 16px;
  height: 16px;
}

.ghost-link {
  border: none;
  background: none;
  color: #0f172a;
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
}

.primary-btn {
  width: 100%;
  border: none;
  border-radius: 26px;
  padding: 1rem 1.2rem;
  font-size: 1.05rem;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(120deg, #2563eb, #7c3aed);
  box-shadow: 0 30px 50px rgba(99, 102, 241, 0.35);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.primary-btn:hover {
  transform: translateY(-3px);
  box-shadow: 0 36px 60px rgba(37, 99, 235, 0.4);
}

@media (max-width: 1024px) {
  .login-layout {
    grid-template-columns: 1fr;
    height: auto;
    max-height: none;
  }
  .login-shell {
    height: auto;
    min-height: 100vh;
  }
  .brand-panel,
  .form-panel {
    height: auto;
  }
  .form-panel {
    order: -1;
  }
}

@media (max-width: 600px) {
  .login-shell {
    padding: 16px;
  }
  .brand-panel,
  .form-panel {
    border-radius: 32px;
    padding: 24px;
  }
  .brand-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .form-tools {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
}
</style>
