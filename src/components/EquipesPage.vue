<template>
  <div class="equipes-page">
    <div class="container-fluid py-4">
      <div class="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-3">
        <div class="d-flex align-items-center gap-3">
          <div class="brand-icon shadow-sm">
            <i class="bi bi-person-badge-fill fs-3"></i>
          </div>
          <h1 class="h3 fw-bold mb-0 page-title text-main">Gestão de Escalas</h1>
        </div>
        
        <div class="d-flex gap-2 align-items-center header-controls">
                <select v-model="selectedEquipeFilter" class="form-select team-filter">
                  <option value="">Todas as Equipes</option>
                  <option v-for="eq in equipes" :key="eq.prefixo" :value="eq.prefixo">{{ eq.prefixo }} — {{ eq.placa }}</option>
                </select>
                <div class="search-box">
                  <i class="bi bi-search"></i>
                  <input v-model="searchQuery" type="text" class="form-control" placeholder="Buscar colaborador..." />
                </div>
          <button class="btn btn-primary px-4 d-flex align-items-center gap-2 shadow-sm" @click="openAddMembro(null)">
                  <i class="bi bi-plus-lg"></i> <span class="d-none d-md-inline">Novo Registro</span>
                </button>
          <button class="btn btn-outline-light ms-2" @click="saveToFile">Salvar no arquivo</button>
          <button class="btn btn-outline-secondary ms-2" @click="reloadFromFile">Recarregar do arquivo</button>
          <button class="btn btn-sm btn-outline-info ms-2" @click="toggleLideranca">
            <i :class="['bi', showLideranca ? 'bi-eye-slash' : 'bi-eye']"></i>
            <span class="d-none d-md-inline">{{ showLideranca ? 'Ocultar Liderança' : 'Mostrar Liderança' }}</span>
          </button>
          <button class="btn btn-outline-success ms-2" @click="exportExcel">Exportar Excel</button>
          <button class="btn btn-outline-dark ms-2" @click="exportPdf">Exportar PDF</button>
              </div>
      </div>

      <div class="teams-grid">   
        <div v-for="equipe in filteredEquipes" :key="equipe.prefixo" class="team-card shadow-sm">
          
          <div class="team-header p-3" @click="toggleEquipe(equipe.prefixo)" role="button">
            <button class="btn btn-sm btn-outline-secondary follow-btn" :class="{ 'btn-primary text-white': isFollowed(equipe.prefixo) }" @click.stop="toggleFollow(equipe.prefixo)" title="Acompanhar">
              <i :class="isFollowed(equipe.prefixo) ? 'bi bi-star-fill' : 'bi bi-star'"></i>
            </button>
            <div v-if="!expandedEquipes[equipe.prefixo]" class="collapsed-view d-flex flex-column align-items-center justify-content-center">
              <span class="badge bg-primary mb-3 prefix-badge-lg">{{ equipe.prefixo }}</span>
              <div class="d-flex align-items-center gap-3 mb-2">
                <i class="bi bi-truck text-muted truck-icon-lg"></i>
                <span class="fw-bold text-main placa-text-lg">{{ equipe.placa }}</span>
              </div>
              <i class="bi bi-chevron-down text-muted fs-4 mt-2"></i>
            </div>
            
            <div v-else class="d-flex justify-content-between align-items-center">
              <div>
                <span class="badge bg-primary mb-1">{{ equipe.prefixo }}</span>
                <div class="d-flex align-items-center gap-2">
                  <i class="bi bi-truck text-muted"></i>
                  <span class="fw-bold text-main">{{ equipe.placa }}</span>
                </div>
              </div>
              <i class="bi bi-chevron-up text-muted"></i>
            </div>
          </div>

          <transition name="expand">
            <div v-if="expandedEquipes[equipe.prefixo]" class="team-content border-top">
              <div v-for="categoria in agruparPorCargo(equipe.membros)" :key="categoria.titulo" class="cargo-group mb-3">
                <div class="cargo-divider d-flex align-items-center gap-2 mb-2">
                  <span class="cargo-title text-uppercase small fw-bold">{{ categoria.titulo }}</span>
                  <div class="flex-grow-1 border-bottom border-secondary opacity-25"></div>
                </div>

                <div v-for="membro in categoria.lista" :key="membro.chapa" class="member-card p-2 mb-2 rounded d-flex align-items-center" draggable="true"
                  @dragstart="onDragStart($event, membro, equipe)"
                  @dragend="onDragEnd"
                  @dragover.prevent
                  @dragenter.prevent="onDragEnter($event)"
                  @dragleave.prevent="onDragLeave($event)"
                  @drop.prevent="onDropReplaceMember($event, equipe, membro)"
                >
                  <div class="avatar-sm me-2">{{ getInitials(membro.colaborador) }}</div>
                  <div class="flex-grow-1 overflow-hidden">
                    <div class="fw-bold text-main text-truncate">{{ membro.colaborador }}</div>
                    <div class="text-sub small">{{ membro.funcao }}</div>
                  </div>
                  <div class="actions ms-2 d-flex gap-1">
                    <button class="btn btn-icon-edit" @click.stop="openEditMembro(equipe, membro)" title="Editar">
                      <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-icon-delete" @click.stop="removeMembro(equipe, membro)" title="Excluir">
                      <i class="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              </div>

              <div
                class="team-content border-top"
                @drop="onDrop(equipe)"
                @dragover.prevent
              >
                <!-- Conteúdo da equipe -->
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
import { useDraggable, useDroppable } from '@dnd-kit/core';
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

