const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildBaseOpportunities,
  buildFilteredTopOpportunities,
  buildObrasStatusSummary,
  resolveBaseCode,
} = require('../shared/oportunidadesRobot');

test('gera top oportunidades ordenadas por maior valor total', () => {
  const normalized = {
    dates: [
      { key: '2026-04-01', label: 'qua., 01/04' },
      { key: '2026-04-02', label: 'qui., 02/04' },
    ],
    teams: [
      { code: 'A', display: 'Obra A', plate: 'ABC-1234', valuesByDate: { '2026-04-01': 1200, '2026-04-02': 800 } },
      { code: 'B', display: 'Obra B', plate: 'DEF-5678', valuesByDate: { '2026-04-01': 5000 } },
      { code: 'C', display: 'Obra C', plate: 'GHI-9012', valuesByDate: { '2026-04-02': 3000 } },
    ],
    summary: { totalImportedValue: 10000, firstDateKey: '2026-04-01', lastDateKey: '2026-04-02' },
  };

  const result = buildBaseOpportunities(normalized, { sheetName: 'BACABAL', topN: 2 });

  assert.equal(result.name, 'BACABAL');
  assert.equal(result.top.length, 2);
  assert.equal(result.top[0].display, 'Obra B');
  assert.equal(result.top[0].total, 5000);
  assert.equal(result.top[1].display, 'Obra C');
  assert.equal(result.totalVisibleValue, 8000);
  assert.equal(result.lastVisibleDate, 'qui., 02/04');
});

test('remove candidatos sem valor positivo', () => {
  const normalized = {
    dates: [{ key: '2026-04-01', label: 'qua., 01/04' }],
    teams: [
      { code: 'A', display: 'Obra A', valuesByDate: { '2026-04-01': 0 } },
      { code: 'B', display: 'Obra B', valuesByDate: { '2026-04-01': 150 } },
    ],
    summary: { totalImportedValue: 150 },
  };

  const result = buildBaseOpportunities(normalized, { sheetName: 'SANTA INÊS', topN: 10 });

  assert.equal(result.top.length, 1);
  assert.equal(result.top[0].display, 'Obra B');
});

test('resolve códigos de distrital a partir dos nomes filtrados', () => {
  assert.equal(resolveBaseCode('BACABAL'), 'BCB');
  assert.equal(resolveBaseCode('ITAPECURU MIRIM'), 'ITM');
  assert.equal(resolveBaseCode('PEDREIRAS'), 'PDS');
  assert.equal(resolveBaseCode('SANTA INÊS'), 'STI');
});

