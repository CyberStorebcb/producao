<template>
  <div class="equipes-page">
    <div class="container-fluid py-4">
      <div class="page-header mb-4">
        <div class="page-hero">
          <div class="brand-icon shadow-sm">
            <i class="bi bi-person-badge-fill"></i>
          </div>
          <p class="hero-kicker">Operações em campo</p>
          <h1 class="hero-title text-main">Gestão de Escalas</h1>
          <p class="hero-subtitle text-sub">Coordene equipes e plantões em tempo real</p>
        </div>

        <div class="control-bar">
          <div class="control-stack">
            <div class="control-field">
              <i class="bi bi-diagram-3"></i>
              <select v-model="selectedEquipeFilter" class="control-select">
                <option value="">Todas as Equipes</option>
                <option v-for="eq in equipes" :key="eq.prefixo" :value="eq.prefixo">{{ eq.prefixo }} — {{ eq.placa }}</option>
              </select>
            </div>
            <div class="control-field">
              <i class="bi bi-people"></i>
              <select v-model="selectedFuncaoFilter" class="control-select">
                <option value="">Todas as Funções</option>
                <option v-for="funcao in funcoesDisponiveis" :key="funcao" :value="funcao">{{ funcao }}</option>
              </select>
            </div>
            <div class="control-field control-field--search">
              <i class="bi bi-search"></i>
              <input v-model="searchQuery" type="text" class="control-input" placeholder="Buscar colaborador..." />
            </div>
          </div>
          <div class="control-actions">
            <button class="pill-btn primary" @click="openAddMembro(null)">
              <i class="bi bi-plus-lg"></i>
              <span>Novo Registro</span>
            </button>
            <button class="pill-btn outline" @click="saveAll">
              <i class="bi bi-cloud-arrow-up"></i>
              <span>Salvar no arquivo</span>
            </button>
            <button class="pill-btn ghost" @click="reloadFromFile">
              <i class="bi bi-arrow-repeat"></i>
              <span>Recarregar</span>
            </button>
            <button class="pill-btn ghost" @click="toggleLideranca">
              <i :class="['bi', showLideranca ? 'bi-eye-slash' : 'bi-eye']"></i>
              <span>{{ showLideranca ? 'Ocultar Liderança' : 'Mostrar Liderança' }}</span>
            </button>
            <button class="pill-btn success" @click="exportExcel">
              <i class="bi bi-file-earmark-excel"></i>
              <span>Exportar Excel</span>
            </button>
            <button class="pill-btn ghost" @click="exportPdf">
              <i class="bi bi-filetype-pdf"></i>
              <span>Exportar PDF</span>
            </button>
          </div>
        </div>
      </div>

      <div class="teams-grid">   
        <div v-for="({ equipe, categorias, filteredMembers }) in visibleEquipes" :key="equipe.prefixo" class="team-card shadow-sm">
          
          <div class="team-header" @click="toggleEquipe(equipe.prefixo)" role="button">
            <button class="btn btn-sm btn-outline-secondary follow-btn" :class="{ 'btn-primary text-white': isFollowed(equipe.prefixo) }" @click.stop="toggleFollow(equipe.prefixo)" title="Acompanhar">
              <i :class="isFollowed(equipe.prefixo) ? 'bi bi-star-fill' : 'bi bi-star'"></i>
            </button>
            <div class="team-heading-content text-center" :class="{ 'is-collapsed': !expandedEquipes[equipe.prefixo] }">
              <span class="team-prefix-display">{{ equipe.prefixo }}</span>
              <div class="team-plate-display">
                <i class="bi bi-truck"></i>
                <span>{{ equipe.placa }}</span>
              </div>
            </div>
            <i :class="['bi', expandedEquipes[equipe.prefixo] ? 'bi-chevron-up' : 'bi-chevron-down', 'chevron-icon']"></i>
          </div>

          <transition name="expand">
            <div v-if="expandedEquipes[equipe.prefixo]" class="team-content border-top">
              <template v-if="filteredMembers.length">
                <div class="cargo-grid">
                  <div v-for="categoria in categorias" :key="categoria.titulo" class="cargo-group">
                    <div class="cargo-divider">
                      <div class="cargo-headings">
                        <span class="cargo-title text-uppercase small fw-bold">{{ categoria.titulo }}</span>
                        <span class="cargo-count">{{ categoria.lista.length }} colaboradores</span>
                      </div>
                    </div>

                    <div
                      v-for="membro in categoria.lista"
                      :key="membro.chapa"
                      class="member-card rounded"
                      draggable="true"
                      @dragstart="onDragStart($event, membro, equipe)"
                      @dragend="onDragEnd"
                      @dragover.prevent
                      @dragenter.prevent="onDragEnter($event)"
                      @dragleave.prevent="onDragLeave($event)"
                      @drop.prevent="onDropReplaceMember($event, equipe, membro)"
                    >
                      <div class="avatar-sm">{{ getInitials(membro.colaborador) }}</div>
                      <div class="member-info">
                        <div class="member-name-row">
                          <span class="member-name text-main">{{ membro.colaborador }}</span>
                          <button
                            type="button"
                            class="btn-icon-copy"
                            title="Copiar dados"
                            @click.stop="copyMembroDados(membro)"
                          >
                            <i class="bi bi-clipboard"></i>
                          </button>
                        </div>
                        <div class="text-sub small">{{ membro.funcao }}</div>
                        <div class="member-tags">
                          <span class="tag">Chapa {{ membro.chapa }}</span>
                        </div>
                      </div>
                      <div class="actions d-flex gap-1">
                        <button class="btn btn-icon-edit" @click.stop="openEditMembro(equipe, membro)" title="Editar">
                          <i class="bi bi-pencil"></i>
                        </button>
                        <button class="btn btn-icon-delete" @click.stop="removeMembro(equipe, membro)" title="Excluir">
                          <i class="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
              <div v-else class="empty-filter-state">
                <i class="bi bi-funnel"></i>
                <p>Nenhum colaborador com a função selecionada nesta equipe.</p>
              </div>

            </div>
          </transition>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showMembroModal" class="modal-overlay" @click.self="closeMembroModal">
        <div class="modal-content animate__animated animate__fadeInUp">
          <div class="modal-header">
            <h5 class="fw-bold m-0 text-main">
              <i class="bi bi-person-lines-fill me-2"></i>
              {{ editingMembro ? 'Editar Colaborador' : 'Novo Registro' }}
            </h5>
            <button class="btn-close" @click="closeMembroModal"></button>
          </div>
          <div class="modal-body">
             <form @submit.prevent="onSubmitMembro">
               <div class="mb-3">
                 <label class="form-label fw-bold text-main" for="chapa">Chapa</label>
                 <input id="chapa" name="chapa" v-model="membroForm.chapa" type="text" class="form-control" required>
               </div>
               <div class="mb-3">
                 <label class="form-label fw-bold text-main" for="colaborador">Nome Completo</label>
                 <input id="colaborador" name="colaborador" v-model="membroForm.colaborador" type="text" class="form-control" required>
               </div>
               <div class="mb-3">
                 <label class="form-label fw-bold text-main" for="equipe">Equipe</label>
                 <select id="equipe" name="equipe" v-model="membroForm.equipe" class="form-select" required>
                   <option v-for="eq in equipes" :key="eq.prefixo" :value="eq.prefixo">{{ eq.prefixo }} — {{ eq.placa }}</option>
                 </select>
               </div>
               <div class="mb-3">
                 <label class="form-label fw-bold text-main" for="funcao">Função</label>
                 <select id="funcao" name="funcao" v-model="membroForm.funcao" class="form-select" required>
                     <option value="ENCARREGADO OPERACIONAL">Encarregado Operacional</option>
                     <option value="SUPERVISOR OPERACIONAL">Supervisor Operacional</option>
                     <option value="MOTORISTA OP. DE GUINCHO">Motorista Op. de Guincho</option>
                     <option value="ELETRICISTA">Eletricista</option>
                     <option value="AUXILIAR DE ELETRICISTA">Auxiliar de Eletricista</option>
                     <option value="AUXILIAR PROJETISTA">Auxiliar Projetista</option>
                 </select>
               </div>
               <div class="d-flex gap-2 mt-4">
                 <button type="button" class="btn btn-light w-50" @click="closeMembroModal">Cancelar</button>
                 <button type="submit" class="btn btn-primary w-50">Salvar Registro</button>
               </div>
             </form>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Generic confirm dialog -->
    <Teleport to="body">
      <div v-if="confirmVisible" class="modal-overlay" @click.self="confirmNo">
        <div class="modal-content animate__animated animate__fadeInUp">
          <div class="modal-header">
            <h5 class="fw-bold m-0 text-main">
              <i class="bi bi-question-circle me-2"></i>
              Confirmação
            </h5>
            <button class="btn-close" @click="confirmNo"></button>
          </div>
          <div class="modal-body">
            <p class="text-center mb-2">{{ confirmMessage }}</p>
            <div class="d-flex gap-2 mt-4">
              <button class="btn btn-light w-50" @click="confirmNo">Cancelar</button>
              <button class="btn btn-primary w-50" @click="confirmYes">Confirmar</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Modal de confirmação para mover/trocar -->
    <Teleport to="body">
      <div v-if="swapDialogVisible" class="modal-overlay" @click.self="cancelSwap">
        <div class="modal-content animate__animated animate__fadeInUp">
          <div class="modal-header">
            <h5 class="fw-bold m-0 text-main">
              <i class="bi bi-arrow-left-right me-2"></i>
              Confirmação de Troca
            </h5>
            <button class="btn-close" @click="cancelSwap"></button>
          </div>
          <div class="modal-body">
            <div class="swap-preview d-flex align-items-center justify-content-center gap-3 mb-3">
              <div class="game-card text-center" :class="{ 'anim-swap-left': swapAnimating }">
                <div class="avatar-game">{{ swapPayload?.membro ? getInitials(swapPayload.membro.colaborador) : '' }}</div>
                <div class="name-game">{{ swapPayload?.membro ? swapPayload.membro.colaborador : '' }}</div>
                <div class="muted equipe-label">{{ swapPayload?.equipe ? swapPayload.equipe.prefixo : '' }}</div>
              </div>

              <div class="vs-badge">↔</div>

              <div class="game-card text-center" :class="{ 'anim-swap-right': swapAnimating }">
                <div class="avatar-game">{{ swapPayload?.targetMembro ? getInitials(swapPayload.targetMembro.colaborador) : '' }}</div>
                <div class="name-game">{{ swapPayload?.targetMembro ? swapPayload.targetMembro.colaborador : '' }}</div>
                <div class="muted equipe-label">{{ swapPayload?.targetEquipe ? swapPayload.targetEquipe.prefixo : '' }}</div>
              </div>
            </div>

            <p class="text-center mb-2" v-if="swapPayload && swapPayload.type === 'swap'">
              Confirme a troca entre os colaboradores.
            </p>
            <p class="text-center mb-2" v-else-if="swapPayload && swapPayload.type === 'move'">
              Confirme a movimentação do colaborador.
            </p>

            <div class="d-flex gap-2 mt-4">
              <button class="btn btn-light w-50" @click="cancelSwap">Cancelar</button>
              <button class="btn btn-primary w-50" @click="confirmSwap">Confirmar</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- footer controls removed (duplicate search / new register) -->
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import initialEquipes from '../data/equipes.js';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

