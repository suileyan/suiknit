import express, { Router } from 'express';
import { getIndex, postIndex } from '@/controllers/v1/indexController.js';

const router: Router = express.Router();

/**
 * @openapi
 * /:
 *   get:
 *     summary: Get current date
 *     description: Returns current date and time
 *     tags:
 *       - Main
 *     responses:
 *       200:
 *         description: Current date
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
 *                   example: "2023-01-01T00:00:00.000Z"
 */
router.get('/', getIndex);

/**
 * @openapi
 * /:
 *   post:
 *     summary: Echo request details
 *     description: Returns request details including body, query, params, headers, and IP
 *     tags:
 *       - Main
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             example:
 *               key: "value"
 *     responses:
 *       200:
 *         description: Request details
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
 *                       example: { "key": "value" }
 *                     query:
 *                       type: object
 *                       example: { "param": "value" }
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
router.post('/', postIndex);

export default router;