test('gera top oportunidades a partir da aba BASE CLIENTES com filtros padrão das 3 bases', () => {
  const rows = [
    ['CONTRATO', 'PRIORIDADE EQTL', 'CARTEIRA 2026', 'DATA VISITA VALIDAÇÃO', 'RELATÓRIO SUPRESSÃO', 'STATUS SISBG', 'CARTEIRA EQTL', 'RASTREABILIDADE', 'PI', 'PEP', 'NOTA', 'DESCRITIVO', 'DISTRITAL', 'MUNICIPIO', 'SIGLA', 'STATUS', 'SISTEMA', 'MÊS INICIAR CARTEIRA EQTL', 'DATA ABER/LOG', 'DATA LIB/LOG', 'DATA LIB/ATEC', 'MÊS', 'PRAZO', 'PRAZO EXECUÇÃO', 'DATA CONCLUSÃO', 'MÊS CONCLUSÃO', 'DATA DE ENVIO DA PASTA', 'STATUS OBRA', 'NECESSIDADE LV', 'QUANTIDADE PROGRAMAÇÕES', 'PRIMEIRA PROGRAMAÇÃO', 'PRÓXIMA PROGRAMAÇÃO', 'ÚLTIMA PROGRAMAÇÃO', 'PROGRAMADA HOJE?', 'OBSERVAÇÃO', 'TESTE2', 'POSTE', 'CONDUTOR MT', 'CONDUTOR BT', 'TRAFO', 'MEDIDOR', 'META ANEEL', 'CHAVE RELIG', 'RELIGADOR', 'AVANÇO FÍSICO', 'PROJETADO R$', 'EXECUTADO EM CAMPO', 'MEDIÇÃO PARCIAL', 'LIBERADO PARA EXECUÇÃO', 'X', 'Y', 'ETAPA', 'RESPONSÁVEL', 'CICLO', 'META'],
    ['ÂNCORA', '', 'SIM', '', 'Não Iniciado', 'Obra em Execução', 'SIM', 'NS-1', 'LPT', 'PEP-1', '430100001', 'Projeto A', 'BACABAL', 'BACABAL', 'BCB', 'LIB/ATEC', 'PROJ', '', '', '', '', '', '', '', '', '', '', 'OBRA LIBERADA', '', '1', '', '21/04/2026', '', 'Não', '', '', '', '', '', '', '', '', '', '', '0%', '43,735.55', '-', '-', '-', '', '', 'ANDAMENTO', 'FRANCISCO', '', ''],
    ['ÂNCORA', '', 'SIM', '', 'Não Iniciado', 'Obra em Execução', 'SIM', 'NS-2', 'LPT', 'PEP-2', '430100002', 'Projeto B', 'PEDREIRAS', 'PEDREIRAS', 'PDS', 'LIB/ATEC', 'PROJ', '', '', '', '', '', '', '', '', '', '', 'PROGRAMADA', '', '1', '', '30/04/2026', '', 'Não', '', '', '', '', '', '', '', '', '', '', '0%', '120,000.00', '-', '-', '-', '', '', 'ANDAMENTO', 'FRANCISCO', '', ''],
    ['ÂNCORA', '', 'SIM', '', 'Não Iniciado', 'Obra em Execução', 'SIM', 'NS-3', 'LPT', 'PEP-3', '430100003', 'Projeto C', 'BARRA DO CORDA', 'BARRA DO CORDA', 'BDC', 'LIB/ATEC', 'PROJ', '', '', '', '', '', '', '', '', '', '', 'PROGRAMADA', '', '1', '', '10/04/2026', '', 'Não', '', '', '', '', '', '', '', '', '', '', '0%', '999,000.00', '-', '-', '-', '', '', 'ANDAMENTO', 'FRANCISCO', '', ''],
    ['ÂNCORA', '', 'SIM', '', 'Não Iniciado', 'Obra em Execução', 'SIM', 'NS-4', 'LPT', 'PEP-4', '430100004', 'Projeto D', 'SANTA INES', 'SANTA INES', 'STI', 'LIB/ATEC', 'PROJ', '', '', '', '', '', '', '', '', '', '', 'REPROGRAMAR', '', '1', '', '08/04/2026', '', 'Não', '', '', '', '', '', '', '', '', '', '', '0%', '99,000.00', '-', '-', '-', '', '', 'ANDAMENTO', 'FRANCISCO', '', ''],
    ['ÂNCORA', '', 'SIM', '', 'Não Iniciado', 'Obra em Execução', 'SIM', 'NS-5', 'LPT', 'PEP-5', '430100005', 'Projeto E', 'ITAPECURU MIRIM', 'ITAPECURU MIRIM', 'ITM', 'LIB/ATEC', 'PROJ', '', '', '', '', '', '', '', '', '', '', 'CANCELAR', '', '1', '', '08/04/2026', '', 'Não', '', '', '', '', '', '', '', '', '', '', '0%', '10,000.00', '-', '-', '-', '', '', 'ANDAMENTO', 'FRANCISCO', '', ''],
  ];

  const result = buildFilteredTopOpportunities(rows, { topN: 10 });

  assert.equal(result.top.length, 2);
  assert.equal(result.top[0].display, 'PEP-4');
  assert.equal(result.top[0].displaySecondary, '430100004');
  assert.equal(result.top[0].districtLabel, 'SANTA INÊS');
  assert.equal(result.top[1].districtLabel, 'BACABAL');
  assert.equal(result.filters.districts.length, 3);
});

