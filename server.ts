import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT) || 3000;
const host = '0.0.0.0';

app.use(express.json());

const distDir = path.resolve(__dirname, 'dist');
const hasDist = fs.existsSync(distDir);

if (hasDist) {
  app.use(express.static(distDir));
}
app.use(express.static(path.resolve(__dirname, 'public')));
app.use(express.static(__dirname));

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
    const distPath = path.join(distDir, htmlFile);
    if (hasDist && fs.existsSync(distPath)) {
      return res.sendFile(distPath);
    }
    const rootPath = path.join(__dirname, htmlFile);
    if (fs.existsSync(rootPath)) {
      return res.sendFile(rootPath);
    }
    res.status(404).send('Page not found');
  });

  if (page !== 'index') {
    app.get(`/${page}.html`, (_req, res) => {
      const distPath = path.join(distDir, `${page}.html`);
      if (hasDist && fs.existsSync(distPath)) {
        return res.sendFile(distPath);
      }
      res.sendFile(path.join(__dirname, `${page}.html`));
    });
  }
});

app.get('*', (_req, res) => {
  const indexDist = path.join(distDir, 'index.html');
  if (hasDist && fs.existsSync(indexDist)) {
    return res.sendFile(indexDist);
  }
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, host, () => {
  console.log(`Server is running at http://${host}:${port}`);
});
