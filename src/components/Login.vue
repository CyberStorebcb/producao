<template>
  <div class="login-stage">
    <div class="stage-gradient"></div>
    <div class="stage-noise"></div>
    <div class="stage-grid"></div>
    <div class="stage-pulse"></div>
    <div class="stage-particles">
      <span v-for="p in particles" :key="p.id" class="particle" :style="p.style"></span>
    </div>

    <div class="login-frame">
      <section class="preview">
        <div class="preview-header">
          <div class="preview-icon"><i class="bi bi-truck"></i></div>
          <div>
            <p class="eyebrow">Central logística</p>
            <h1>Planeje, monitore e acelere a produção.</h1>
          </div>
        </div>
        <p class="preview-copy">
          Use dashboards responsivos e alertas inteligentes para saber qual lote precisa da sua atenção. Tudo sincronizado com a operação em campo.
        </p>

        <button class="preview-cta" @click="scrollToLogin">
          Começar login
          <i class="bi bi-arrow-down"></i>
        </button>

        <div class="preview-widgets">
          <article class="widget live">
            <header>
              <span>Portal seguro</span>
              <strong>Single Sign-On</strong>
            </header>
            <div class="pulse-bar decorative">
              <span></span>
              <span></span>
              <span></span>
              <span></span>
              <span></span>
            </div>
            <footer>Autenticação criptografada</footer>
          </article>

          <article class="widget gradient-card">
            <div class="badge">Nova sessão</div>
            <h3>Conecte-se</h3>
            <p>Desbloqueie o cockpit de produção com credenciais válidas.</p>
          </article>
        </div>
      </section>

      <section class="auth" ref="authSection">
        <header>
          <p>Entrar</p>
          <h2>Área do gestor</h2>
          <small>Informe credenciais para desbloquear o cockpit operacional.</small>
        </header>
        <form @submit.prevent="submit">
          <label>
            <span>Usuário</span>
            <div class="field">
              <i class="bi bi-person"></i>
              <input v-model="user" placeholder="nome.sobrenome" required autocomplete="username">
            </div>
          </label>

          <label>
            <span>Senha</span>
            <div class="field">
              <i class="bi bi-shield-lock"></i>
              <input v-model="pass" :type="show ? 'text' : 'password'" placeholder="********" required autocomplete="current-password">
              <button type="button" class="ghost" @click="show = !show" tabindex="-1">{{ show ? 'Ocultar' : 'Mostrar' }}</button>
            </div>
          </label>

          <div class="form-tools">
            <label class="remember">
              <input type="checkbox" v-model="remember">
              <span>Manter sessão ativa</span>
            </label>
            <a href="#">Esqueci a senha</a>
          </div>

          <button class="primary" type="submit">
            Iniciar sessão
            <i class="bi bi-arrow-right"></i>
          </button>
        </form>

      </section>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
const emit = defineEmits(['login']);
const user = ref('');
const pass = ref('');
const remember = ref(false);
const show = ref(false);
const authSection = ref(null);

const particles = Array.from({ length: 14 }, (_, idx) => ({
  id: idx,
  style: {
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    animationDelay: `${Math.random() * 6}s`
  }
}));

const submit = () => {
  const credentials = {
    'abraao': '10203040',
    'italo': '10203040',
    'mikeias': '10203040'
  };
  const uname = (user.value || '').trim().toLowerCase();
  const pw = (pass.value || '').trim();
  if (!credentials[uname] || credentials[uname] !== pw) {
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Credenciais inválidas', type: 'error' } }));
    return;
  }
  const fakeToken = btoa(`${uname}:${Date.now()}`);
  emit('login', { token: fakeToken, user: user.value });
};

const scrollToLogin = () => {
  if (authSection.value) authSection.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
};
</script>

<style scoped>
:global(:root) {
  font-family: 'Space Grotesk', 'Segoe UI', system-ui, -apple-system, sans-serif;
}

.login-stage {
  min-height: 100vh;
  background: #04070f;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(16px, 3vw, 64px);
  color: #f5f7ff;
}

.stage-gradient,
.stage-noise,
.stage-grid,
.stage-pulse,
.stage-particles {
  position: absolute;
  inset: 0;
}

.stage-gradient {
  background: radial-gradient(circle at 20% 20%, rgba(0,94,234,0.6), transparent 55%),
              radial-gradient(circle at 80% 30%, rgba(62,198,224,0.5), transparent 50%),
              #04070f;
}

.stage-noise {
  background-image: url('https://www.transparenttextures.com/patterns/asfalt-dark.png');
  opacity: 0.15;
}

.stage-grid {
  background-image: linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px);
  background-size: 140px 140px;
  mask-image: radial-gradient(circle at center, rgba(0,0,0,0.7), transparent 78%);
}

.stage-pulse {
  background: radial-gradient(circle at center, rgba(255,255,255,0.08), transparent 40%);
  animation: pulse 6s ease-in-out infinite;
}

.stage-particles {
  pointer-events: none;
}

.particle {
  position: absolute;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: rgba(255,255,255,0.6);
  animation: drift 8s linear infinite;
}

.login-frame {
  width: min(1280px, 100%);
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
  gap: clamp(20px, 3vw, 48px);
  position: relative;
  z-index: 2;
  padding: clamp(12px, 2vw, 24px);
}

.preview {
  background: rgba(6,11,30,0.85);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 32px;
  padding: clamp(24px, 3vw, 48px);
  box-shadow: 0 44px 80px rgba(0,0,0,0.62);
  display: flex;
  flex-direction: column;
  gap: 26px;
  min-height: 100%;
}

.preview-header {
  display: flex;
  gap: 16px;
  align-items: center;
}