test('permite solicitar uma base específica explicitamente', () => {
  const rows = [
    ['CONTRATO', 'PRIORIDADE EQTL', 'CARTEIRA 2026', 'DATA VISITA VALIDAÇÃO', 'RELATÓRIO SUPRESSÃO', 'STATUS SISBG', 'CARTEIRA EQTL', 'RASTREABILIDADE', 'PI', 'PEP', 'NOTA', 'DESCRITIVO', 'DISTRITAL', 'MUNICIPIO', 'SIGLA', 'STATUS', 'SISTEMA', 'MÊS INICIAR CARTEIRA EQTL', 'DATA ABER/LOG', 'DATA LIB/LOG', 'DATA LIB/ATEC', 'MÊS', 'PRAZO', 'PRAZO EXECUÇÃO', 'DATA CONCLUSÃO', 'MÊS CONCLUSÃO', 'DATA DE ENVIO DA PASTA', 'STATUS OBRA', 'NECESSIDADE LV', 'QUANTIDADE PROGRAMAÇÕES', 'PRIMEIRA PROGRAMAÇÃO', 'PRÓXIMA PROGRAMAÇÃO', 'ÚLTIMA PROGRAMAÇÃO', 'PROGRAMADA HOJE?', 'OBSERVAÇÃO', 'TESTE2', 'POSTE', 'CONDUTOR MT', 'CONDUTOR BT', 'TRAFO', 'MEDIDOR', 'META ANEEL', 'CHAVE RELIG', 'RELIGADOR', 'AVANÇO FÍSICO', 'PROJETADO R$', 'EXECUTADO EM CAMPO', 'MEDIÇÃO PARCIAL', 'LIBERADO PARA EXECUÇÃO', 'X', 'Y', 'ETAPA', 'RESPONSÁVEL', 'CICLO', 'META'],
    ['ÂNCORA', '', 'SIM', '', 'Não Iniciado', 'Obra em Execução', 'SIM', 'NS-1', 'LPT', 'PEP-1', '430100001', 'Projeto A', 'BACABAL', 'BACABAL', 'BCB', 'LIB/ATEC', 'PROJ', '', '', '', '', '', '', '', '', '', '', 'OBRA LIBERADA', '', '1', '', '21/04/2026', '', 'Não', '', '', '', '', '', '', '', '', '', '', '0%', '43,735.55', '-', '-', '-', '', '', 'ANDAMENTO', 'FRANCISCO', '', ''],
    ['ÂNCORA', '', 'SIM', '', 'Não Iniciado', 'Obra em Execução', 'SIM', 'NS-4', 'LPT', 'PEP-4', '430100004', 'Projeto D', 'SANTA INES', 'SANTA INES', 'STI', 'LIB/ATEC', 'PROJ', '', '', '', '', '', '', '', '', '', '', 'REPROGRAMAR', '', '1', '', '08/04/2026', '', 'Não', '', '', '', '', '', '', '', '', '', '', '0%', '99,000.00', '-', '-', '-', '', '', 'ANDAMENTO', 'FRANCISCO', '', ''],
  ];

  const result = buildFilteredTopOpportunities(rows, { topN: 10, districtFilters: ['BACABAL'] });

  assert.equal(result.top.length, 1);
  assert.equal(result.top[0].districtLabel, 'BACABAL');
});

test('deduplica oportunidades com a mesma nota', () => {
  const rows = [
    ['CONTRATO', 'PRIORIDADE EQTL', 'CARTEIRA 2026', 'DATA VISITA VALIDAÇÃO', 'RELATÓRIO SUPRESSÃO', 'STATUS SISBG', 'CARTEIRA EQTL', 'RASTREABILIDADE', 'PI', 'PEP', 'NOTA', 'DESCRITIVO', 'DISTRITAL', 'MUNICIPIO', 'SIGLA', 'STATUS', 'SISTEMA', 'MÊS INICIAR CARTEIRA EQTL', 'DATA ABER/LOG', 'DATA LIB/LOG', 'DATA LIB/ATEC', 'MÊS', 'PRAZO', 'PRAZO EXECUÇÃO', 'DATA CONCLUSÃO', 'MÊS CONCLUSÃO', 'DATA DE ENVIO DA PASTA', 'STATUS OBRA', 'NECESSIDADE LV', 'QUANTIDADE PROGRAMAÇÕES', 'PRIMEIRA PROGRAMAÇÃO', 'PRÓXIMA PROGRAMAÇÃO', 'ÚLTIMA PROGRAMAÇÃO', 'PROGRAMADA HOJE?', 'OBSERVAÇÃO', 'TESTE2', 'POSTE', 'CONDUTOR MT', 'CONDUTOR BT', 'TRAFO', 'MEDIDOR', 'META ANEEL', 'CHAVE RELIG', 'RELIGADOR', 'AVANÇO FÍSICO', 'PROJETADO R$', 'EXECUTADO EM CAMPO', 'MEDIÇÃO PARCIAL', 'LIBERADO PARA EXECUÇÃO', 'X', 'Y', 'ETAPA', 'RESPONSÁVEL', 'CICLO', 'META'],
    ['ÂNCORA', '', 'SIM', '', 'Não Iniciado', 'Obra em Execução', 'SIM', 'NS-1', 'LPT', 'PEP-1', '440117843', 'Projeto A', 'BACABAL', 'BACABAL', 'BCB', 'LIB/ATEC', 'PROJ', '', '', '', '', '', '', '', '', '', '', 'OBRA LIBERADA', '', '1', '', '21/04/2026', '', 'Não', '', '', '', '', '', '', '', '', '', '', '0%', '43,735.55', '-', '-', '-', '', '', 'ANDAMENTO', 'FRANCISCO', '', ''],
    ['ÂNCORA', '', 'SIM', '', 'Não Iniciado', 'Obra em Execução', 'SIM', 'NS-1', 'LPT', 'PEP-1', '440117843', 'Projeto A repetido', 'BACABAL', 'BACABAL', 'BCB', 'LIB/ATEC', 'PROJ', '', '', '', '', '', '', '', '', '', '', 'OBRA LIBERADA', '', '1', '', '21/04/2026', '', 'Não', '', '', '', '', '', '', '', '', '', '', '0%', '43,735.55', '-', '-', '-', '', '', 'ANDAMENTO', 'FRANCISCO', '', ''],
  ];

  const result = buildFilteredTopOpportunities(rows, { topN: 10, districtFilters: ['BACABAL'] });

  assert.equal(result.summary.rawCandidates, 2);
  assert.equal(result.summary.totalCandidates, 1);
  assert.equal(result.top.length, 1);
  assert.equal(result.top[0].display, 'PEP-1');
  assert.equal(result.top[0].displaySecondary, '440117843');
  assert.equal(result.top[0].note, '440117843');
});

