import type { Request, Response, NextFunction } from 'express';

const shouldBlockKey = (key: string): boolean => {
  if (!key) return false;
  if (key === '__proto__' || key === 'constructor' || key === 'prototype') return true;
  if (key.startsWith('$')) return true;
  if (key.includes('.')) return true;
  return false;
};

const sanitizeKeys = (input: any): any => {
  if (!input || typeof input !== 'object') return input;
  if (Array.isArray(input)) return input.map(sanitizeKeys);
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(input)) {
    if (shouldBlockKey(k)) {
      // drop dangerous key entirely
      continue;
    }
    out[k] = sanitizeKeys(v);
  }
  return out;
};

export const mongoSanitizeLite = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    if (req.body && typeof req.body === 'object') (req as any).body = sanitizeKeys(req.body);
    if (req.params && typeof req.params === 'object') (req as any).params = sanitizeKeys(req.params);
    // 注意：不处理 req.query（Express 5 上不可写），查询参数请在各路由严格校验与白名单处理
  } catch {
    // ignore sanitize error
  }
  next();
};

export default {
  mongoSanitizeLite
};

