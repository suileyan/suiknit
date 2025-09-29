import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import User from '@/models/User.js';
import { updateUserInfo as updateUserInfoService } from '@/services/authService.js';
import { getAuthPayload } from '@/utility/auth.js';


export const updateUserProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = getAuthPayload(req);
    const userId = payload?.id || null;
    if (!userId) {
      res.status(401).json({ code: 401, message: '未授权', data: null });
      return;
    }

    const { name, avatarPath } = req.body || {};
    const updated = await updateUserInfoService(userId, name, avatarPath);
    res.status(200).json(updated);
  } catch (_error) {
    res.status(500).json({ code: 500, message: '更新失败', data: null });
  }
};

function resolveAvatarPath(userAvatarPath?: string): { abs: string; contentType: string } {
  const uploadDir = process.env.UPLOAD_DIR || './resource/uploads';
  const defaultAbs = path.resolve('./resource/assets/default-avatar.svg');
  if (!userAvatarPath) {
    return { abs: defaultAbs, contentType: 'image/svg+xml' };
  }
  const p = userAvatarPath.replace(/\\/g, '/').replace(/^\.\//, '');
  const uploadDirNorm = uploadDir.replace(/\\/g, '/').replace(/^\.\//, '');
  const marker = 'resource/uploads/';
  let candidate: string;
  if (path.isAbsolute(p)) {
    candidate = p;
  } else if (p.startsWith(marker) || p.startsWith(uploadDirNorm)) {
    candidate = path.resolve(p);
  } else {
    candidate = path.resolve(path.join(uploadDirNorm, p));
  }
  const rootAbs = path.resolve(uploadDirNorm);
  const abs = path.resolve(candidate);
  if (!abs.startsWith(rootAbs) || !fs.existsSync(abs)) {
    return { abs: defaultAbs, contentType: 'image/svg+xml' };
  }
  const ext = path.extname(abs).toLowerCase();
  const map: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp'
  };
  return { abs, contentType: map[ext] || 'application/octet-stream' };
}

export const getMyAvatar = async (req: Request, res: Response): Promise<void> => {
  try {
    const payload = getAuthPayload(req);
    const userId = payload?.id || null;
    if (!userId) {
      res.status(401).json({ code: 401, message: '未授权', data: null });
      return;
    }
    const user = await User.findById(userId);
    const { abs, contentType } = resolveAvatarPath(user?.avatarPath);
    res.setHeader('Content-Type', contentType);
    fs.createReadStream(abs).pipe(res);
  } catch (_error) {
    res.status(500).json({ code: 500, message: '获取头像失败', data: null });
  }
};

export const getAvatarByUserId = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId);
    const { abs, contentType } = resolveAvatarPath(user?.avatarPath);
    res.setHeader('Content-Type', contentType);
    fs.createReadStream(abs).pipe(res);
  } catch (_error) {
    res.status(500).json({ code: 500, message: '获取头像失败', data: null });
  }
};
