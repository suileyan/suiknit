import type { Request, Response } from 'express';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { redisClient } from '@/config/redisConfig.js';
import File from '@/models/File.js';
import FilePermission from '@/models/FilePermission.js';

dotenv.config({ path: '.env.config' });

/**
 * @openapi
 * tags:
 *   name: File Download Dev
 *   description: File download management (dev API)
 */

// 从环境变量获取下载配置
const downloadConfig = {
  downloadTokenSecret: process.env.DOWNLOAD_TOKEN_SECRET || 'download_secret_key',
  downloadTokenExpiresIn: process.env.DOWNLOAD_TOKEN_EXPIRES_IN || '5m', // 5分钟过期
  tokenRateLimit: parseInt(process.env.DOWNLOAD_TOKEN_RATE_LIMIT || '20', 10) // 20秒频率限制
};

// 验证JWT token并获取用户信息
function verifyToken(req: Request): { id: string; email: string; name: string } | null {
  const token = req.headers['authorization']?.replace('Bearer ', '') || req.headers['token'] as string;
  
  if (!token) {
    return null;
  }
  
  try {
    const secret = process.env.JWENCRPTION || 'your-secret-key';
    return jwt.verify(token, secret) as { id: string; email: string; name: string };
  } catch {
    return null;
  }
}

