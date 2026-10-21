import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import fs from 'fs';
import authRoutes from './routes/auth.routes.js';
import documentRoutes from './routes/document.routes.js';
import adminRoutes from './routes/admin.routes.js';
import { config } from './config/index.js';

export const app = express();

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:'],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);

app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), platform: 'TrustVault' });
});

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/admin', adminRoutes);

// Unified Production Static Serving (Serves React frontend if built)
const frontendDistCandidates = [
  path.resolve(process.cwd(), '../frontend/dist'),
  path.resolve(process.cwd(), 'frontend/dist'),
  path.resolve(process.cwd(), 'dist/frontend'),
];

const foundDist = frontendDistCandidates.find((dir) => fs.existsSync(dir));

if (foundDist) {
  app.use(express.static(foundDist));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api') || req.path === '/health') {
      return next();
    }
    res.sendFile(path.join(foundDist, 'index.html'));
  });
}

// 404 Handler for API routes
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found', message: 'Requested endpoint does not exist.' });
});

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred.';
  res.status(statusCode).json({
    error: err.name || 'InternalServerError',
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});