test('usa nota quando pep nao estiver preenchido', () => {
  const rows = [
    ['CONTRATO', 'PRIORIDADE EQTL', 'CARTEIRA 2026', 'DATA VISITA VALIDAÇÃO', 'RELATÓRIO SUPRESSÃO', 'STATUS SISBG', 'CARTEIRA EQTL', 'RASTREABILIDADE', 'PI', 'PEP', 'NOTA', 'DESCRITIVO', 'DISTRITAL', 'MUNICIPIO', 'SIGLA', 'STATUS', 'SISTEMA', 'MÊS INICIAR CARTEIRA EQTL', 'DATA ABER/LOG', 'DATA LIB/LOG', 'DATA LIB/ATEC', 'MÊS', 'PRAZO', 'PRAZO EXECUÇÃO', 'DATA CONCLUSÃO', 'MÊS CONCLUSÃO', 'DATA DE ENVIO DA PASTA', 'STATUS OBRA', 'NECESSIDADE LV', 'QUANTIDADE PROGRAMAÇÕES', 'PRIMEIRA PROGRAMAÇÃO', 'PRÓXIMA PROGRAMAÇÃO', 'ÚLTIMA PROGRAMAÇÃO', 'PROGRAMADA HOJE?', 'OBSERVAÇÃO', 'TESTE2', 'POSTE', 'CONDUTOR MT', 'CONDUTOR BT', 'TRAFO', 'MEDIDOR', 'META ANEEL', 'CHAVE RELIG', 'RELIGADOR', 'AVANÇO FÍSICO', 'PROJETADO R$', 'EXECUTADO EM CAMPO', 'MEDIÇÃO PARCIAL', 'LIBERADO PARA EXECUÇÃO', 'X', 'Y', 'ETAPA', 'RESPONSÁVEL', 'CICLO', 'META'],
    ['ÂNCORA', '', 'SIM', '', 'Não Iniciado', 'Obra em Execução', 'SIM', 'NS-1', 'LPT', '', '430100001', 'Projeto A', 'BACABAL', 'BACABAL', 'BCB', 'LIB/ATEC', 'PROJ', '', '', '', '', '', '', '', '', '', '', 'OBRA LIBERADA', '', '1', '', '21/04/2026', '', 'Não', '', '', '', '', '', '', '', '', '', '', '0%', '43,735.55', '-', '-', '-', '', '', 'ANDAMENTO', 'FRANCISCO', '', ''],
  ];

  const result = buildFilteredTopOpportunities(rows, { topN: 10, districtFilters: ['BACABAL'] });

  assert.equal(result.top[0].display, '430100001');
  assert.equal(result.top[0].displaySecondary, '');
});