const STORAGE_KEY = 'equipes_local_v1';

const getStoredEquipes = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Erro ao carregar equipes do localStorage', e);
    return null;
  }
};

const saveToStorage = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Erro ao salvar equipes no localStorage', e);
  }
};

const saveToLocalFile = async () => {
  try {
    const resp = await fetch('http://localhost:5176/save-equipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(equipes.value)
    });
    if (!resp.ok) {
      const errorText = await resp.text();
      const msg = `Falha ao gravar arquivo local: ${resp.statusText} - ${errorText}`;
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: msg, type: 'error' } }));
      return false;
    }
    const j = await resp.json();
    if (j.ok) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Dados gravados localmente com sucesso.', type: 'success' } }));
      return true;
    } else {
      console.error('saveToLocalFile error', j);
      const msg = j && j.error ? j.error : 'Falha ao gravar arquivo local.';
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Falha ao gravar arquivo: ' + msg, type: 'error' } }));
      return false;
    }
  } catch (e) {
    console.error(e);
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Erro ao conectar ao servidor local. Verifique se "npm run persist" está rodando.', type: 'error' } }));
    return false;
  }
};

const saveToGitHub = async () => {
  try {
    const resp = await fetch('/api/save-equipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ equipes: equipes.value })
    });
    if (!resp.ok) {
      const errorText = await resp.text();
      const msg = `Falha ao gravar arquivo remoto: ${resp.statusText} - ${errorText}`;
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: msg, type: 'error' } }));
      return;
    }
    const j = await resp.json();
    if (j.ok) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Dados gravados em src/data/equipes.js no repositório (GitHub).', type: 'success' } }));
    } else {
      console.error('saveToGitHub error', j);
      const msg = j && j.error ? (j.error.detail || j.error) : 'Falha ao gravar arquivo remoto.';
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Falha ao gravar arquivo: ' + msg, type: 'error' } }));
    }
  } catch (e) {
    console.error(e);
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Erro ao conectar ao servidor de persistência remota. Verifique variáveis de ambiente do Vercel.', type: 'error' } }));
  }
};

