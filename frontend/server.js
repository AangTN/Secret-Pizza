import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import express from 'express';
import { createServer as createViteServer } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const resolve = (targetPath) => path.resolve(__dirname, targetPath);
const isProd = process.env.NODE_ENV === 'production' || process.argv.includes('--prod');
const port = Number(process.env.PORT) || 4173;

async function createServer() {
  const app = express();
  let vite;
  let template;
  let render;

  if (!isProd) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
  } else {
    app.use('/assets', express.static(resolve('dist/client/assets'), {
      immutable: true,
      maxAge: '1y',
      index: false,
    }));
    app.use(express.static(resolve('dist/client'), { index: false }));

    template = await fs.readFile(resolve('dist/client/index.html'), 'utf-8');
    const entryServerUrl = pathToFileURL(resolve('dist/server/entry-server.js')).href;
    ({ render } = await import(entryServerUrl));
  }

  app.use('*', async (req, res) => {
    const url = req.originalUrl;

    try {
      let html;
      let appHtml = '';

      if (!isProd) {
        const rawTemplate = await fs.readFile(resolve('index.html'), 'utf-8');
        const transformedTemplate = await vite.transformIndexHtml(url, rawTemplate);
        const { render: devRender } = await vite.ssrLoadModule('/src/entry-server.jsx');
        appHtml = await devRender(url);
        html = transformedTemplate.replace('<!--ssr-outlet-->', appHtml);
      } else {
        appHtml = await render(url);
        html = template.replace('<!--ssr-outlet-->', appHtml);
      }

      res
        .status(200)
        .set({ 'Content-Type': 'text/html' })
        .end(html);
    } catch (error) {
      if (vite) {
        vite.ssrFixStacktrace(error);
      }
      console.error(error);
      res.status(500).end(error?.stack || String(error));
    }
  });

  app.listen(port, () => {
    const mode = isProd ? 'production' : 'development';
    console.log(`[SSR] ${mode} server running at http://localhost:${port}`);
  });
}

createServer();