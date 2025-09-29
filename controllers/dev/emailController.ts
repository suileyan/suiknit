import type { Request, Response } from 'express';
import { sendEmailVerificationCode } from '@/services/authService.js';
import { ValidationError, RateLimitError } from '@/exceptions/AppError.js';

export const sendEmailCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, type } = req.body || {};
    const normalizedEmail = typeof email === 'string' ? email.trim() : '';
    const normalizedType = typeof type === 'string' && type.trim() ? type.trim() : 'register';

    if (!normalizedEmail) {
      res.status(400).json({ code: 400, message: '邮箱不能为空', data: null });
      return;
    }

    const forwardedFor = req.headers['x-forwarded-for'];
    const clientIp =
      (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor)?.split(',')[0]?.trim() ||
      req.ip || (req.socket as any)?.remoteAddress || '';

    const ok = await sendEmailVerificationCode(normalizedEmail, normalizedType, clientIp);
    if (!ok) {
      res.status(500).json({ code: 500, message: '验证码发送失败', data: null });
      return;
    }

    res.status(200).json({ code: 200, message: '验证码发送成功', data: null });
  } catch (error) {
    if (error instanceof ValidationError) {
      res.status(400).json({ code: 400, message: (error as any).message, data: null });
      return;
    }
    if (error instanceof RateLimitError) {
      res.status(429).json({ code: 429, message: (error as any).message, data: null });
      return;
    }
    console.error('发送邮箱验证码时发生错误:', error);
    res.status(500).json({ code: 500, message: '验证码发送失败', data: null });
  }
};