test('usa NOTA para busca quando PEP nao esta preenchido', () => {
  const rows = [
    ['CONTRATO', 'PRIORIDADE EQTL', 'CARTEIRA 2026', 'DATA VISITA VALIDAÇÃO', 'RELATÓRIO SUPRESSÃO', 'STATUS SISBG', 'CARTEIRA EQTL', 'RASTREABILIDADE', 'PI', 'PEP', 'NOTA', 'DESCRITIVO', 'DISTRITAL', 'MUNICIPIO', 'SIGLA', 'STATUS', 'SISTEMA', 'MÊS INICIAR CARTEIRA EQTL', 'DATA ABER/LOG', 'DATA LIB/LOG', 'DATA LIB/ATEC', 'MÊS', 'PRAZO', 'PRAZO EXECUÇÃO', 'DATA CONCLUSÃO', 'MÊS CONCLUSÃO', 'DATA DE ENVIO DA PASTA', 'STATUS OBRA', 'NECESSIDADE LV', 'QUANTIDADE PROGRAMAÇÕES', 'PRIMEIRA PROGRAMAÇÃO', 'PRÓXIMA PROGRAMAÇÃO', 'ÚLTIMA PROGRAMAÇÃO', 'PROGRAMADA HOJE?', 'OBSERVAÇÃO', 'TESTE2', 'POSTE', 'CONDUTOR MT', 'CONDUTOR BT', 'TRAFO', 'MEDIDOR', 'META ANEEL', 'CHAVE RELIG', 'RELIGADOR', 'AVANÇO FÍSICO', 'PROJETADO R$', 'EXECUTADO EM CAMPO', 'MEDIÇÃO PARCIAL', 'LIBERADO PARA EXECUÇÃO', 'X', 'Y', 'ETAPA', 'RESPONSÁVEL', 'CICLO', 'META'],
    ['ÂNCORA', '', 'SIM', '', 'Não Iniciado', 'Obra em Execução', 'SIM', 'NS-1', 'LPT', '', '430075673', 'Projeto A', 'BACABAL', 'BACABAL', 'BCB', 'LIB/ATEC', 'PROJ', '', '', '', '', '', '', '', '', '', '', 'OBRA LIBERADA', '', '1', '', '21/04/2026', '', 'Não', '', '', '', '', '', '', '', '', '', '', '0%', '43,735.55', '-', '-', '-', '', '', 'ANDAMENTO', 'FRANCISCO', '', ''],
  ];

  const result = buildFilteredTopOpportunities(rows, { topN: 10, districtFilters: ['BACABAL'], searchQuery: '430075673' });

  assert.equal(result.top.length, 1);
  assert.equal(result.top[0].note, '430075673');
  assert.equal(result.top[0].display, '430075673');
});

