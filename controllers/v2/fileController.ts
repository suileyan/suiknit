import type { Request, Response } from 'express';

/**
 * @openapi
 * tags:
 *   name: File V2
 *   description: File management (v2 API)
 */

// 获取公共资源 (v2版本)
export const getPublicFile = (_req: Request, res: Response): void => {
  res.status(200).json({
    code: 200,
    message: 'Success',
    data: 'Public resource content'
  });
};