import type { Request, Response } from 'express';

/**
 * @openapi
 * tags:
 *   name: Main V2
 *   description: Main API endpoints (v2)
 */

// GET 处理函数 (v2版本)
export const getIndex = (_req: Request, res: Response): void => {
  res.status(200).json({
    code: 200,
    message: 'Success',
    data: new Date().toISOString()
  });
};

// POST 处理函数 (v2版本)
export const postIndex = (req: Request, res: Response): void => {
  res.status(200).json({
    code: 200,
    message: 'Success',
    data: {
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
      ip: req.ip
    }
  });
};