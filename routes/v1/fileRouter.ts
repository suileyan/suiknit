import express, { Router } from 'express';
import { getPublic } from '@/controllers/v1/fileController.js';

const router: Router = express.Router();

/**
 * @openapi
 * /v1/file/public:
 *   get:
 *     summary: Get public resource
 *     description: Access public resources
 *     tags:
 *       - File
 *     responses:
 *       200:
 *         description: Public resource
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
 *                   example: "Public resource content"
 */
router.get('/public', getPublic);

export default router;