.preview-icon {
  width: 64px;
  height: 64px;
  border-radius: 18px;
  background: linear-gradient(140deg,#00a9ff,#005bea);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.28em;
  font-size: 0.75rem;
  margin: 0 0 6px;
  color: rgba(255,255,255,0.65);
}

.preview h1 {
  margin: 0;
  font-size: clamp(1.9rem, 3vw, 2.6rem);
  line-height: 1.2;
}

.preview-copy {
  margin: 0;
  color: rgba(255,255,255,0.74);
  line-height: 1.75;
  max-width: 540px;
}

.preview-widgets {
  display: grid;
  gap: 18px;
}

.preview-cta {
  align-self: flex-start;
  border: none;
  border-radius: 999px;
  padding: 0.7rem 1.5rem;
  color: #fff;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  background: rgba(255,255,255,0.12);
  backdrop-filter: blur(6px);
  display: inline-flex;
  align-items: center;
  gap: 0.6rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.preview-cta:hover {
  background: rgba(255,255,255,0.2);
}


.widget {
  border-radius: 22px;
  padding: 20px;
  background: rgba(7,16,44,0.82);
  border: 1px solid rgba(255,255,255,0.06);
}

.widget.live header {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  color: rgba(255,255,255,0.7);
}

.widget.live strong {
  font-size: 1.1rem;
}

.pulse-bar {
  display: flex;
  gap: 8px;
  margin: 14px 0;
}

.pulse-bar span {
  flex: 1;
  height: 32px;
  border-radius: 12px;
  background: linear-gradient(180deg,rgba(0,190,255,0.65),rgba(0,94,234,0.8));
  animation: barPulse 1.4s ease-in-out infinite;
}

.pulse-bar span:nth-child(2) { animation-delay: 0.1s; }
.pulse-bar span:nth-child(3) { animation-delay: 0.2s; }
.pulse-bar span:nth-child(4) { animation-delay: 0.3s; }
.pulse-bar span:nth-child(5) { animation-delay: 0.4s; }

.widget.live footer {
  font-size: 0.8rem;
  color: rgba(255,255,255,0.55);
}


.gradient-card {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  color: #fff;
  background: linear-gradient(135deg, rgba(0,164,255,0.4), rgba(0,79,212,0.85));
  border: 1px solid rgba(255,255,255,0.15);
}

.gradient-card .badge {
  display: inline-flex;
  align-self: flex-start;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 0.75rem;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  background: rgba(255,255,255,0.18);
}

.gradient-card h3 {
  margin: 0;
  font-size: 1.4rem;
}

.gradient-card p {
  margin: 0;
  color: rgba(255,255,255,0.78);
}

.auth {
  background: rgba(255,255,255,0.98);
  border-radius: 36px;
  padding: clamp(28px, 3vw, 48px);
  color: #101526;
  box-shadow: 0 48px 96px rgba(0,0,0,0.45);
  min-height: 100%;
}

.auth header p {
  margin: 0;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  font-size: 0.75rem;
  color: #7a7f92;
}

.auth header h2 {
  margin: 6px 0 4px;
  font-size: 2rem;
}

.auth header small {
  color: #7a7f92;
}

.auth form {
  display: flex;
  flex-direction: column;
  gap: 18px;
  margin-top: 22px;
}

.auth label {
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.9rem;
  color: #60657a;
}

.field {
  display: flex;
  align-items: center;
  gap: 12px;
  border: 1px solid rgba(9,11,25,0.12);
  border-radius: 18px;
  padding: 0.95rem 1.1rem;
  background: rgba(9,11,25,0.035);
  transition: border 0.15s ease, box-shadow 0.15s ease;
}

.field:focus-within {
  border-color: rgba(0,91,234,0.35);
  box-shadow: 0 8px 20px rgba(0,91,234,0.1);
}

.field input {
  border: none;
  background: transparent;
  flex: 1;
  font-size: 1rem;
  outline: none;
}

.field i { color: #858ba0; }

.ghost {
  border: none;
  background: none;
  color: #005bea;
  font-weight: 600;
  cursor: pointer;
}

.form-tools {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
  gap: 12px;
}

.primary {
  width: 100%;
  border: none;
  border-radius: 22px;
  padding: 1rem 1.2rem;
  font-size: 1.05rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: #fff;
  background: linear-gradient(120deg,#0036ff,#00a8ff);
  box-shadow: 0 26px 46px rgba(0,75,255,0.35);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  cursor: pointer;
  margin-top: 10px;
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}
.primary:hover {
  transform: translateY(-3px);
  box-shadow: 0 32px 56px rgba(0,75,255,0.4);
}

.demo-tip {
  margin-top: 18px;
  font-size: 0.85rem;
  color: #6a7084;
  line-height: 1.5;
}

@keyframes pulse {
  0%, 100% { opacity: 0.1; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(1.05); }
}

@keyframes drift {
  0% { transform: translate3d(0,0,0); opacity: 0; }
  20% { opacity: 1; }
  100% { transform: translate3d(40px,-30px,0); opacity: 0; }
}

@keyframes barPulse {
  0%, 100% { transform: scaleY(0.35); opacity: 0.5; }
  50% { transform: scaleY(1); opacity: 1; }
}

@media (max-width: 1024px) {
  .login-frame {
    grid-template-columns: 1fr;
    padding: 0;
  }
  .preview, .auth {
    border-radius: 28px;
  }
  .auth { order: -1; }
}

@media (max-width: 600px) {
  .login-stage { padding: 16px; }
  .preview, .auth {
    padding: 22px;
    border-radius: 24px;
  }
  .preview-header { flex-direction: column; align-items: flex-start; }
}
</style>
