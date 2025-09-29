import type { Request, Response, NextFunction } from 'express';
import corsConfig from '@/config/corsConfig.js';

// Validate request basics (skip for file uploads)
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const contentType = req.get('Content-Type');
  const skipValidationPaths = [
    '/file/upload/chunk',
    '/file/upload/single',
    '/file/upload/multiple'
  ];
  const shouldSkipValidation = skipValidationPaths.some((p) => req.originalUrl.includes(p));
  if (!shouldSkipValidation && (req.method === 'POST' || req.method === 'PUT')) {
    if (!contentType || !contentType.includes('application/json')) {
      res.status(400).json({ code: 400, message: 'Content-Type must be application/json', data: null });
      return;
    }
  }
  next();
};

// CORS middleware with whitelist/blacklist logic
export const cors = (req: Request, res: Response, next: NextFunction): void => {
  const allowedOrigins = corsConfig.allowedOrigins;
  const blockedOrigins = corsConfig.blockedOrigins;
  const origin = req.get('Origin') || undefined;

  if (origin && blockedOrigins.includes(origin)) {
    res.status(403).json({ code: 403, message: 'Origin is blocked', data: null });
    return;
  }

  if (allowedOrigins.length > 0) {
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
  } else {
    res.header('Access-Control-Allow-Origin', origin ?? '*');
  }

  res.header('Access-Control-Allow-Methods', corsConfig.allowedMethods.join(', '));
  res.header('Access-Control-Allow-Headers', corsConfig.allowedHeaders.join(', '));
  res.header('Access-Control-Expose-Headers', corsConfig.exposedHeaders.join(', '));
  res.header('Access-Control-Allow-Credentials', String(corsConfig.credentials));
  res.header('Access-Control-Max-Age', String(corsConfig.maxAge));

  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
};

// Simple request logger
export const requestLogger = (req: Request, _res: Response, next: NextFunction): void => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
};

export default { validateRequest, cors, requestLogger };