// 检查用户对文件的权限
async function checkFilePermission(fileId: string, userId: string): Promise<boolean> {
  try {
    // 查找文件权限记录
    const permission = await FilePermission.findOne({ fileId, userId });
    console.log('文件权限检查:', { fileId, userId, permission });
    
    // 如果没有找到权限记录，检查是否是公共文件
    if (!permission) {
      const file = await File.findById(fileId);
      console.log('文件信息:', { fileId, file });
      return false;
    }
    
    // 拥有任意权限都可以下载文件
    return true;
  } catch (error) {
    console.error('检查文件权限失败:', error);
    return false;
  }
}

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
export const getDownloadToken = async (req: Request, res: Response): Promise<void> => {
  try {
    // 验证token
    const user = verifyToken(req);
    if (!user) {
      res.status(401).json({
        code: 401,
        message: '未授权访问',
        data: null
      });
      return;
    }
    
    const { fileId } = req.body;
    
    if (!fileId) {
      res.status(400).json({
        code: 400,
        message: '缺少文件ID参数',
        data: null
      });
      return;
    }
    
    // 查找文件
    const file = await File.findById(fileId);
    if (!file) {
      res.status(404).json({
        code: 404,
        message: '文件不存在',
        data: null
      });
      return;
    }
    
    // 检查文件状态
    if (file.status !== 'active') {
      res.status(403).json({
        code: 403,
        message: '文件不可访问',
        data: null
      });
      return;
    }
    
    // 检查用户权限
    const hasPermission = await checkFilePermission(fileId, user.id);
    if (!hasPermission) {
      res.status(403).json({
        code: 403,
        message: '您没有下载此文件的权限',
        data: null
      });
      return;
    }
    
    // 检查Redis连接状态
    if (!redisClient.isOpen) {
      console.error('Redis客户端未连接');
      res.status(500).json({
        code: 500,
        message: 'Redis服务不可用',
        data: null
      });
      return;
    }
    
    // 检查频率限制 (20秒内不能重复生成令牌)
    const rateLimitKey = `download_token_rate_limit:${user.id}:${fileId}`;
    const lastRequestTime = await redisClient.get(rateLimitKey);
    
    if (lastRequestTime) {
      const timeSinceLastRequest = Date.now() - parseInt(lastRequestTime, 10);
      if (timeSinceLastRequest < downloadConfig.tokenRateLimit * 1000) {
        res.status(429).json({
          code: 429,
          message: `请在${downloadConfig.tokenRateLimit}秒后再试`,
          data: null
        });
        return;
      }
    }
    
    // 更新频率限制记录
    await redisClient.setEx(rateLimitKey, downloadConfig.tokenRateLimit, Date.now().toString());
    
    // 生成下载令牌 (使用文件ID+用户ID+服务器时间)
    const tokenPayload = {
      fileId,
      userId: user.id,
      timestamp: Date.now()
    };
    
    const downloadToken = (jwt.sign as any)(tokenPayload, downloadConfig.downloadTokenSecret, {
      expiresIn: downloadConfig.downloadTokenExpiresIn  // This should be '5m' or '300s'
    });
    console.log('生成令牌:', { tokenPayload, secret: downloadConfig.downloadTokenSecret, expiresIn: downloadConfig.downloadTokenExpiresIn });
    
    // 将令牌存储到Redis中，设置5分钟过期时间
    const redisKey = `download_token:${downloadToken}`;
    await redisClient.setEx(redisKey, 5 * 60, fileId); // 5分钟过期
    
    // 返回下载URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const downloadUrl = `${baseUrl}/dev/file/download/${fileId}?key=${downloadToken}`;
    
    res.status(200).json({
      code: 200,
      message: '下载令牌生成成功',
      data: {
        downloadUrl
      }
    });
  } catch (error) {
    console.error('生成下载令牌时出错:', error);
    // 记录更详细的错误信息
    if (error instanceof Error) {
      console.error('错误详情:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    res.status(500).json({
      code: 500,
      message: '生成下载令牌失败: ' + (error instanceof Error ? error.message : '未知错误'),
      data: null
    });
  }
};

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
export const downloadFileById = async (req: Request, res: Response): Promise<void> => {
  console.log('下载文件请求:', { 
    url: req.url, 
    originalUrl: req.originalUrl, 
    path: req.path, 
    params: req.params, 
    query: req.query 
  });
  
  try {
    const { fileId } = req.params;
    const { key: downloadToken } = req.query;
    
    console.log('下载请求参数:', { fileId, downloadToken });
    
    // 验证参数
    if (!fileId) {
      res.status(400).json({
        code: 400,
        message: '缺少文件ID参数',
        data: null
      });
      return;
    }
    
    if (!downloadToken || typeof downloadToken !== 'string') {
      console.log('缺少或无效的下载令牌参数:', { downloadToken, type: typeof downloadToken });
      res.status(400).json({
        code: 400,
        message: '缺少下载令牌参数',
        data: null
      });
      return;
    }
    
    // 查找文件
    const file = await File.findById(fileId);
    if (!file) {
      res.status(404).json({
        code: 404,
        message: '文件不存在',
        data: null
      });
      return;
    }
    
    // 检查文件状态
    if (file.status !== 'active') {
      res.status(403).json({
        code: 403,
        message: '文件不可访问',
        data: null
      });
      return;
    }
    
    // 验证下载令牌
    let decodedToken;
    try {
      console.log('验证令牌:', { downloadToken, secret: downloadConfig.downloadTokenSecret });
      decodedToken = jwt.verify(downloadToken, downloadConfig.downloadTokenSecret) as { 
        fileId: string; 
        userId: string; 
        timestamp: number 
      };
      console.log('令牌验证成功:', decodedToken);
    } catch (error) {
      console.error('令牌验证失败:', error);
      res.status(401).json({
        code: 401,
        message: '下载令牌无效或已过期',
        data: null
      });
      return;
    }
    
    // 检查令牌中的文件ID是否匹配
    if (decodedToken.fileId !== fileId) {
      res.status(403).json({
        code: 403,
        message: '下载令牌与文件不匹配',
        data: null
      });
      return;
    }
    
    // 检查用户是否有权限下载该文件
    const hasPermission = await checkFilePermission(fileId, decodedToken.userId);
    if (!hasPermission) {
      res.status(403).json({
        code: 403,
        message: '您没有下载此文件的权限',
        data: null
      });
      return;
    }
    
    // 检查Redis中是否存在该令牌
    const redisKey = `download_token:${downloadToken}`;
    const storedFileId = await redisClient.get(redisKey);
    
    if (!storedFileId) {
      res.status(410).json({
        code: 410,
        message: '下载令牌已过期或已被使用',
        data: null
      });
      return;
    }
    
    // 检查Redis中存储的文件ID是否匹配
    if (storedFileId !== fileId) {
      res.status(403).json({
        code: 403,
        message: '下载令牌与文件不匹配',
        data: null
      });
      return;
    }
    
    // 删除Redis中的令牌，确保一次性使用
    await redisClient.del(redisKey);
    
    // 检查文件是否存在
    const filePath = path.resolve(file.path);
    try {
      await fs.access(filePath);
    } catch (_error) {
      res.status(404).json({
        code: 404,
        message: '文件不存在于磁盘上',
        data: null
      });
      return;
    }
    
    // 设置响应头
    res.setHeader('Content-Type', file.type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.name)}"`);
    res.setHeader('Content-Length', file.size);
    
    // 发送文件
    const fileStream = fsSync.createReadStream(filePath);
    fileStream.pipe(res);
    
    // 记录下载事件 (可选)
    console.log(`文件 ${file.name} (${fileId}) 被用户 ${decodedToken.userId} 下载`);
  } catch (error) {
    console.error('下载文件时出错:', error);
    res.status(500).json({
      code: 500,
      message: '文件下载失败',
      data: null
    });
  }
};