const saveAll = async () => {
  const localSuccess = await saveToLocalFile();
  if (localSuccess) {
    await saveToGitHub();
  }
};

// Recarrega equipes diretamente do arquivo de dados (descarta estado salvo no localStorage)
const reloadFromFile = async () => {
  const ok = await showConfirm('Recarregar equipes do arquivo irá descartar mudanças locais. Continuar?');
  if (!ok) return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(FOLLOW_KEY);
  } catch (e) {}
  equipes.value = JSON.parse(JSON.stringify(initialEquipes));
  followedEquipes.value = getFollowedFromStorage();
  try { saveToStorage(equipes.value); saveFollowedToStorage(followedEquipes.value); } catch (e) {}
  window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Equipes recarregadas do arquivo.', type: 'success' } }));
};

const toggleLideranca = () => {
  showLideranca.value = !showLideranca.value;
  if (showLideranca.value) expandedEquipes.value['LIDERANCA'] = true;
};

// Exportar Excel usando xlsx
const exportExcel = async () => {
  try {
    const workbook = new ExcelJS.Workbook();
    const teams = (equipes && equipes.value ? equipes.value : []);
    if (!teams || teams.length === 0) { window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Nenhum dado para exportar.', type: 'info' } })); return; }

    const ws = workbook.addWorksheet('Equipes');
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    ws.columns = [
      { header: 'EQUIPE', key: 'chapa', width: 12 },
      { header: 'NOME', key: 'colaborador', width: 48 },
      { header: 'Função', key: 'funcao', width: 28 }
    ];

    let currentRow = 1;
    // color and border settings
    const TITLE_FILL = 'FF2E75B6'; // darker blue for title
    const HEADER_FILL = 'FF4F81BD'; // header blue
    const HEADER_BORDER_STYLE = 'medium';

    teams.forEach((eq, tIndex) => {
      // title row with prefixo — placa (merged across A:C)
      const titleText = `${eq.prefixo} — ${eq.placa || ''}`;
      const titleRow = ws.addRow([titleText, '', '']);
      const titleRowIndex = titleRow.number;
      try { ws.mergeCells(`A${titleRowIndex}:C${titleRowIndex}`); } catch (e) {}
      // style title
      titleRow.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      titleRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      titleRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: TITLE_FILL } };
      titleRow.getCell(1).border = { top: { style: HEADER_BORDER_STYLE }, left: { style: HEADER_BORDER_STYLE }, bottom: { style: HEADER_BORDER_STYLE }, right: { style: HEADER_BORDER_STYLE } };

      // add header for this team
      const header = ws.addRow(['EQUIPE', 'NOME', 'Função']);
      header.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = { top: { style: HEADER_BORDER_STYLE }, left: { style: HEADER_BORDER_STYLE }, bottom: { style: HEADER_BORDER_STYLE }, right: { style: HEADER_BORDER_STYLE } };
      });
      currentRow = ws.rowCount;

      const grupos = agruparPorCargo(eq.membros || []);
      if (!grupos || grupos.length === 0) {
        const r = ws.addRow(['(sem membros)', '', '']);
        r.eachCell((cell) => { cell.border = { left: { style: 'thin' }, right: { style: 'thin' } }; cell.alignment = { horizontal: 'center', vertical: 'middle' }; });
      } else {
        grupos.forEach(g => {
          g.lista.forEach(m => {
            const row = ws.addRow([m.chapa || '', m.colaborador || '', m.funcao || '']);
            const rIndex = row.number;
            const isEven = (rIndex % 2) === 0;
            const fillColor = isEven ? 'FFDCE6F1' : 'FFFFFFFF';
            row.eachCell((cell) => {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillColor } };
              cell.border = { left: { style: 'thin' }, right: { style: 'thin' }, bottom: { style: 'thin' } };
              cell.alignment = { horizontal: 'center', vertical: 'middle' };
            });
          });
        });
      }

      // add an empty spacer row after each team (except last)
      if (tIndex < teams.length - 1) {
        const spacer = ws.addRow([]);
        spacer.eachCell((cell) => { cell.border = { left: { style: 'thin' }, right: { style: 'thin' } }; });
      }
    });

    // apply autofilter across full data range
    try { ws.autoFilter = { from: { row: 1, col: 1 }, to: { row: ws.rowCount, col: 3 } }; } catch (e) {}

    const name = `equipes_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.xlsx`;
    const buf = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch (e) { console.error(e); window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Erro ao exportar Excel: ' + e.message, type: 'error' } })); }
};

// Exportar PDF via janela de impressão (o usuário pode salvar como PDF)
const exportPdf = () => {
  try {
    // Always export teams in the current `equipes` order
    const items = equipes.value;
    if (!items || items.length === 0) { window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Nenhum dado para exportar.', type: 'info' } })); return; }
    let html = `<!doctype html><html><head><meta charset="utf-8"><title>Equipes</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px;color:#111}h2{margin:8px 0 6px}table{width:100%;border-collapse:collapse;margin-bottom:18px}th,td{border:1px solid #ddd;padding:6px;font-size:12px;text-align:left}th{background:#4F81BD;color:#fff;font-weight:700}</style></head><body>`;
    items.forEach(eq => {
      html += `<h2>${eq.prefixo} — ${eq.placa}</h2>`;
      html += '<table><thead><tr><th>Chapa</th><th>Colaborador</th><th>Função</th></tr></thead><tbody>';
      const grupos = agruparPorCargo(eq.membros || []);
      if (!grupos || grupos.length === 0) html += '<tr><td colspan="3">(sem membros)</td></tr>';
      else grupos.forEach(g => g.lista.forEach(m => { html += `<tr><td>${m.chapa}</td><td>${m.colaborador}</td><td>${m.funcao}</td></tr>`; }));
      html += '</tbody></table>';
    });
    html += '</body></html>';
    const w = window.open('', '_blank');
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); }, 500);
  } catch (e) { console.error(e); window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Erro ao exportar PDF: ' + e.message, type: 'error' } })); }
};

