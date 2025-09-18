import express, { Router } from 'express';
import authRoutes from '@/routes/v1/auth.js';
import fileRoutes from '@/routes/v1/fileRouter.js';
import indexRoutes from '@/routes/v1/index.js';

const router: Router = express.Router();

/**
 * @openapi
 * /v1/:
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
router.use('/auth', authRoutes);
router.use('/file', fileRoutes);
router.use('/', indexRoutes);

export default router;