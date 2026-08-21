import express, { Request, Response } from 'express';
import http from 'http';
import path from 'path';
import {
  createExpressApp,
  sanitizeExistingBookings,
  sanitizeExistingServiceOrders,
  getPaynow,
  cleanGuestNotes,
  getHostAuthenticatedSupabaseClient,
  type PaymentTransactionRecord
} from './server/app';

// Re-export core backend functions & types for backwards-compatibility
export {
  createExpressApp,
  sanitizeExistingBookings,
  sanitizeExistingServiceOrders,
  getPaynow,
  cleanGuestNotes,
  getHostAuthenticatedSupabaseClient,
  type PaymentTransactionRecord
};

export async function startServer() {
  const app = createExpressApp();
  const server = http.createServer(app);
  const PORT = 3000;

  // Run startup clean sweeps
  setTimeout(() => {
    sanitizeExistingBookings();
    sanitizeExistingServiceOrders();
  }, 2000);

  // Vite middleware in development (dynamically imported so production bundles never evaluate Vite)
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: server
        }
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`The Haven Guest House Server running on http://localhost:${PORT}`);
  });

  return { app, server };
}

if (!process.env.NETLIFY && process.env.NODE_ENV !== 'test') {
  startServer().catch((err) => {
    console.error('Failed to start server:', err);
  });
}
