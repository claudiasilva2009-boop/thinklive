import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createApiApp } from './server/app';
import { startNewsScheduler } from './server/newsService';

const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  startNewsScheduler();
  const app = createApiApp();

  // Vite or Static Frontend
  if (process.env.NODE_ENV === 'production') {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Thinklive server running on http://localhost:${PORT}`);
  });
}

startServer();
