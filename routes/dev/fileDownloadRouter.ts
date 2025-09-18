import { Router } from 'express';
import { getDownloadToken, downloadFileById } from '@/controllers/dev/fileDownloadController.js';

const router = Router();

/**
 * @openapi
 * tags:
 *   name: File Download Dev
 *   description: File download management (dev API)
 */

/**
 * @openapi
 * /dev/file/download/token:
 *   post:
 *     summary: Generate Download Token
 *     description: Generate a temporary download token for file download
 *     tags: [File Download Dev]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fileId:
 *                 type: string
 *                 example: "file_1726492384567_a1b2c3d4e5f"
 *             required:
 *               - fileId
 *     responses:
 *       200:
 *         description: Download token generated successfully
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
 *                   example: "下载令牌生成成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     downloadUrl:
 *                       type: string
 *                       example: "/dev/file/download/file_1726492384567_a1b2c3d4e5f?key=token123"
 *       400:
 *         description: Missing file ID parameter
 *       401:
 *         description: Unauthorized access
 *       403:
 *         description: Insufficient permissions
 *       404:
 *         description: File not found
 *       429:
 *         description: Too many requests
 *       500:
 *         description: Server internal error
 */
router.post('/token', getDownloadToken);

/**
 * @openapi
 * /dev/file/download/{fileId}:
 *   get:
 *     summary: Download File by ID
 *     description: Download a file by its ID (requires authorization via query parameter)
 *     tags: [File Download Dev]
 *     parameters:
 *       - name: fileId
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 *           example: "file_1726492384567_a1b2c3d4e5f"
 *       - name: key
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           example: "token123"
 *     responses:
 *       200:
 *         description: File downloaded successfully
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Missing file ID or key parameter
 *       401:
 *         description: Invalid or expired token
 *       403:
 *         description: Token not match file
 *       404:
 *         description: File not found
 *       410:
 *         description: Token already used
 *       500:
 *         description: Server internal error
 */
router.get('/:fileId', downloadFileById);

export default router;