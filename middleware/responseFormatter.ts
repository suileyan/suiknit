import { Request, Response, NextFunction } from 'express';
import { writeLog } from '../utility/logger.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.config' });

type Wrapped = {
  ok: boolean;
  status: number;
  message: string;
  body: any;
  timestamp: string;
  'time-consuming': number; // milliseconds
};

interface CustomResponse extends Response {
  json: (data: any) => this;
}

// Helpers to detect and normalize payload shapes
const isWrappedShape = (v: any): boolean => {
  return !!(
    v && typeof v === 'object' &&
    'ok' in v && typeof (v as any).ok === 'boolean' &&
    'status' in v && typeof (v as any).status === 'number' &&
    'body' in v
  );
};

const isLegacyShape = (v: any): boolean => {
  return !!(v && typeof v === 'object' && 'code' in v && 'data' in v);
};

const unwrapOnce = (v: any): { body: any; msg?: string } => {
  if (isWrappedShape(v)) {
    return { body: (v as any).body, msg: typeof (v as any).message === 'string' ? (v as any).message : undefined };
  }
  if (isLegacyShape(v)) {
    return { body: (v as any).data, msg: typeof (v as any).message === 'string' ? (v as any).message : undefined };
  }
  return { body: v };
};

const unwrapDeep = (v: any): { body: any; msgChain: string[] } => {
  const messages: string[] = [];
  let current = v;
  // Avoid excessive recursion; unwrap up to 5 layers defensively
  for (let i = 0; i < 5; i++) {
    const { body, msg } = unwrapOnce(current);
    if (msg) messages.push(msg);
    if (body === current) break; // no more unwrap
    current = body;
    if (!isWrappedShape(current) && !isLegacyShape(current)) break;
  }
  return { body: current, msgChain: messages };
};

// Enforce a consistent response envelope across all JSON responses
export function unifiedResponseMiddleware(req: Request, res: CustomResponse, next: NextFunction): void {
  const start = process.hrtime.bigint();
  const originalJson = res.json;

  res.json = function (this: Response, payload: any) {
    const status = res.statusCode || 200;
    const ok = status >= 200 && status < 400;
    const now = new Date().toISOString();
    const end = process.hrtime.bigint();
    const cost = Number(end - start) / 1e6; // ms

    // Normalize payload to a single-layer body and collect messages (outermost first)
    const { body: normalizedBody, msgChain } = unwrapDeep(payload);

    // Prefer message from payload if provided; fall back to default
    const message = (msgChain.find(m => !!m) ?? (ok ? 'success' : 'error')) as string;

    const wrapped: Wrapped = {
      ok,
      status,
      message,
      body: normalizedBody,
      timestamp: now,
      'time-consuming': cost
    };

    return originalJson.call(this, wrapped);
  } as any;

  next();
}

// Lightweight logger that does not alter the response body
export function loggingMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const cost = Number(end - start) / 1e6; // ms
    if (process.env.ISLOG === 'true') {
      const status = res.statusCode || 200;
      writeLog(req, { path: req.originalUrl }, status, cost).catch(err => console.error('日志记录失败:', err));
    }
  });
  next();
}

export default {
  unifiedResponseMiddleware,
  loggingMiddleware
};
