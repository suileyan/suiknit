import type { Request, Response, NextFunction } from 'express';
import { getUserFromRequest, hasRoleAtLeast } from '@/utility/auth.js';
import type { RouteRule, HttpMethod } from '@/config/routeAccessRules.js';
import { routeAccessRules } from '@/config/routeAccessRules.js';

const matchRule = (req: Request): RouteRule | undefined => {
  const method = (req.method || 'ALL').toUpperCase() as HttpMethod;
  const path = (req.baseUrl + req.path) || req.originalUrl || '';
  for (const r of routeAccessRules) {
    const methodOk = !r.method || r.method === 'ALL' || r.method === method;
    if (!methodOk) continue;
    if (typeof r.path === 'string') {
      if (r.path.endsWith('*')) {
        const prefix = r.path.slice(0, -1);
        if (path.startsWith(prefix)) return r;
      } else if (path === r.path) {
        return r;
      }
    } else {
      if (r.path.test(path)) return r;
    }
  }
  return undefined;
};

export const routeAccessControl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const rule = matchRule(req);
    if (!rule) {
      next();
      return;
    }

    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ code: 401, message: '未授权', data: null });
      return;
    }

    if (!hasRoleAtLeast(user.role, rule.minRole)) {
      res.status(403).json({ code: 403, message: '权限不足', data: null });
      return;
    }

    // pass through
    next();
  } catch (_error) {
    res.status(500).json({ code: 500, message: '访问控制失败', data: null });
  }
};

export default {
  routeAccessControl
};
