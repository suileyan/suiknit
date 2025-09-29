import type { Request, Response, NextFunction } from 'express';

const sanitizeString = (input: string): string => {
  if (!input) return input;
  let s = input;
  // Remove script tags
  s = s.replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script>/gi, '');
  // Neutralize javascript: URLs
  s = s.replace(/javascript\s*:/gi, '');
  // Strip control chars except CRLF/TAB
  s = Array.from(s)
    .filter((ch) => {
      const code = ch.charCodeAt(0);
      if (code === 9 || code === 10 || code === 13) return true; // TAB/LF/CR
      if (code < 32 || code === 127) return false; // other control chars
      return true;
    })
    .join('');
  // Trim excessive whitespace
  s = s.trim();
  return s;
};

const sanitize = (value: any): any => {
  if (typeof value === 'string') return sanitizeString(value);
  if (Array.isArray(value)) return value.map(sanitize);
  if (value && typeof value === 'object') {
    const out: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) out[k] = sanitize(v);
    return out;
  }
  return value;
};

export const sanitizeInput = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    if (req.body) (req as any).body = sanitize(req.body);
    if (req.query) (req as any).query = sanitize(req.query);
    if (req.params) (req as any).params = sanitize(req.params);
    next();
  } catch {
    next();
  }
};

export default {
  sanitizeInput
};
