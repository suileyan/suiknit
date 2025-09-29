import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import User, { IUser, UserRole } from '@/models/User.js';

dotenv.config({ path: '.env.config' });

export type JwtUserPayload = {
  id: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
};

export const getTokenFromRequest = (req: Request): string | null => {
  const bearer = req.get('authorization');
  if (bearer && bearer.startsWith('Bearer ')) return bearer.slice(7);
  const headerToken = req.get('token');
  return headerToken || null;
};

export const verifyTokenAndDecode = (token: string): JwtUserPayload | null => {
  if (!token) return null;
  try {
    const secret = process.env.JWENCRPTION || 'your-secret-key';
    return jwt.verify(token, secret) as JwtUserPayload;
  } catch {
    return null;
  }
};

export const getAuthPayload = (req: Request): JwtUserPayload | null => {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifyTokenAndDecode(token);
};

export const getUserFromRequest = async (req: Request): Promise<IUser | null> => {
  const payload = getAuthPayload(req);
  if (!payload?.id) return null;
  try {
    const user = await User.findById(payload.id);
    return user || null;
  } catch {
    return null;
  }
};

// Role helpers (centralized definitions)
export const roleRank: Record<string, number> = {
  user: 1,
  admin: 2,
  moderator: 3
};

export const normalizeRole = (r: unknown): UserRole | null => {
  if (!r) return null;
  const s = String(r).toLowerCase().trim();
  if (s === 'user') return UserRole.USER;
  if (s === 'admin') return UserRole.ADMIN;
  if (s === 'moderator') return UserRole.MODERATOR;
  return null;
};

export const hasRoleAtLeast = (role: UserRole, min: UserRole): boolean => {
  const a = normalizeRole(role) || UserRole.USER;
  const m = normalizeRole(min) || UserRole.ADMIN;
  return (roleRank[a] ?? 0) >= (roleRank[m] ?? Number.MAX_SAFE_INTEGER);
};

export const hasHigherRole = (actor: IUser, targetRole: UserRole): boolean => {
  const a = normalizeRole((actor as any).role) || UserRole.USER;
  const t = normalizeRole(targetRole) || UserRole.USER;
  return (roleRank[a] ?? 0) > (roleRank[t] ?? 0);
};

export const canAssignRole = (actor: IUser, assignedRole: UserRole): boolean => {
  const a = normalizeRole((actor as any).role) || UserRole.USER;
  const r = normalizeRole(assignedRole) || UserRole.USER;
  return (roleRank[a] ?? 0) > (roleRank[r] ?? 0);
};

export default {
  getTokenFromRequest,
  verifyTokenAndDecode,
  getAuthPayload,
  getUserFromRequest,
  roleRank,
  normalizeRole,
  hasRoleAtLeast,
  hasHigherRole,
  canAssignRole
};

