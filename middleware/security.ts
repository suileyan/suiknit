import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import compression from 'compression';

// Helmet with safe defaults; relax CSP for Swagger/inline examples
export const securityHeaders = (): ((req: Request, res: Response, next: NextFunction) => void) =>
  helmet({
    contentSecurityPolicy: false, // disable strict CSP to avoid breaking Swagger/example page; enable in prod with proper policy
    crossOriginEmbedderPolicy: false
  });

export const compressionMiddleware = compression({
  threshold: 1024 // compress payloads >1KB
});

export default {
  securityHeaders,
  compressionMiddleware
};