test('filtra obras em andamento a partir de EXECUTADO EM CAMPO', () => {
  const rows = [
    ['CONTRATO', 'PRIORIDADE EQTL', 'CARTEIRA 2026', 'DATA VISITA VALIDAÇÃO', 'RELATÓRIO SUPRESSÃO', 'STATUS SISBG', 'CARTEIRA EQTL', 'RASTREABILIDADE', 'PI', 'PEP', 'NOTA', 'DESCRITIVO', 'DISTRITAL', 'MUNICIPIO', 'SIGLA', 'STATUS', 'SISTEMA', 'MÊS INICIAR CARTEIRA EQTL', 'DATA ABER/LOG', 'DATA LIB/LOG', 'DATA LIB/ATEC', 'MÊS', 'PRAZO', 'PRAZO EXECUÇÃO', 'DATA CONCLUSÃO', 'MÊS CONCLUSÃO', 'DATA DE ENVIO DA PASTA', 'STATUS OBRA', 'NECESSIDADE LV', 'QUANTIDADE PROGRAMAÇÕES', 'PRIMEIRA PROGRAMAÇÃO', 'PRÓXIMA PROGRAMAÇÃO', 'ÚLTIMA PROGRAMAÇÃO', 'PROGRAMADA HOJE?', 'OBSERVAÇÃO', 'TESTE2', 'POSTE', 'CONDUTOR MT', 'CONDUTOR BT', 'TRAFO', 'MEDIDOR', 'META ANEEL', 'CHAVE RELIG', 'RELIGADOR', 'AVANÇO FÍSICO', 'PROJETADO R$', 'EXECUTADO EM CAMPO', 'MEDIÇÃO PARCIAL', 'LIBERADO PARA EXECUÇÃO', 'X', 'Y', 'ETAPA', 'RESPONSÁVEL', 'CICLO', 'META'],
    ['ÂNCORA', '', 'SIM', '', 'Não Iniciado', 'Obra em Execução', 'SIM', 'NS-1', 'LPT', 'PEP-1', '430100001', 'Projeto A', 'BACABAL', 'BACABAL', 'BCB', 'LIB/ATEC', 'PROJ', '', '', '', '', '', '', '', '', '', '', 'OBRA LIBERADA', '', '1', '', '21/04/2026', '', 'Não', '', '', '', '', '', '', '', '', '', '', '0%', '43,735.55', '12,000.00', '-', '-', '', '', 'ANDAMENTO', 'FRANCISCO', '', ''],
    ['ÂNCORA', '', 'SIM', '', 'Não Iniciado', 'Obra em Execução', 'SIM', 'NS-2', 'LPT', 'PEP-2', '430100002', 'Projeto B', 'BACABAL', 'BACABAL', 'BCB', 'LIB/ATEC', 'PROJ', '', '', '', '', '', '', '', '', '', '', 'OBRA LIBERADA', '', '1', '', '21/04/2026', '', 'Não', '', '', '', '', '', '', '', '', '', '', '0%', '50,000.00', '-', '-', '-', '', '', 'ANDAMENTO', 'FRANCISCO', '', ''],
  ];

  const result = buildFilteredTopOpportunities(rows, { topN: 10, districtFilters: ['BACABAL'], progressFilters: ['EM ANDAMENTO'] });

  assert.equal(result.top.length, 1);
  assert.equal(result.top[0].note, '430100001');
  assert.equal(result.top[0].progressLabel, 'EM ANDAMENTO');
});

