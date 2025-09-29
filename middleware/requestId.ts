import type { Request, Response, NextFunction } from 'express';
import crypto from 'node:crypto';

export const requestId = (req: Request, res: Response, next: NextFunction): void => {
  const incoming = (req.get('x-request-id') || '').toString().trim();
  const id = incoming || crypto.randomUUID();
  (req as any)._requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
};

export default {
  requestId
};