// ESTADOS REATIVOS
const searchQuery = ref('');
const selectedEquipeFilter = ref('');
const selectedFuncaoFilter = ref('');
const expandedEquipes = ref({});
const showLideranca = ref(false);
const showMembroModal = ref(false);
const editingEquipe = ref(null);
const editingMembro = ref(null);
const membroForm = ref({ chapa: '', colaborador: '', funcao: '', equipe: '' });
const draggedMembro = ref(null);
const swapDialogVisible = ref(false);
const swapPayload = ref(null);
const swapAnimating = ref(false);
const moveAnimating = ref(false);
// generic confirm dialog state
const confirmVisible = ref(false);
const confirmMessage = ref('');
let confirmResolve = null;

const showConfirm = (msg) => {
  return new Promise((resolve) => {
    confirmMessage.value = msg;
    confirmVisible.value = true;
    confirmResolve = resolve;
  });
};

const confirmYes = () => {
  confirmVisible.value = false;
  if (confirmResolve) confirmResolve(true);
  confirmResolve = null;
};

const confirmNo = () => {
  confirmVisible.value = false;
  if (confirmResolve) confirmResolve(false);
  confirmResolve = null;
};

// SEGUINDO EQUIPES (persistido no localStorage)
const FOLLOW_KEY = 'equipes_followed_v1';
const getFollowedFromStorage = () => {
  try {
    const raw = localStorage.getItem(FOLLOW_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Erro ao carregar equipes seguidas', e);
    return [];
  }
};
const saveFollowedToStorage = (data) => {
  try { localStorage.setItem(FOLLOW_KEY, JSON.stringify(data)); } catch (e) { console.error('Erro ao salvar equipes seguidas', e); }
};
const followedEquipes = ref(getFollowedFromStorage());
const isFollowed = (prefixo) => followedEquipes.value.includes(prefixo);
const toggleFollow = (prefixo) => {
  const idx = followedEquipes.value.indexOf(prefixo);
  if (idx === -1) followedEquipes.value.push(prefixo);
  else followedEquipes.value.splice(idx, 1);
  saveFollowedToStorage(followedEquipes.value);
};

// BANCO DE DADOS (TODAS AS EQUIPES) - import externo para facilitar manutenção
const equipes = ref(getStoredEquipes() || JSON.parse(JSON.stringify(initialEquipes)));

const funcoesDisponiveis = computed(() => {
  const set = new Set();
  equipes.value.forEach(eq => (eq.membros || []).forEach(m => m.funcao && set.add(m.funcao)));
  return Array.from(set).sort();
});

// persist changes to localStorage
watch(equipes, (nv) => {
  saveToStorage(nv);
}, { deep: true });

onMounted(() => {
  // Inicialmente todas as equipes começam expandidas
  equipes.value.forEach(eq => expandedEquipes.value[eq.prefixo] = true);
});

const matchesFuncaoFilter = (membro) => {
  if (!selectedFuncaoFilter.value) return true;
  if (!membro || !membro.funcao) return false;
  return membro.funcao === selectedFuncaoFilter.value;
};

const getFilteredMembers = (membros = []) => {
  if (!Array.isArray(membros)) return [];
  return membros.filter(matchesFuncaoFilter);
};

// LÓGICA DE AGRUPAMENTO POR CARGO
const agruparPorCargo = (membros, { alreadyFiltered = false } = {}) => {
  const base = alreadyFiltered ? (membros || []) : getFilteredMembers(membros || []);
  return [
    { titulo: 'Liderança', lista: base.filter(m => m.funcao && (m.funcao.includes('ENCARREGADO') || m.funcao.includes('SUPERVISOR'))) },
    { titulo: 'Logística', lista: base.filter(m => m.funcao && m.funcao.includes('MOTORISTA')) },
    { titulo: 'Equipe Técnica', lista: base.filter(m => m.funcao && !m.funcao.includes('ENCARREGADO') && !m.funcao.includes('MOTORISTA') && !m.funcao.includes('SUPERVISOR')) }
  ].filter(c => c.lista.length > 0);
};

// FILTRO DE BUSCA
const filteredEquipes = computed(() => {
  const q = searchQuery.value.toUpperCase();
  // start from all teams or the selected one
  let candidates = equipes.value;
  if (selectedEquipeFilter.value) {
    candidates = equipes.value.filter(eq => eq.prefixo === selectedEquipeFilter.value);
  } else {
    // if LIDERANCA should remain hidden, exclude it unless explicitly requested
    if (!showLideranca.value) {
      candidates = equipes.value.filter(eq => eq.prefixo !== 'LIDERANCA');
    }
  }

  if (selectedFuncaoFilter.value) {
    candidates = candidates.filter(eq => (eq.membros || []).some(matchesFuncaoFilter));
  }

  if (!q) return candidates;

  return candidates.filter(eq => 
    eq.prefixo.toUpperCase().includes(q) || 
    (eq.placa || '').toUpperCase().includes(q) ||
    eq.membros.some(m => {
      const nome = (m.colaborador || '').toUpperCase();
      const chapa = m.chapa || '';
      return nome.includes(q) || chapa.includes(q);
    })
  );
});

const visibleEquipes = computed(() => {
  return filteredEquipes.value.map((equipe) => {
    const filteredMembers = getFilteredMembers(equipe.membros || []);
    return {
      equipe,
      filteredMembers,
      categorias: agruparPorCargo(filteredMembers, { alreadyFiltered: true })
    };
  });
});

// FUNÇÕES AUXILIARES
const getInitials = (n) => n.split(' ').map(i => i[0]).slice(0, 2).join('').toUpperCase();
const copyMembroDados = async (m) => {
  if (!m) return;
  const payload = [m.chapa, m.colaborador, m.funcao].filter(Boolean).join(' | ');
  if (!payload) return;
  try {
    await navigator.clipboard.writeText(payload);
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Dados copiados na ordem Chapa · Nome · Função.', type: 'success' } }));
  } catch (err) {
    try {
      const fallback = document.createElement('textarea');
      fallback.value = payload;
      fallback.style.position = 'fixed';
      fallback.style.opacity = '0';
      document.body.appendChild(fallback);
      fallback.select();
      document.execCommand('copy');
      document.body.removeChild(fallback);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Dados copiados na ordem Chapa · Nome · Função.', type: 'success' } }));
    } catch (e) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Não foi possível copiar os dados do colaborador.', type: 'error' } }));
    }
  }
};
const toggleEquipe = (p) => expandedEquipes.value[p] = !expandedEquipes.value[p];