const saveToFile = async () => {
  try {
    const resp = await fetch('http://localhost:5176/save-equipes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(equipes.value)
    });
    const j = await resp.json();
    if (resp.ok && j.ok) {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Dados gravados em src/data/equipes.js com sucesso.', type: 'success' } }));
    } else {
      window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Falha ao gravar arquivo: ' + (j.error || resp.statusText), type: 'error' } }));
    }
  } catch (e) {
    console.error(e);
    window.dispatchEvent(new CustomEvent('app-toast', { detail: { message: 'Erro ao conectar ao servidor de persistência. Execute "npm run persist" e tente novamente.', type: 'error' } }));
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

// persist changes to localStorage
watch(equipes, (nv) => {
  saveToStorage(nv);
}, { deep: true });

onMounted(() => {
  // Inicialmente todas as equipes começam expandidas
  equipes.value.forEach(eq => expandedEquipes.value[eq.prefixo] = true);
});

// LÓGICA DE AGRUPAMENTO POR CARGO
const agruparPorCargo = (membros) => {
  return [
    { titulo: 'Liderança', lista: membros.filter(m => m.funcao && (m.funcao.includes('ENCARREGADO') || m.funcao.includes('SUPERVISOR'))) },
    { titulo: 'Logística', lista: membros.filter(m => m.funcao && m.funcao.includes('MOTORISTA')) },
    { titulo: 'Equipe Técnica', lista: membros.filter(m => m.funcao && !m.funcao.includes('ENCARREGADO') && !m.funcao.includes('MOTORISTA') && !m.funcao.includes('SUPERVISOR')) }
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

  if (!q) return candidates;

  return candidates.filter(eq => 
    eq.prefixo.includes(q) || 
    eq.placa.includes(q) ||
    eq.membros.some(m => m.colaborador.toUpperCase().includes(q) || m.chapa.includes(q))
  );
});

// FUNÇÕES AUXILIARES
const getInitials = (n) => n.split(' ').map(i => i[0]).slice(0, 2).join('').toUpperCase();
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
    }, 600);
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
    }, 700);
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
.equipes-page { min-height: 100vh; background-color: #f8f9fa; transition: 0.3s; }
.text-main { color: #1a1d21; }
.text-sub { color: #6c757d; }

@media (prefers-color-scheme: dark) {
  .equipes-page { background-color: #121212 !important; }
  .team-card, .modal-content, .member-card { background-color: #1e1e1e !important; }
  .text-main { color: #ffffff !important; }
  .text-sub { color: #a0a0a0 !important; }
  .cargo-title { color: #3b82f6 !important; }
  .search-box input { background: #2a2a2a; border-color: #444; color: white !important; }
  .brand-icon { background: #333 !important; color: #fff; }
  .avatar-sm { background: #333 !important; color: #ddd !important; }
  .team-header { border-bottom: 1px solid #333; }
}

/* COMPONENTES */
.brand-icon {
  width: 50px; height: 50px; background: white; 
  display: flex; align-items: center; justify-content: center;
  border-radius: 12px; color: #0d6efd;
}

.search-box { position: relative; width: 280px; }
.search-box i { position: absolute; left: 12px; top: 10px; color: #adb5bd; }
.search-box input { padding-left: 35px; border-radius: 10px; }
.search-box input::placeholder { color: #000 !important; opacity: 1; }
.team-filter { width: 220px; }

.teams-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 1.5rem;
}

.team-card {
  background: white; border-radius: 15px; overflow: hidden;
  border: 1px solid rgba(0,0,0,0.05); transition: transform 0.2s;
}

/* ESTILO DO CARD RECOLHIDO (MODO FOCADO) */
.collapsed-view { padding: 50px 10px; }
.prefix-badge-lg { font-size: 2.5rem; padding: 12px 40px; border-radius: 15px; }
.truck-icon-lg { font-size: 3rem; }
.placa-text-lg { font-size: 2.5rem; letter-spacing: 3px; font-family: monospace; }

/* CONTEÚDO E CARGOS */
.team-content {
  padding: 1rem; /* O padding deve ficar aqui fixo para a transição funcionar */
}

.cargo-title { color: #0d6efd; letter-spacing: 0.8px; font-size: 0.75rem; }

.member-card {
  background: rgba(0,0,0,0.02); border: 1px solid rgba(0,0,0,0.04);
}

.avatar-sm {
  width: 38px; height: 38px; background: #e9ecef; color: #495057;
  border-radius: 10px; display: flex; align-items: center; justify-content: center;
  font-weight: bold; font-size: 0.85rem;
}

.member-card.drop-active {
  background: rgba(13,110,253,0.08);
  border-color: rgba(13,110,253,0.3);
}

/* CORREÇÃO DA ANIMAÇÃO DE EXPANSÃO (O PADDING É RECOLHIDO AQUI) */
.expand-enter-active, .expand-leave-active {
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
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
.btn-icon-edit, .btn-icon-delete { border: none; background: transparent; padding: 6px 10px; border-radius: 8px; transition: 0.2s; }
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
.team-header { position: relative; }
.follow-btn { position: absolute; right: 12px; top: 12px; z-index: 3; width:34px; height:34px; padding:0; border-radius:8px; display:flex; align-items:center; justify-content:center; transition: all 0.12s ease; }

/* compact default (not followed) */
.follow-btn { border: 1px solid rgba(255,255,255,0.06); background: transparent; color: #cbd5e1; }
.follow-btn:hover { transform: translateY(-1px); background: rgba(255,255,255,0.02); }
.follow-btn.btn-primary { background: rgba(13,110,253,1); border-color: rgba(13,110,253,1); color: #ffffff; }
.follow-btn .bi { font-size: 0.95rem; }

/* ensure header content doesn't overlap the follow button */
.team-card .team-header { padding-right: 56px; }

@media (prefers-color-scheme: dark) {
  .follow-btn { border-color: rgba(255,255,255,0.06); color: #cbd5e1; }
  .follow-btn:hover { box-shadow: none; }
}

/* Header controls (top-right) - keep inside container padding */
.header-controls { gap: 0.6rem; flex-wrap: wrap; align-items: center; }
.header-controls .btn { white-space: nowrap; margin: 0 0 0 0.4rem; border-radius: 8px; }
.header-controls .btn:focus { outline: none; box-shadow: none; }
.header-controls { padding-right: 12px; }

@media (max-width: 768px) {
  .header-controls { padding-right: 8px; }
  .header-controls .btn { padding-left: 10px; padding-right: 10px; }
}

</style>