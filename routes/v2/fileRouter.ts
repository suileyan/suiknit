import express, { Router } from 'express';
import { getPublicFile } from '@/controllers/v2/fileController.js';

const router: Router = express.Router();

/**
 * @openapi
 * /v2/file/public:
 *   get:
 *     summary: Get public resource (v2)
 *     description: Access public resources (v2 API)
 *     tags:
 *       - File V2
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
router.get('/public', getPublicFile);

export default router;