// Verifica se já existe membro com mesma chapa ou nome (opcionalmente ignorando uma chapa original)
const findDuplicateMember = (chapa, colaborador, ignoreChapa = null) => {
  if (!chapa && !colaborador) return null;
  const nomeNorm = colaborador ? colaborador.toString().trim().toLowerCase() : null;
  for (const eq of equipes.value) {
    for (const m of (eq.membros || [])) {
      if (ignoreChapa && m.chapa === ignoreChapa) continue;
      if (chapa && m.chapa === chapa) return { equipe: eq, membro: m, reason: 'chapa' };
      if (nomeNorm && m.colaborador && m.colaborador.toString().trim().toLowerCase() === nomeNorm) return { equipe: eq, membro: m, reason: 'nome' };
    }
  }
  return null;
};

// CRUD MEMBROS
const openAddMembro = (e) => {
  editingEquipe.value = e || equipes.value[0];
  editingMembro.value = null;
  membroForm.value = { chapa: '', colaborador: '', funcao: '', equipe: (e ? e.prefixo : equipes.value[0].prefixo) };
  showMembroModal.value = true;
};

const openEditMembro = (e, m) => {
  editingEquipe.value = e;
  editingMembro.value = m;
  membroForm.value = { ...m, equipe: e.prefixo };
  showMembroModal.value = true;
};

const onSubmitMembro = async () => {
  const updated = { chapa: membroForm.value.chapa, colaborador: membroForm.value.colaborador, funcao: membroForm.value.funcao };

  // validate duplicates across all equipes (check chapa and nome)
  const originalChapa = editingMembro.value ? editingMembro.value.chapa : null;
  const dup = findDuplicateMember(updated.chapa, updated.colaborador, originalChapa);
  if (dup) {
    const who = dup.equipe ? `${dup.equipe.prefixo}` : 'outra equipe';
    const msg = dup.reason === 'chapa' ? `Já existe um registro com a mesma chapa na equipe ${who}.` : `Já existe um colaborador com este nome na equipe ${who}.`;
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: msg, type: 'error' } }));
    return;
  }

  if (editingMembro.value) {
    // if equipe changed, remove from source and add to destination
    const sourceEquipe = editingEquipe.value;
    const destPrefixo = membroForm.value.equipe || sourceEquipe.prefixo;

    if (destPrefixo !== sourceEquipe.prefixo) {
      // ask confirmation before moving
      const name = membroForm.value.colaborador || editingMembro.value.colaborador || updated.chapa;
      const confirmMsg = `Mover ${name} de ${sourceEquipe.prefixo} para ${destPrefixo}?`;
      const ok = await showConfirm(confirmMsg);
      if (!ok) return;
      // remove by original chapa (editingMembro may have old chapa)
      sourceEquipe.membros = sourceEquipe.membros.filter(m => m.chapa !== editingMembro.value.chapa);
      const target = equipes.value.find(eq => eq.prefixo === destPrefixo) || equipes.value[0];
      target.membros.push(updated);
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'MOVIDO COM SUCESSO', type: 'success' } }));
    } else {
      const idx = sourceEquipe.membros.findIndex(m => m.chapa === editingMembro.value.chapa);
      if (idx !== -1) sourceEquipe.membros[idx] = updated;
    }
  } else {
    const target = equipes.value.find(eq => eq.prefixo === membroForm.value.equipe) || equipes.value[0];
    target.membros.push(updated);
  }

  showMembroModal.value = false;
};

const removeMembro = async (e, m) => {
  const ok = await showConfirm(`Remover ${m.colaborador} desta equipe?`);
  if (ok) {
    e.membros = e.membros.filter(i => i.chapa !== m.chapa);
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Registro removido.', type: 'info' } }));
  }
};

const closeMembroModal = () => showMembroModal.value = false;

// Função para gerenciar o arrastar e soltar de membros entre equipes
const onDragStart = (event, membro, equipe) => {
  // store in reactive state for Vue handlers
  draggedMembro.value = { membro, equipe };
  // ensure DataTransfer is populated for cross-browser drop allow
  try {
    event.dataTransfer.setData('text/plain', membro.chapa);
    event.dataTransfer.effectAllowed = 'move';
  } catch (err) {
    // some environments may not support DataTransfer modification
  }
  console.log(`Iniciando arrasto do membro ${membro.colaborador} da equipe ${equipe.prefixo}`);
};

const onDragEnd = (event) => {
  // cleanup visual state
  onDragLeave(event);
  // do not clear draggedMembro here to allow drop handler to act first
};

const onDragEnter = (event) => {
  const el = event.currentTarget;
  if (el && el.classList) el.classList.add('drop-active');
};

const onDragLeave = (event) => {
  const el = event.currentTarget;
  if (el && el.classList) el.classList.remove('drop-active');
};

const onDrop = (targetEquipe) => {
  if (!draggedMembro.value) {
    console.warn('Nenhum membro foi arrastado.');
    return;
  }

  const { membro, equipe } = draggedMembro.value;

  if (equipe.prefixo === targetEquipe.prefixo) {
    console.warn('O membro já pertence a esta equipe.');
    return;
  }

  // abrir modal de confirmação para mover
  swapPayload.value = { type: 'move', membro, equipe, targetEquipe };
  swapDialogVisible.value = true;
  return;
};

const onDropReplaceMember = (event, targetEquipe, targetMembro) => {
  if (!draggedMembro.value) {
    console.warn('Nenhum membro foi arrastado.');
    return;
  }

  const { membro, equipe } = draggedMembro.value;

  if (equipe.prefixo === targetEquipe.prefixo && membro.chapa === targetMembro.chapa) {
    console.warn('O membro já está nesta posição.');
    return;
  }

  // abrir modal para confirmar swap
  swapPayload.value = { type: 'swap', membro, equipe, targetEquipe, targetMembro, eventCurrent: event.currentTarget };
  swapDialogVisible.value = true;
  return;
};

