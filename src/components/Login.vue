<template>
  <div class="login-page d-flex align-items-center justify-content-center">
    <div class="login-wrap">
      <div class="brand mb-4 text-center">
        <div class="brand-badge"><i class="bi bi-truck" style="font-size:26px;"></i></div>
        <h2 class="brand-title">GOMAN BACABAL</h2>
        <p class="text-muted small">CONTROLE E MONITORAMENTO</p>
      </div>

      <div class="card login-card p-4 shadow-sm">
        <form @submit.prevent="submit">
          <div class="mb-3 input-group">
            <span class="input-group-text"><i class="bi bi-person-fill"></i></span>
            <input v-model="user" class="form-control" placeholder="Usuário" required autocomplete="username" />
          </div>

          <div class="mb-3 input-group">
            <span class="input-group-text"><i class="bi bi-lock-fill"></i></span>
            <input v-model="pass" :type="show ? 'text' : 'password'" class="form-control" placeholder="Senha" required autocomplete="current-password" />
            <button type="button" class="btn btn-outline-secondary btn-sm" @click="show = !show" tabindex="-1">{{ show ? 'Ocultar' : 'Mostrar' }}</button>
          </div>

          <div class="d-flex justify-content-between align-items-center mb-3">
            <div class="form-check">
              <input class="form-check-input" type="checkbox" id="remember" v-model="remember">
              <label class="form-check-label small text-muted" for="remember">Lembrar-me</label>
            </div>
            <a class="small" href="#">Esqueceu a senha?</a>
          </div>

          <button class="btn btn-primary w-100 btn-submit" type="submit">Entrar</button>
        </form>

        <div class="mt-3 text-center text-muted small">Use qualquer credencial para teste — tela de demo.</div>
      </div>
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
</script>

<style scoped>
.login-page { min-height: 100vh; background: linear-gradient(180deg,#071029 0%, #0b1220 100%); display:flex; }
.login-wrap { width: 100%; max-width: 480px; padding: 28px; }
.brand { color: #e6f0fb; }
.brand-badge { width:72px; height:72px; margin:0 auto 8px auto; border-radius:14px; background: linear-gradient(90deg,#0d6efd,#3ec6e0); display:flex; align-items:center; justify-content:center; color:#fff; font-weight:700; font-size:20px; box-shadow: 0 8px 28px rgba(13,110,253,0.18);} 
.brand-title { margin:0; color:#fff; font-weight:700; }
.login-card { border-radius:12px; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.04); padding:22px; }
.input-group-text { background: transparent; border-right: 0; color: #9aa6b2; }
.form-control { background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); color: #e9eef6; }
.form-control::placeholder { color: #98a6b3; }
.btn-submit { background: linear-gradient(90deg,#0d6efd,#3ec6e0); border: none; }
.btn-submit:hover { filter: brightness(0.95); }
.text-muted { color: #98a6b3 !important; }

@media (max-width: 600px) {
  .login-wrap { padding: 18px; }
  .brand-badge { width:60px; height:60px; }
}
</style>
