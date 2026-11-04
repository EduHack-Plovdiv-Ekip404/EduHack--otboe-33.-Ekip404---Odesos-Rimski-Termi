import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import 'dotenv/config';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();

  // Parse command line arguments like --port 3000 --host 0.0.0.0
  const args = process.argv.slice(2);
  function getArg(flag: string): string | undefined {
    const idx = args.indexOf(flag);
    if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
    const prefix = `${flag}=`;
    const match = args.find(a => a.startsWith(prefix));
    return match ? match.slice(prefix.length) : undefined;
  }

  const cliPort = getArg('--port') || getArg('-p');
  const cliHost = getArg('--host') || getArg('-h');
  // In AI Studio, the dev server must always bind to port 3000 (never process.env.PORT which is 8080 used by Nginx)
  const port = cliPort ? Number(cliPort) : 3000;
  const host = cliHost || '0.0.0.0';

  app.use(express.json());

  // Health checks for container pre-warming and proxies
  app.get(['/healthz', '/health', '/api/health'], (_req, res) => {
    res.status(200).json({ status: 'ok', time: new Date().toISOString() });
  });

  const distDir = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(distDir);

  // Mount Vite middleware in development
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'custom',
    });
    app.use(vite.middlewares);
  }

  // Serve static files from workspace root and public folder
  app.use(express.static(path.resolve(__dirname, 'public')));
  app.use(express.static(__dirname));
  if (hasDist) {
    app.use(express.static(distDir));
  }

  const pages = [
    'index',
    'history',
    'where',
    'when',
    'why',
    'how',
    'before',
    'now',
    'after',
    'gallery',
  ];

  pages.forEach((page) => {
    const route = page === 'index' ? '/' : `/${page}`;
    app.get(route, (_req, res) => {
      const htmlFile = `${page}.html`;
      const rootPath = path.join(__dirname, htmlFile);
      if (fs.existsSync(rootPath)) {
        return res.sendFile(rootPath);
      }
      const distPath = path.join(distDir, htmlFile);
      if (hasDist && fs.existsSync(distPath)) {
        return res.sendFile(distPath);
      }
      res.status(404).send('Page not found');
    });

    if (page !== 'index') {
      app.get(`/${page}.html`, (_req, res) => {
        const rootPath = path.join(__dirname, `${page}.html`);
        if (fs.existsSync(rootPath)) {
          return res.sendFile(rootPath);
        }
        const distPath = path.join(distDir, `${page}.html`);
        if (hasDist && fs.existsSync(distPath)) {
          return res.sendFile(distPath);
        }
        res.status(404).send('Page not found');
      });
    }
  });

  app.get('*', (_req, res) => {
    const rootIndex = path.join(__dirname, 'index.html');
    if (fs.existsSync(rootIndex)) {
      return res.sendFile(rootIndex);
    }
    const indexDist = path.join(distDir, 'index.html');
    if (hasDist && fs.existsSync(indexDist)) {
      return res.sendFile(indexDist);
    }
    res.status(404).send('Not found');
  });

  const server = app.listen(port, host, () => {
    console.log(`Server is running at http://${host}:${port}`);
  });

  server.on('error', (err: NodeJS.ErrnoException) => {
    console.error('Server error:', err);
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use.`);
    }
  });

  const shutdown = () => {
    console.log('Shutting down server gracefully...');
    server.close(() => {
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