// confirmar e executar ação de swap/move
const confirmSwap = () => {
  const p = swapPayload.value;
  if (!p) return;

  if (p.type === 'move') {
    // animate move (pulse)
    moveAnimating.value = true;
    setTimeout(() => {
      const { membro, equipe, targetEquipe } = p;
      targetEquipe.membros.push(membro);
      equipe.membros = equipe.membros.filter(m => m.chapa !== membro.chapa);
      console.log(`Membro ${membro.colaborador} movido para a equipe ${targetEquipe.prefixo}`);
      moveAnimating.value = false;
      // cleanup
      draggedMembro.value = null;
      swapDialogVisible.value = false;
      swapPayload.value = null;
    }, 350);
    return;
  }

  if (p.type === 'swap') {
    // play swap animation then perform swap
    swapAnimating.value = true;
    setTimeout(() => {
      const { membro, equipe, targetEquipe, targetMembro } = p;
      const sourceIndex = equipe.membros.findIndex(m => m.chapa === membro.chapa);
      const targetIndex = targetEquipe.membros.findIndex(m => m.chapa === targetMembro.chapa);
      if (sourceIndex === -1 || targetIndex === -1) {
        console.error('Não foi possível localizar índices para troca.');
      } else {
        const temp = targetEquipe.membros[targetIndex];
        targetEquipe.membros.splice(targetIndex, 1, membro);
        equipe.membros.splice(sourceIndex, 1, temp);
        console.log(`Membro ${membro.colaborador} trocou de lugar com ${targetMembro.colaborador} entre equipes ${equipe.prefixo} ↔ ${targetEquipe.prefixo}`);
      }
      swapAnimating.value = false;
      // cleanup
      draggedMembro.value = null;
      swapDialogVisible.value = false;
      swapPayload.value = null;
    }, 420);
    return;
  }
};

const cancelSwap = () => {
  swapDialogVisible.value = false;
  swapPayload.value = null;
  // also clear any visual state
  try { document.querySelectorAll('.drop-active').forEach(el => el.classList.remove('drop-active')); } catch (e) {}
};
</script>

