import { createRequire } from 'node:module';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

const require = createRequire(import.meta.url);
const { loadProjectEnv } = require('./api/loadProjectEnv.js');

function createApiMiddleware(handler) {
  return async (req, res) => {
    const url = new URL(req.originalUrl || req.url || '/', 'http://localhost');
    req.query = req.query || Object.fromEntries(url.searchParams.entries());

    if (typeof req.body === 'undefined' && req.method !== 'GET' && req.method !== 'HEAD') {
      const chunks = [];
      await new Promise((resolve, reject) => {
        req.on('data', (chunk) => chunks.push(chunk));
        req.on('end', resolve);
        req.on('error', reject);
      });

      const rawBody = Buffer.concat(chunks).toString('utf8').trim();
      if (!rawBody) {
        req.body = {};
      } else {
        try {
          req.body = JSON.parse(rawBody);
        } catch {
          req.body = { rawBody };
        }
      }
    }

    if (typeof res.status !== 'function') {
      res.status = function status(code) {
        res.statusCode = code;
        return res;
      };
    }

    if (typeof res.json !== 'function') {
      res.json = function json(payload) {
        if (!res.headersSent) {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
        }
        res.end(JSON.stringify(payload));
        return res;
      };
    }

    return handler(req, res);
  };
}

function registerLocalApiMiddlewares(server) {
  const dropboxDiarioHandler = require('./api/dropbox-diario');
  const getProducaoFromDbHandler = require('./api/get-producao-from-db');
  const getOportunidadesHandler = require('./api/get-oportunidades');
  const getObrasStatusHandler = require('./api/get-obras-status');
  const initDbHandler = require('./api/init-db');
  const kaizenSyncHandler = require('./api/kaizen-sync');
  const getKaizenHistoryHandler = require('./api/get-kaizen-history');
  const weatherHandler = require('./api/weather');
  const uploadDiarioHandler = require('./api/upload-diario');
  const getProducaoLobbySnapshotHandler = require('./api/get-producao-lobby-snapshot');

  server.middlewares.use('/api/get-producao-from-db', createApiMiddleware(getProducaoFromDbHandler));
  server.middlewares.use('/api/get-producao-lobby-snapshot', createApiMiddleware(getProducaoLobbySnapshotHandler));
  server.middlewares.use('/api/get-oportunidades', createApiMiddleware(getOportunidadesHandler));
  server.middlewares.use('/api/get-obras-status', createApiMiddleware(getObrasStatusHandler));
  server.middlewares.use('/api/dropbox-diario', createApiMiddleware(dropboxDiarioHandler));
  server.middlewares.use('/api/init-db', createApiMiddleware(initDbHandler));
  server.middlewares.use('/api/kaizen-sync', createApiMiddleware(kaizenSyncHandler));
  server.middlewares.use('/api/get-kaizen-history', createApiMiddleware(getKaizenHistoryHandler));
  server.middlewares.use('/api/weather', createApiMiddleware(weatherHandler));
  server.middlewares.use('/api/upload-diario', createApiMiddleware(uploadDiarioHandler));
}

function localApiPlugin() {
  loadProjectEnv();

  return {
    name: 'local-api-middleware',
    configureServer(server) {
      registerLocalApiMiddlewares(server);
    },
    configurePreviewServer(server) {
      loadProjectEnv();
      registerLocalApiMiddlewares(server);
    },
  };
}

export default defineConfig({
  plugins: [vue(), localApiPlugin()],
  root: '.',
  server: {
    port: 5173,
    open: '/index.html',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return;
          if (id.includes('apexcharts') || id.includes('vue3-apexcharts')) return 'vendor-apexcharts';
          if (id.includes('jspdf')) return 'vendor-jspdf';
          if (id.includes('xlsx')) return 'vendor-xlsx';
          if (id.includes('html2canvas') || id.includes('html-to-image')) return 'vendor-export-image';
          if (id.includes('@tanstack')) return 'vendor-tanstack';
          if (id.includes('exceljs')) return 'vendor-exceljs';
          if (id.includes('aos')) return 'vendor-aos';
        },
      },
    },
  },
});
