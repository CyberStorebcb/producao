# Robo de Oportunidades

Este robo calcula as top oportunidades a partir da planilha do Dropbox `ACOM-PROJETOS-2025.xlsx`.

Fonte atual:

- aba utilizada: `BASE CLIENTES`
- filtro 1: `DISTRITAL`
- filtro 2: `STATUS ACOMPANHAMENTO`
- campo de ranking: `CUSTO DA OBRA`

Filtros padrao aplicados automaticamente:

- distritais: `BACABAL`, `ITAPECURU MIRIM`, `PEDREIRAS`, `SANTA INÊS`
- status: `NAO LIBERADA`, `OBRA LIBERADA`, `PROGRAMADA`, `REPROGRAMAR`

## Endpoint

- `GET /api/get-oportunidades`
- Query params:
  - `topN`: quantidade de oportunidades retornadas por base. Padrao: `10`
  - `districts`: lista separada por virgula para sobrescrever o filtro distrital
  - `statuses`: lista separada por virgula para sobrescrever o filtro de status

Configuracao opcional:

- `OPORTUNIDADES_DROPBOX_URL`: sobrescreve a URL padrao da planilha no Dropbox

## Script local

Executa o robo no terminal e imprime o JSON consolidado:

```powershell
npm run robot:oportunidades
```

Com parametros:

```powershell
npm run robot:oportunidades -- --topN=5 --districts=BACABAL,SANTA%20INÊS --statuses=PROGRAMADA,REPROGRAMAR
```

## Requisitos

- acesso de rede ao arquivo do Dropbox