<style scoped>
/* CONFIGURAÇÃO DE CORES E TEMA */
.equipes-page {
  min-height: 100vh;
  background-color: transparent;
  transition: 0.15s ease;
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='10' cy='10' r='7' fill='%230d6efd' stroke='%23ffffff' stroke-width='2'/%3E%3Ccircle cx='10' cy='10' r='2' fill='%23ffffff'/%3E%3C/svg%3E") 6 6, pointer;
  font-family: 'Poppins', 'Inter', sans-serif;
}
.equipes-page .container-fluid {
  width: 100%;
  margin: 0;
  padding: 0;
}
.text-main { color: #1a1d21; font-family: 'Space Grotesk', 'Poppins', sans-serif; }
.text-sub { color: #6c757d; font-family: 'Inter', sans-serif; }

.page-header {
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
  align-items: center;
  width: 100%;
}

.page-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.5rem;
  width: 100%;
  margin: 0 auto;
  max-width: 640px;
}

.hero-kicker {
  text-transform: uppercase;
  letter-spacing: 0.4em;
  font-size: 0.75rem;
  font-weight: 600;
  color: #60a5fa;
  margin: 0;
}

.hero-title {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 700;
  margin: 0;
  letter-spacing: -0.02em;
}

.hero-subtitle {
  margin: 0;
  font-size: 1rem;
  color: #475569;
}

@media (prefers-color-scheme: dark) {
  .equipes-page { background-color: transparent !important; }
  .team-card, .modal-content, .member-card, .cargo-group { background-color: #1e1e1e !important; }
  .text-main { color: #ffffff !important; }
  .text-sub { color: #94a3b8 !important; }
  .hero-title { color: #f8fafc !important; }
  .hero-subtitle { color: #94a3b8 !important; }
  .cargo-title { color: #3b82f6 !important; }
  .brand-icon { background: linear-gradient(135deg,#1d4ed8,#2563eb) !important; color: #fff; box-shadow: 0 20px 45px rgba(15,23,42,0.55); }
  .control-bar {
    background: rgba(15,23,42,0.92);
    border-color: rgba(148,163,184,0.3);
    box-shadow: 0 35px 75px rgba(2,6,23,0.65);
  }
  .control-field {
    background: rgba(30,41,59,0.85);
    border-color: rgba(148,163,184,0.35);
    color: #e2e8f0;
    box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);
  }
  .control-field i { color: #7dd3fc; }
  .control-select, .control-input {
    color: #f8fafc;
  }
  .control-input::placeholder { color: rgba(226,232,240,0.55); }
  .pill-btn {
    border-color: rgba(148,163,184,0.35);
    background: rgba(15,23,42,0.65);
    color: #f1f5f9;
  }
  .pill-btn.primary {
    background: linear-gradient(120deg,#0ea5e9,#2563eb);
    box-shadow: 0 15px 30px rgba(14,165,233,0.45);
  }
  .pill-btn.outline { background: rgba(15,23,42,0.35); }
  .pill-btn.success { background: rgba(22,163,74,0.18); color: #4ade80; }
  .avatar-sm { background: #333 !important; color: #ddd !important; }
  .team-header { border-bottom: 1px solid #333; }
  .cargo-group { border-color: rgba(255,255,255,0.05); }
  .tag { background: rgba(13,110,253,0.25); color: #c7d2fe; }
  .team-prefix-display { color: #e2e8f0; }
  .team-plate-display { color: #94a3b8; }
  .team-header { background: linear-gradient(135deg, rgba(15,23,42,0.8), rgba(30,64,175,0.35)); }
  .chevron-icon { color: #cbd5f5; }
}

/* COMPONENTES */
.brand-icon {
  width: 76px;
  height: 76px;
  background: linear-gradient(135deg, #0f172a, #2563eb);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 24px;
  color: #f8fafc;
  box-shadow: 0 25px 45px rgba(15, 23, 42, 0.25);
}

.brand-icon i {
  font-size: 2rem;
}

.control-bar {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.25rem;
  padding: 1.25rem 1.5rem;
  border-radius: 26px;
  border: 1px solid rgba(15,23,42,0.08);
  background: rgba(255,255,255,0.7);
  backdrop-filter: blur(16px);
  box-shadow: 0 28px 55px rgba(15,23,42,0.08);
  text-align: center;
}

.control-stack {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 12px;
  min-width: 280px;
  width: 100%;
}

.control-field {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(248,250,252,0.92);
  border: 1px solid rgba(15,23,42,0.08);
  border-radius: 18px;
  padding: 10px 16px;
  min-width: 220px;
  backdrop-filter: blur(12px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.5);
  color: #0f172a;
  font-weight: 600;
}

.control-field i {
  color: #7dd3fc;
  font-size: 0.95rem;
}

.control-select,
.control-input {
  flex: 1;
  border: none;
  background: transparent;
  color: inherit;
  font-size: 0.95rem;
  outline: none;
}

.control-input::placeholder {
  color: rgba(15,23,42,0.55);
}

.control-select option {
  color: #111;
}

.control-field--search {
  min-width: 280px;
}

.control-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  width: 100%;
}

.pill-btn {
  border: 1px solid rgba(15,23,42,0.12);
  background: rgba(248,250,252,0.98);
  color: #0f172a;
  border-radius: 999px;
  padding: 10px 18px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: transform 0.15s ease, border 0.15s ease, background 0.15s ease;
  box-shadow: 0 10px 24px rgba(15,23,42,0.08);
}

.pill-btn:hover {
  transform: translateY(-1px);
  border-color: rgba(37,99,235,0.35);
  background: #ffffff;
}

.pill-btn .bi {
  color: inherit;
}

.pill-btn.primary { background: linear-gradient(120deg,#3ec6e0,#2563eb); border: none; color: #fff; box-shadow: 0 10px 25px rgba(37,99,235,0.4); }
.pill-btn.outline { background: rgba(248,250,252,0.85); border-color: rgba(15,23,42,0.18); }
.pill-btn.ghost { background: rgba(15,23,42,0.04); border-color: rgba(15,23,42,0.08); color: #0f172a; }
.pill-btn.success { background: rgba(16,185,129,0.12); border-color: rgba(16,185,129,0.45); color: #059669; }

.teams-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.team-card {
  background: white; border-radius: 14px; overflow: hidden;
  border: 1px solid rgba(0,0,0,0.04); transition: transform 0.15s ease;
  display: flex; flex-direction: column; min-height: 100%; box-shadow: 0 10px 20px rgba(15, 23, 42, 0.05);
  contain: layout paint;
  content-visibility: auto;
}

.cargo-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 0.75rem;
  content-visibility: auto;
}

.cargo-group {
  background: rgba(248,249,250,0.9);
  border: 1px solid rgba(0,0,0,0.04);
  border-radius: 16px;
  padding: 0.75rem;
  min-height: 100%;
}
.cargo-divider { border-bottom: 1px solid rgba(0,0,0,0.08); padding-bottom: 0.15rem; margin-bottom: 0.35rem; }
.cargo-headings { display: flex; justify-content: space-between; align-items: flex-end; }
.cargo-count { font-size: 0.65rem; text-transform: uppercase; color: #9ca3af; letter-spacing: 0.07em; font-family: 'Inter', sans-serif; }

.team-header {
  position: relative;
  padding: 1.3rem 1.8rem 1.6rem;
  background: linear-gradient(135deg, rgba(13,110,253,0.08), rgba(14,165,233,0.08));
  border-bottom: 1px solid rgba(13,110,253,0.12);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background 0.18s ease, transform 0.18s ease;
}

.team-heading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  width: 100%;
  text-align: center;
  transition: transform 0.18s ease;
  font-family: 'Space Grotesk', sans-serif;
}

.team-heading-content.is-collapsed { opacity: 0.88; }

.team-prefix-display {
  font-size: clamp(1.1rem, 1.8vw, 1.6rem);
  font-weight: 650;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #ffffff;
  line-height: 1.1;
  width: 100%;
  white-space: nowrap;
  overflow: hidden;
}

.team-plate-display {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  font-size: 1.3rem;
  font-weight: 600;
  color: rgba(255,255,255,0.9);
}

.team-plate-display i { font-size: 1.4rem; color: rgba(255,255,255,0.75); }

.chevron-icon {
  position: absolute;
  right: 20px;
  bottom: 18px;
  font-size: 1.3rem;
  color: #94a3b8;
  transition: transform 0.15s ease, color 0.15s ease;
}

.team-header:hover {
  transform: translateY(-2px);
  background: linear-gradient(135deg, rgba(14,165,233,0.25), rgba(37,99,235,0.35));
}

.team-header:hover .team-heading-content { transform: scale(1.015); }

.team-header:hover .chevron-icon { color: #0d6efd; }

/* CONTEÚDO E CARGOS */
.team-content {
  padding: 0.6rem; /* O padding deve ficar aqui fixo para a transição funcionar */
}

.cargo-title { color: #0d6efd; letter-spacing: 0.6px; font-size: 0.65rem; font-family: 'Space Grotesk', sans-serif; }

.member-card {
  background: #fff;
  border: 1px solid rgba(0,0,0,0.05);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.45rem;
  padding: 0.5rem 0.65rem;
  transition: transform 0.15s ease, border-color 0.15s ease;
}

.member-card + .member-card { margin-top: 0.15rem; }

.member-card:hover { border-color: rgba(13,110,253,0.3); transform: translateY(-1.5px); }

.member-info { min-width: 0; display: flex; flex-direction: column; gap: 0.2rem; }
.member-name { font-weight: 600; font-size: 0.82rem; font-family: 'Space Grotesk', sans-serif; white-space: normal; word-break: break-word; line-height: 1.25; }
.member-name-row { display: flex; align-items: flex-start; gap: 0.35rem; }
.btn-icon-copy { border: none; background: transparent; padding: 4px; border-radius: 6px; color: #0d6efd; display: inline-flex; align-items: center; justify-content: center; transition: background 0.15s ease; font-size: 0.85rem; cursor: pointer; }
.btn-icon-copy:hover { background: rgba(13,110,253,0.12); }
.btn-icon-copy:focus { outline: none; box-shadow: none; }
.member-tags { display: flex; flex-wrap: wrap; gap: 0.3rem; }
.tag {
  background: rgba(13,110,253,0.12);
  color: #1d4ed8;
  border-radius: 999px;
  padding: 0.06rem 0.48rem;
  font-size: 0.58rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.avatar-sm {
  width: 28px; height: 28px; background: #e9ecef; color: #495057;
  border-radius: 10px; display: flex; align-items: center; justify-content: center;
  font-weight: bold; font-size: 0.68rem;
}

.member-card.drop-active {
  background: rgba(13,110,253,0.08);
  border-color: rgba(13,110,253,0.3);
}

/* CORREÇÃO DA ANIMAÇÃO DE EXPANSÃO (O PADDING É RECOLHIDO AQUI) */
.expand-enter-active, .expand-leave-active {
  transition: all 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  max-height: 1500px;
}

.expand-enter-from, .expand-leave-to {
  opacity: 0;
  max-height: 0;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  margin-top: 0 !important;
  margin-bottom: 0 !important;
  overflow: hidden;
}

/* BOTÕES DE AÇÃO */
.btn-icon-edit, .btn-icon-delete { border: none; background: transparent; padding: 6px 10px; border-radius: 8px; transition: 0.15s ease; }
.btn-icon-edit { color: #0d6efd; }
.btn-icon-edit:hover { background: rgba(13, 110, 253, 0.1); }
.btn-icon-delete { color: #dc3545; }
.btn-icon-delete:hover { background: rgba(220, 53, 69, 0.1); }

/* MODAL MODERNO */
.modal-overlay {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background: rgba(0,0,0,0.5); backdrop-filter: blur(6px);
  display: flex; align-items: center; justify-content: center; z-index: 2000;
}
.modal-content { 
  background: white; width: 95%; max-width: 450px; 
  border-radius: 20px; padding: 25px; box-shadow: 0 20px 40px rgba(0,0,0,0.2);
}
.drop-zone {
  border: 2px dashed #0d6efd;
  border-radius: 10px;
  padding: 10px;
  text-align: center;
  color: #0d6efd;
  background: rgba(13, 110, 253, 0.1);
  transition: background 0.3s;
}
.drop-zone:hover {
  background: rgba(13, 110, 253, 0.2);
}
.swap-preview { width: 100%; }
.game-card { width: 180px; padding: 12px; border-radius: 12px; background: #fff; box-shadow: 0 8px 24px rgba(0,0,0,0.14); color: #111; }
.avatar-game { width: 64px; height: 64px; border-radius: 12px; background: #0d6efd; color: white; display:flex; align-items:center; justify-content:center; margin: 8px auto; font-weight:800; font-size:1.05rem; }
.vs-badge { font-size: 1.35rem; color: #0d6efd; }

/* swap animations */
.anim-swap-left { animation: swap-left 0.7s ease-in-out; }
.anim-swap-right { animation: swap-right 0.7s ease-in-out; }
@keyframes swap-left {
  0% { transform: translateX(0) scale(1); }
  30% { transform: translateX(-18px) scale(1.05); }
  60% { transform: translateX(18px) scale(1.05); }
  100% { transform: translateX(0) scale(1); }
}
@keyframes swap-right {
  0% { transform: translateX(0) scale(1); }
  30% { transform: translateX(18px) scale(1.05); }
  60% { transform: translateX(-18px) scale(1.05); }
  100% { transform: translateX(0) scale(1); }
}

.name-game { font-size: 0.95rem; font-weight:600; color: inherit; white-space: normal; overflow: visible; margin-top:4px; }
.equipe-label { display:block; margin-top:6px; color: #6c757d; font-size:0.8rem; }

@media (prefers-color-scheme: dark) {
  .game-card { background: #1e1e1e; color: #f2f2f2; box-shadow: 0 8px 24px rgba(0,0,0,0.5); }
  .equipe-label { color: #9aa6b2; }
}

/* subtle confetti effect using pseudo-elements */
.modal-content::after {
  content: '';
  position: absolute; left: 0; right: 0; top: -10px; height: 8px; pointer-events: none;
  background: linear-gradient(90deg, rgba(13,110,253,0.12), rgba(25,135,84,0.12));
  border-top-left-radius: 20px; border-top-right-radius:20px;
}

/* Follow button positioning */
.follow-btn { position: absolute; right: 12px; top: 12px; z-index: 3; width:34px; height:34px; padding:0; border-radius:8px; display:flex; align-items:center; justify-content:center; transition: all 0.12s ease; }

/* compact default (not followed) */
.follow-btn { border: 1px solid rgba(255,255,255,0.06); background: transparent; color: #cbd5e1; }
.follow-btn:hover { transform: translateY(-1px); background: rgba(255,255,255,0.02); }
.follow-btn.btn-primary { background: rgba(13,110,253,1); border-color: rgba(13,110,253,1); color: #ffffff; }
.follow-btn .bi { font-size: 0.95rem; }

.empty-filter-state {
  border: 1px dashed rgba(148,163,184,0.6);
  border-radius: 16px;
  padding: 2rem 1rem;
  text-align: center;
  color: #64748b;
  background: rgba(148,163,184,0.08);
}

.empty-filter-state i { font-size: 2rem; margin-bottom: 0.3rem; display: block; }

.empty-filter-state p { margin: 0; font-weight: 600; }

@media (prefers-color-scheme: dark) {
  .follow-btn { border-color: rgba(255,255,255,0.06); color: #cbd5e1; }
  .follow-btn:hover { box-shadow: none; }
  .empty-filter-state { border-color: rgba(148,163,184,0.5); color: #cbd5f5; background: rgba(15,23,42,0.55); }
}

/* Responsive adjustments: mobile-first breakpoints */
@media (max-width: 980px) {
  .teams-grid { grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 1.2rem; }
  .cargo-grid { grid-template-columns: 1fr; }
  .control-bar { padding: 1rem 1.2rem; }
  .control-field { flex: 1 1 240px; min-width: min(320px, 100%); }
  .control-field--search { min-width: min(360px, 100%); }
  .control-actions { justify-content: center; }
  .page-title { font-size: 1.25rem; }
}

@media (max-width: 640px) {
  .teams-grid { grid-template-columns: 1fr; gap: 0.9rem; }
  .team-card { border-radius: 12px; }
  .team-header { padding: 1.5rem 1.25rem 2rem; }
  .team-prefix-display { font-size: 1.9rem; }
  .team-plate-display { font-size: 1.05rem; }

  .control-bar { padding: 0.9rem; }
  .control-stack { flex-direction: column; align-items: stretch; }
  .control-field, .control-field--search { min-width: 100%; }
  .control-actions { flex-direction: column; }
  .pill-btn { width: 100%; justify-content: center; }

  /* Member card stacks vertically for small screens */
  .member-card { grid-template-columns: auto 1fr; grid-template-rows: auto auto; }
  .member-card .avatar-sm { grid-row: span 2; }
  .member-card .actions { justify-content: flex-end; grid-column: 1 / -1; width: 100%; }
  .actions .btn { padding: 6px 10px; }

  /* Modal adjustments */
  .modal-content { width: 92%; max-width: 420px; padding: 18px; }

  /* Reduce paddings and fonts to fit mobile */
  .card-body, .team-content { padding: 10px; }
  .page-title { font-size: 1.1rem; }
}

</style>