import type { Request, Response, NextFunction } from 'express';
import { IUser, UserRole } from '@/models/User.js';
import { getUserFromRequest, hasRoleAtLeast, normalizeRole } from '@/utility/auth.js';

export interface AuthedLocals {
  currentUser?: IUser;
}

export const authenticate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      res.status(401).json({ code: 401, message: '未授权', data: null });
      return;
    }
    (res.locals as AuthedLocals).currentUser = user;
    next();
  } catch {
    res.status(401).json({ code: 401, message: '令牌验证失败', data: null });
  }
};

export const requireMinRole = (minRole: UserRole) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const current = (res.locals as AuthedLocals).currentUser;
    if (!current) {
      res.status(401).json({ code: 401, message: '未授权', data: null });
      return;
    }
    const currentRole = normalizeRole((current as any).role) || UserRole.USER;
    const min = normalizeRole(minRole) || UserRole.ADMIN;
    const ok = hasRoleAtLeast(currentRole, min);
    if (!ok) {
      res.status(403).json({ code: 403, message: '权限不足', data: null });
      return;
    }
    next();
  };
};

export default {
  authenticate,
  requireMinRole
};
