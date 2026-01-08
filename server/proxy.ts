import { createProxyMiddleware } from 'http-proxy-middleware';
import type { Express } from 'express';

const PYTHON_BACKEND_URL = process.env.PYTHON_BACKEND_URL || 'http://localhost:8000';

export function setupProxy(app: Express) {
  // Proxy all /api routes to Python backend
  app.use('/api', createProxyMiddleware({
    target: PYTHON_BACKEND_URL,
    changeOrigin: true,
    logLevel: 'warn',
    onError: (err, _req, res: any) => {
      console.error('[Proxy] Error:', err.message);
      if (res.writeHead) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Backend service unavailable' }));
      }
    },
  }));

  // Proxy /objects routes to Python backend
  app.use('/objects', createProxyMiddleware({
    target: PYTHON_BACKEND_URL,
    changeOrigin: true,
    logLevel: 'warn',
  }));

  // Proxy /public-objects routes to Python backend
  app.use('/public-objects', createProxyMiddleware({
    target: PYTHON_BACKEND_URL,
    changeOrigin: true,
    logLevel: 'warn',
  }));
}
