/**
 * Definição centralizada dos passos de sincronização do Kaizen.
 *
 * Qualquer novo passo do robô deve ser adicionado aqui — tanto o
 * frontend (KaizenRobotMonitor) quanto o backend podem importar
 * este mesmo arquivo para manter a lista de etapas sincronizada.
 */
export const KAIZEN_STEP_DEFINITIONS = [
  {
    id: 'job-started',
    label: 'Inicializacao',
    description: 'Job criado e sincronizacao iniciada.',
    stages: ['job-created', 'job-started', 'range-started'],
  },
  {
    id: 'export',
    label: 'Exportacao SIGA',
    description: 'Robo navegando e exportando o relatorio.',
    stages: ['date-started', 'range-date-started', 'export-started', 'export-finished'],
  },
  {
    id: 'save',
    label: 'Persistencia',
    description: 'Dados sendo gravados e deduplicados no Neon.',
    stages: ['saving-started', 'date-completed'],
  },
  {
    id: 'complete',
    label: 'Conclusao',
    description: 'Lote finalizado e historico atualizado.',
    stages: ['range-completed', 'job-completed', 'job-failed'],
  },
];

/**
 * Resolve o status de cada step com base nos logs e no estado do monitor.
 *
 * @param {Array} logs         Array de entradas de log { stage, ... }
 * @param {string} syncStatus  Status geral do job ('completed', 'failed', 'running', etc.)
 * @param {boolean} isSyncing  Se o job está ativo
 * @param {string|null} currentStepId  Step ativo indicado pelo backend (opcional)
 * @returns {Array} Steps com campo `status` resolvido ('done'|'active'|'pending'|'error')
 */
export function resolveStepStatuses(logs = [], syncStatus = '', isSyncing = false, currentStepId = null) {
  const seenStages = new Set(logs.map((entry) => entry.stage).filter(Boolean));
  const hasFailure = syncStatus === 'failed';
  const currentStage = logs.length ? logs[logs.length - 1].stage : '';

  return KAIZEN_STEP_DEFINITIONS.map((step, index) => {
    // Se o backend já forneceu o step ativo, usa diretamente
    if (currentStepId) {
      let status = 'pending';
      if (hasFailure && step.id === 'complete') status = 'error';
      else if (step.id === currentStepId) status = 'active';
      else {
        const currentIdx = KAIZEN_STEP_DEFINITIONS.findIndex((s) => s.id === currentStepId);
        if (currentIdx >= 0 && index < currentIdx) status = 'done';
      }
      return { ...step, status };
    }

    // Fallback: inferir a partir dos stages vistos nos logs
    const completed = step.stages.some((stage) => seenStages.has(stage))
      && currentStage !== step.stages[0];
    const active = step.stages.includes(currentStage)
      || (isSyncing && !hasFailure && !completed
        && KAIZEN_STEP_DEFINITIONS.slice(0, index).every(
          (previous) => previous.stages.some((stage) => seenStages.has(stage)),
        ));

    let status = 'pending';
    if (hasFailure && step.id === 'complete') status = 'error';
    else if (completed) status = 'done';
    else if (active) status = 'active';

    return { ...step, status };
  });
}