test('permite filtrar obras sem andamento quando EXECUTADO EM CAMPO estiver vazio', () => {
  const rows = [
    ['CONTRATO', 'PRIORIDADE EQTL', 'CARTEIRA 2026', 'DATA VISITA VALIDAÇÃO', 'RELATÓRIO SUPRESSÃO', 'STATUS SISBG', 'CARTEIRA EQTL', 'RASTREABILIDADE', 'PI', 'PEP', 'NOTA', 'DESCRITIVO', 'DISTRITAL', 'MUNICIPIO', 'SIGLA', 'STATUS', 'SISTEMA', 'MÊS INICIAR CARTEIRA EQTL', 'DATA ABER/LOG', 'DATA LIB/LOG', 'DATA LIB/ATEC', 'MÊS', 'PRAZO', 'PRAZO EXECUÇÃO', 'DATA CONCLUSÃO', 'MÊS CONCLUSÃO', 'DATA DE ENVIO DA PASTA', 'STATUS OBRA', 'NECESSIDADE LV', 'QUANTIDADE PROGRAMAÇÕES', 'PRIMEIRA PROGRAMAÇÃO', 'PRÓXIMA PROGRAMAÇÃO', 'ÚLTIMA PROGRAMAÇÃO', 'PROGRAMADA HOJE?', 'OBSERVAÇÃO', 'TESTE2', 'POSTE', 'CONDUTOR MT', 'CONDUTOR BT', 'TRAFO', 'MEDIDOR', 'META ANEEL', 'CHAVE RELIG', 'RELIGADOR', 'AVANÇO FÍSICO', 'PROJETADO R$', 'EXECUTADO EM CAMPO', 'MEDIÇÃO PARCIAL', 'LIBERADO PARA EXECUÇÃO', 'X', 'Y', 'ETAPA', 'RESPONSÁVEL', 'CICLO', 'META'],
    ['ÂNCORA', '', 'SIM', '', 'Não Iniciado', 'Obra em Execução', 'SIM', 'NS-1', 'LPT', 'PEP-1', '430100001', 'Projeto A', 'BACABAL', 'BACABAL', 'BCB', 'LIB/ATEC', 'PROJ', '', '', '', '', '', '', '', '', '', '', 'OBRA LIBERADA', '', '1', '', '21/04/2026', '', 'Não', '', '', '', '', '', '', '', '', '', '', '0%', '43,735.55', '-', '-', '-', '', '', 'ANDAMENTO', 'FRANCISCO', '', ''],
  ];

  const result = buildFilteredTopOpportunities(rows, { topN: 10, districtFilters: ['BACABAL'], progressFilters: ['SEM ANDAMENTO'] });

  assert.equal(result.top.length, 1);
  assert.equal(result.top[0].progressLabel, 'SEM ANDAMENTO');
});
test('agrupa obras por etapa e por base usando PROJETADO R$ e ETAPA', () => {
  const rows = [
    ['CONTRATO', 'PRIORIDADE EQTL', 'CARTEIRA 2026', 'DATA VISITA VALIDA��O', 'RELAT�RIO SUPRESS�O', 'STATUS SISBG', 'CARTEIRA EQTL', 'RASTREABILIDADE', 'PI', 'PEP', 'NOTA', 'DESCRITIVO', 'DISTRITAL', 'MUNICIPIO', 'SIGLA', 'STATUS', 'SISTEMA', 'M�S INICIAR CARTEIRA EQTL', 'DATA ABER/LOG', 'DATA LIB/LOG', 'DATA LIB/ATEC', 'M�S', 'PRAZO', 'PRAZO EXECU��O', 'DATA CONCLUS�O', 'M�S CONCLUS�O', 'DATA DE ENVIO DA PASTA', 'STATUS OBRA', 'NECESSIDADE LV', 'QUANTIDADE PROGRAMA��ES', 'PRIMEIRA PROGRAMA��O', 'PR�XIMA PROGRAMA��O', '�LTIMA PROGRAMA��O', 'PROGRAMADA HOJE?', 'OBSERVA��O', 'TESTE2', 'POSTE', 'CONDUTOR MT', 'CONDUTOR BT', 'TRAFO', 'MEDIDOR', 'META ANEEL', 'CHAVE RELIG', 'RELIGADOR', 'AVAN�O F�SICO', 'PROJETADO R$', 'EXECUTADO EM CAMPO', 'MEDI��O PARCIAL', 'LIBERADO PARA EXECU��O', 'X', 'Y', 'ETAPA', 'RESPONS�VEL', 'CICLO', 'META'],
    ['�NCORA', '', 'SIM', '', 'N�o Iniciado', 'Obra em Execu��o', 'SIM', 'NS-1', 'LPT', 'MA-2501012LPT1.3.0548', '430075673', 'Projeto A', 'BACABAL', 'BACABAL', 'BCB', 'LIB/ATEC', 'PROJ', '', '', '', '', '', '', '', '', '', '', 'OBRA LIBERADA', '', '1', '', '21/04/2026', '', 'N�o', '', '', '', '', '', '', '', '', '', '', '0%', '18.968,23', '-', '-', '-', '', '', 'ANDAMENTO', 'FRANCISCO', '', 'NAO INICIADA', ''],
    ['�NCORA', '', 'SIM', '', 'N�o Iniciado', 'Obra em Execu��o', 'SIM', 'NS-2', 'LPT', 'MA-2501012LPT1.3.0548', '430075674', 'Projeto B', 'SANTA INES', 'SANTA INES', 'STI', 'LIB/ATEC', 'PROJ', '', '', '', '', '', '', '', '', '', '', 'PROGRAMADA', '', '1', '', '30/04/2026', '', 'N�o', '', '', '', '', '', '', '', '', '', '', '0%', '11.008,93', '-', '-', '-', '', '', 'ANDAMENTO', 'FRANCISCO', '', 'NAO INICIADA', ''],
    ['�NCORA', '', 'SIM', '', 'N�o Iniciado', 'Obra em Execu��o', 'SIM', 'NS-3', 'LPT', 'MA-2501012LPT1.3.0548', '430075675', 'Projeto C', 'ITAPECURU MIRIM', 'ITAPECURU MIRIM', 'ITM', 'LIB/ATEC', 'PROJ', '', '', '', '', '', '', '', '', '', '', 'REPROGRAMAR', '', '1', '', '08/04/2026', '', 'N�o', '', '', '', '', '', '', '', '', '', '', '0%', '26.055,12', '-', '-', '-', '', '', 'ANDAMENTO', 'FRANCISCO', '', 'NAO INICIADA', ''],
  ];

  const result = buildObrasStatusSummary(rows);

  assert.equal(result.totalRows, 3);
  assert.equal(result.stages.length, 1);
  assert.equal(result.stages[0].stage, 'ANDAMENTO');
  assert.equal(result.stages[0].bases.length, 3);
  assert.equal(result.bases.length, 3);
  assert.equal(result.totalValue, 56032.28);
});
