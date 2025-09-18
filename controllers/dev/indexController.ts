import type { Request, Response } from 'express';

/**
 * @openapi
 * tags:
 *   name: Main Dev
 *   description: Main API endpoints (dev)
 */

/**
 * @openapi
 * /dev/:
 *   get:
 *     summary: Get Current Date
 *     description: Returns the current server date and time
 *     tags: [Main Dev]
 *     responses:
 *       200:
 *         description: Current date retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Success"
 *                 data:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-09-18T10:00:00.000Z"
 */

// GET 处理函数 (v2版本)
export const getIndex = (_req: Request, res: Response): void => {
  res.status(200).json({
    code: 200,
    message: 'Success',
    data: new Date().toISOString()
  });
};

/**
 * @openapi
 * /dev/:
 *   post:
 *     summary: Echo Request Details
 *     description: Returns detailed information about the incoming request
 *     tags: [Main Dev]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               exampleField:
 *                 type: string
 *                 example: "example value"
 *     responses:
 *       200:
 *         description: Request details echoed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "Success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     body:
 *                       type: object
 *                       example: { "exampleField": "example value" }
 *                     query:
 *                       type: object
 *                       example: { "param1": "value1" }
 *                     params:
 *                       type: object
 *                       example: {}
 *                     headers:
 *                       type: object
 *                       example: { "content-type": "application/json" }
 *                     ip:
 *                       type: string
 *                       example: "::1"
 */

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