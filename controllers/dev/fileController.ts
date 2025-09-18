import type { Request, Response } from 'express';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { verifyJWT } from '@/utility/jwt.js';
import File from '@/models/File.js';
import FilePermission from '@/models/FilePermission.js';
import { FilePermissionRole } from '@/models/FilePermission.js';

dotenv.config({ path: '.env.config' });

/**
 * @openapi
 * tags:
 *   name: File Dev
 *   description: File management (dev API)
 */

// 文件类型映射表
const fileTypeMap: { [key: string]: string } = {
  // 文档
  'doc': 'document',
  'docx': 'document',
  'xls': 'document',
  'xlsx': 'document',
  'ppt': 'document',
  'pptx': 'document',
  'pdf': 'document',
  'txt': 'document',
  'md': 'document',
  'csv': 'document',
  'rtf': 'document',
  'ods': 'document',
  'odt': 'document',
  'odp': 'document',
  'pages': 'document',
  'numbers': 'document',
  'key': 'document',

  // 图片
  'jpg': 'image',
  'jpeg': 'image',
  'png': 'image',
  'gif': 'image',
  'bmp': 'image',
  'webp': 'image',
  'tiff': 'image',
  'tif': 'image',
  'svg': 'image',
  'ico': 'image',
  'heic': 'image',
  'psd': 'image',
  'ai': 'image',
  'eps': 'image',

  // 音频
  'mp3': 'audio',
  'wav': 'audio',
  'flac': 'audio',
  'aac': 'audio',
  'ogg': 'audio',
  'm4a': 'audio',
  'wma': 'audio',
  'amr': 'audio',
  'aiff': 'audio',
  'mid': 'audio',
  'midi': 'audio',

  // 视频
  'mp4': 'video',
  'avi': 'video',
  'mov': 'video',
  'mkv': 'video',
  'flv': 'video',
  'wmv': 'video',
  'webm': 'video',
  '3gp': 'video',
  'mpeg': 'video',
  'mpg': 'video',
  'm4v': 'video',

  // 压缩文件
  'zip': 'archive',
  'rar': 'archive',
  '7z': 'archive',
  'tar': 'archive',
  'gz': 'archive',
  'bz2': 'archive',
  'xz': 'archive',
  'iso': 'archive',
  'jar': 'archive',
  'war': 'archive',
  'ear': 'archive',

  // 代码/脚本
  'js': 'code',
  'ts': 'code',
  'py': 'code',
  'java': 'code',
  'c': 'code',
  'cpp': 'code',
  'cs': 'code',
  'html': 'code',
  'css': 'code',
  'json': 'code',
  'xml': 'code',
  'sh': 'code',
  'bat': 'code',
  'php': 'code',
  'rb': 'code',
  'go': 'code',
  'rs': 'code',
  'swift': 'code',
  'kt': 'code',
  'kts': 'code',
  'dart': 'code',
  'm': 'code',
  'pl': 'code',

  // 字体
  'ttf': 'font',
  'otf': 'font',
  'woff': 'font',
  'woff2': 'font',
  'eot': 'font',
  'fon': 'font',

  // 数据库/数据文件
  'db': 'data',
  'sqlite': 'data',
  'mdb': 'data',
  'accdb': 'data',
  'jsonl': 'data',
  'yaml': 'data',
  'yml': 'data',
  'parquet': 'data',
  'avro': 'data',

  // 电子书
  'epub': 'ebook',
  'mobi': 'ebook',
  'azw': 'ebook',
  'azw3': 'ebook',
  'ibooks': 'ebook',

  // 其他可执行/系统文件
  'exe': 'other',
  'dll': 'other',
  'apk': 'other',
  'dmg': 'other',
  'bin': 'other',
  'so': 'other',
  'deb': 'other',
  'rpm': 'other',
  'app': 'other'
};

// 从环境变量获取文件上传配置
const uploadConfig = {
  uploadDir: process.env.UPLOAD_DIR || './resource/uploads',
  maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10), // 默认10MB
  allowedTypes: process.env.ALLOWED_FILE_TYPES?.split(',') || ['image/*', 'text/*', 'application/pdf'],
  enableChunkedUpload: process.env.ENABLE_CHUNKED_UPLOAD === 'true',
  chunkDir: process.env.CHUNK_DIR || './resource/chunks'
};

// 获取文件类型
function getFileType(extension: string): string {
  const ext = extension.toLowerCase().substring(1); // 移除点号并转为小写
  return fileTypeMap[ext] || 'other';
}

// 确保上传目录存在
async function ensureUploadDir(): Promise<void> {
  try {
    await fs.mkdir(uploadConfig.uploadDir, { recursive: true });
    if (uploadConfig.enableChunkedUpload) {
      await fs.mkdir(uploadConfig.chunkDir, { recursive: true });
    }
  } catch (error) {
    console.error('创建上传目录失败:', error);
    throw error;
  }
}

// 验证文件类型
function isValidFileType(extension: string): boolean {
  const fileType = getFileType(extension);
  
  // 如果允许所有类型，直接返回true
  if (uploadConfig.allowedTypes.includes('*/*')) {
    return true;
  }
  
  // 检查具体的文件类型
  return uploadConfig.allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      const baseType = type.slice(0, -1); // 移除 /*
      return fileType.startsWith(baseType);
    }
    return type === fileType || type === '*/*';
  });
}

// 计算文件哈希
function calculateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fsSync.createReadStream(filePath);
    
    stream.on('data', chunk => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

// 验证JWT token并获取用户信息
function verifyToken(req: Request): { id: string; email: string; name: string } | null {
  const token = req.headers['authorization']?.replace('Bearer ', '') || req.headers['token'] as string;
  
  if (!token) {
    return null;
  }
  
  if (verifyJWT(token)) {
    // 解码token获取用户信息
    return jwt.decode(token) as { id: string; email: string; name: string } | null;
  }
  
  return null;
}

// 获取公共资源 (v2版本)
/**
 * @openapi
 * /dev/file/public:
 *   get:
 *     summary: Get Public File
 *     description: Retrieve public file information by file ID
 *     tags: [File Dev]
 *     parameters:
 *       - name: fileId
 *         in: query
 *         required: true
 *         schema:
 *           type: string
 *           example: "file_1726492384567_a1b2c3d4e5f"
 *     responses:
 *       200:
 *         description: Public file retrieved successfully
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
 *                     id:
 *                       type: string
 *                       example: "file_1726492384567_a1b2c3d4e5f"
 *                     name:
 *                       type: string
 *                       example: "example.txt"
 *                     path:
 *                       type: string
 *                       example: "uploads/example.txt"
 *                     size:
 *                       type: integer
 *                       example: 1024
 *                     type:
 *                       type: string
 *                       example: "text/plain"
 *                     extension:
 *                       type: string
 *                       example: ".txt"
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-09-18T10:00:00.000Z"
 *       400:
 *         description: Missing file ID parameter
 *       404:
 *         description: File not found
 *       403:
 *         description: File not accessible
 *       500:
 *         description: Server internal error
 */
export const getPublicFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { fileId } = req.query;
    
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
    
    // 对于公共资源，直接返回文件信息
    res.status(200).json({
      code: 200,
      message: 'Success',
      data: {
        id: file.id,
        name: file.name,
        path: file.path,
        size: file.size,
        type: file.type,
        extension: file.extension,
        createdAt: file.createdAt
      }
    });
  } catch (error) {
    console.error('获取公共资源时出错:', error);
    res.status(500).json({
      code: 500,
      message: '服务器内部错误',
      data: null
    });
  }
};

// 单文件上传
/**
 * @openapi
 * /dev/file/upload/single:
 *   post:
 *     summary: Upload Single File
 *     description: Upload a single file with metadata
 *     tags: [File Dev]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               description:
 *                 type: string
 *                 example: "File description"
 *               isPublic:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: "文件上传成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "file_1726492384567_a1b2c3d4e5f"
 *                     name:
 *                       type: string
 *                       example: "example.txt"
 *                     path:
 *                       type: string
 *                       example: "uploads/example.txt"
 *                     checksum:
 *                       type: string
 *                       example: "a1b2c3d4e5f67890"
 *                     size:
 *                       type: integer
 *                       example: 1024
 *                     type:
 *                       type: string
 *                       example: "text/plain"
 *       400:
 *         description: No file uploaded or invalid parameters
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: File upload failed
 */
export const uploadSingleFile = async (req: Request, res: Response): Promise<void> => {
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
    
    // 确保上传目录存在
    await ensureUploadDir();
    
    // 检查是否有文件上传
    if (!req.file) {
      res.status(400).json({
        code: 400,
        message: '没有文件被上传',
        data: null
      });
      return;
    }
    
    // 验证文件大小
    if (req.file.size > uploadConfig.maxFileSize) {
      res.status(400).json({
        code: 400,
        message: `文件大小超过限制 (${uploadConfig.maxFileSize} bytes)`,
        data: null
      });
      return;
    }
    
    // 验证文件类型
    const fileExtension = path.extname(req.file.originalname);
    if (!isValidFileType(fileExtension)) {
      res.status(400).json({
        code: 400,
        message: '不支持的文件类型',
        data: null
      });
      return;
    }
    
    // 生成唯一文件名
    const fileName = `${Date.now()}_${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
    const filePath = path.join(uploadConfig.uploadDir, fileName);
    
    // 移动文件到目标位置
    await fs.rename(req.file.path, filePath);
    
    // 计算文件哈希
    const fileHash = await calculateFileHash(filePath);
    console.log(`[DEBUG] Calculated file hash for ${req.file.originalname}: ${fileHash}`);
    
    // 获取文件类型
    const fileType = getFileType(fileExtension);
    
    // 创建文件记录
    const fileRecordData = {
      name: req.file.originalname,
      path: path.relative(process.cwd(), filePath),
      size: req.file.size,
      type: fileType,
      extension: fileExtension,
      checksum: fileHash,
      version: 1,
      createdBy: user.id,
      status: 'active',
      description: req.body.description || ''
    };
    
    console.log('[DEBUG] Creating file record with data:', fileRecordData);
    
    const fileRecord = new File(fileRecordData);
    const savedFile = await fileRecord.save();
    
    console.log('[DEBUG] Saved file record:', savedFile);
    
    // 创建文件权限记录（默认所有者权限）
    const filePermission = new FilePermission({
      fileId: savedFile.id,
      userId: user.id,
      role: FilePermissionRole.OWNER
    });
    
    await filePermission.save();
    
    // 如果用户角色是普通用户，设置默认为公共权限
    // 这里简化处理，实际应用中可能需要检查用户角色
    const isPublic = req.body.isPublic !== undefined ? req.body.isPublic : true;
    if (isPublic) {
      // 可以添加公共访问权限记录
    }
    
    res.status(201).json({
      code: 201,
      message: '文件上传成功',
      data: {
        id: savedFile.id,
        name: savedFile.name,
        path: savedFile.path,
        checksum: savedFile.checksum,
        size: savedFile.size,
        type: savedFile.type
      }
    });
  } catch (error) {
    console.error('文件上传时出错:', error);
    res.status(500).json({
      code: 500,
      message: '文件上传失败',
      data: null
    });
  }
};

// 多文件上传
/**
 * @openapi
 * /dev/file/upload/multiple:
 *   post:
 *     summary: Upload Multiple Files
 *     description: Upload multiple files with metadata
 *     tags: [File Dev]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               files:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *               description:
 *                 type: string
 *                 example: "Files description"
 *               isPublic:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Files uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: "成功上传 2 个文件"
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                         example: "file_1726492384567_a1b2c3d4e5f"
 *                       name:
 *                         type: string
 *                         example: "example1.txt"
 *                       path:
 *                         type: string
 *                         example: "uploads/example1.txt"
 *                       checksum:
 *                         type: string
 *                         example: "a1b2c3d4e5f67890"
 *                       size:
 *                         type: integer
 *                         example: 1024
 *                       type:
 *                         type: string
 *                         example: "text/plain"
 *       400:
 *         description: No files uploaded or invalid parameters
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Files upload failed
 */
export const uploadMultipleFiles = async (req: Request, res: Response): Promise<void> => {
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
    
    // 确保上传目录存在
    await ensureUploadDir();
    
    // 检查是否有文件上传
    if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
      res.status(400).json({
        code: 400,
        message: '没有文件被上传',
        data: null
      });
      return;
    }
    
    const uploadedFiles = [];
    
    // 处理每个文件
    for (const file of req.files as Express.Multer.File[]) {
      // 验证文件大小
      if (file.size > uploadConfig.maxFileSize) {
        console.warn(`文件 ${file.originalname} 大小超过限制`);
        continue;
      }
      
      // 验证文件类型
      const fileExtension = path.extname(file.originalname);
      if (!isValidFileType(fileExtension)) {
        console.warn(`文件 ${file.originalname} 类型不支持`);
        continue;
      }
      
      // 生成唯一文件名
      const uniqueFileName = `${Date.now()}_${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
      const filePath = path.join(uploadConfig.uploadDir, uniqueFileName);
      
      // 移动文件到目标位置
      await fs.rename(file.path, filePath);
      
      // 计算文件哈希
      const fileHash = await calculateFileHash(filePath);
      
      // 获取文件类型
      const fileType = getFileType(fileExtension);
      
      // 创建文件记录
      const fileRecord = new File({
        name: file.originalname,
        path: path.relative(process.cwd(), filePath),
        size: file.size,
        type: fileType,
        extension: fileExtension,
        checksum: fileHash,
        version: 1,
        createdBy: user.id,
        status: 'active',
        description: req.body.description || ''
      });
      
      const savedFile = await fileRecord.save();
      
      // 创建文件权限记录（默认所有者权限）
      const filePermission = new FilePermission({
        fileId: savedFile.id,
        userId: user.id,
        role: FilePermissionRole.OWNER
      });
      
      await filePermission.save();
      
      uploadedFiles.push({
        id: savedFile.id,
        name: savedFile.name,
        path: savedFile.path,
        checksum: savedFile.checksum,
        size: savedFile.size,
        type: savedFile.type
      });
    }
    
    res.status(201).json({
      code: 201,
      message: `成功上传 ${uploadedFiles.length} 个文件`,
      data: uploadedFiles
    });
  } catch (error) {
    console.error('多文件上传时出错:', error);
    res.status(500).json({
      code: 500,
      message: '文件上传失败',
      data: null
    });
  }
};

// 分片上传初始化
/**
 * @openapi
 * /dev/file/upload/chunk/init:
 *   post:
 *     summary: Initialize Chunked Upload
 *     description: Initialize a chunked file upload session
 *     tags: [File Dev]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fileName:
 *                 type: string
 *                 example: "largefile.zip"
 *               fileSize:
 *                 type: integer
 *                 example: 104857600
 *               chunkCount:
 *                 type: integer
 *                 example: 50
 *             required:
 *               - fileName
 *               - fileSize
 *               - chunkCount
 *     responses:
 *       200:
 *         description: Chunked upload initialization successful
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
 *                   example: "分片上传初始化成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     uploadId:
 *                       type: string
 *                       example: "upload_1726492384567_a1b2c3d4e5f"
 *                     chunkUploadDir:
 *                       type: string
 *                       example: "./chunks/upload_1726492384567_a1b2c3d4e5f"
 *       400:
 *         description: Missing required parameters
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Initialization failed
 */
export const initChunkUpload = async (req: Request, res: Response): Promise<void> => {
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
    console.log('初始化分片上传',uploadConfig.enableChunkedUpload);
    if (!uploadConfig.enableChunkedUpload) {
      res.status(400).json({
        code: 400,
        message: '分片上传功能未启用',
        data: null
      });
      return;
    }
    
    const { fileName, fileSize, chunkCount } = req.body;
    
    if (!fileName || !fileSize || !chunkCount) {
      res.status(400).json({
        code: 400,
        message: '缺少必要参数',
        data: null
      });
      return;
    }
    
    // 生成上传ID
    const uploadId = `upload_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
    
    // 创建分片上传目录
    const chunkUploadDir = path.join(uploadConfig.chunkDir, uploadId);
    await fs.mkdir(chunkUploadDir, { recursive: true });
    
    res.status(200).json({
      code: 200,
      message: '分片上传初始化成功',
      data: {
        uploadId,
        chunkUploadDir
      }
    });
  } catch (error) {
    console.error('初始化分片上传时出错:', error);
    res.status(500).json({
      code: 500,
      message: '初始化分片上传失败',
      data: null
    });
  }
};

// 上传分片
/**
 * @openapi
 * /dev/file/upload/chunk:
 *   post:
 *     summary: Upload File Chunk
 *     description: Upload a single file chunk
 *     tags: [File Dev]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               chunk:
 *                 type: string
 *                 format: binary
 *               uploadId:
 *                 type: string
 *                 example: "upload_1726492384567_a1b2c3d4e5f"
 *               chunkIndex:
 *                 type: integer
 *                 example: 0
 *             required:
 *               - chunk
 *               - uploadId
 *               - chunkIndex
 *     responses:
 *       200:
 *         description: Chunk uploaded successfully
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
 *                   example: "分片上传成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     chunkIndex:
 *                       type: integer
 *                       example: 0
 *       400:
 *         description: Missing required parameters or no file uploaded
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Chunk upload failed
 */
export const uploadChunk = async (req: Request, res: Response): Promise<void> => {
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
    
    if (!uploadConfig.enableChunkedUpload) {
      res.status(400).json({
        code: 400,
        message: '分片上传功能未启用',
        data: null
      });
      return;
    }
    
    const { uploadId, chunkIndex } = req.body;
    
    if (!uploadId || chunkIndex === undefined) {
      res.status(400).json({
        code: 400,
        message: '缺少必要参数',
        data: null
      });
      return;
    }
    
    if (!req.file) {
      res.status(400).json({
        code: 400,
        message: '没有文件被上传',
        data: null
      });
      return;
    }
    
    // 保存分片文件
    const chunkFileName = `chunk_${chunkIndex}`;
    const chunkFilePath = path.join(uploadConfig.chunkDir, uploadId, chunkFileName);
    await fs.rename(req.file.path, chunkFilePath);
    
    // 计算分片哈希
    const chunkHash = await calculateFileHash(chunkFilePath);
    
    res.status(200).json({
      code: 200,
      message: '分片上传成功',
      data: {
        chunkIndex,
        chunkHash
      }
    });
  } catch (error) {
    console.error('上传分片时出错:', error);
    res.status(500).json({
      code: 500,
      message: '分片上传失败',
      data: null
    });
  }
};

// 合并分片
/**
 * @openapi
 * /dev/file/upload/chunk/merge:
 *   post:
 *     summary: Merge File Chunks
 *     description: Merge all uploaded file chunks into a complete file
 *     tags: [File Dev]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               uploadId:
 *                 type: string
 *                 example: "upload_1726492384567_a1b2c3d4e5f"
 *               fileName:
 *                 type: string
 *                 example: "largefile.zip"
 *               fileSize:
 *                 type: integer
 *                 example: 104857600
 *               chunkCount:
 *                 type: integer
 *                 example: 50
 *               description:
 *                 type: string
 *                 example: "Large file description"
 *               isPublic:
 *                 type: boolean
 *                 example: true
 *             required:
 *               - uploadId
 *               - fileName
 *               - fileSize
 *               - chunkCount
 *     responses:
 *       200:
 *         description: Chunks merged successfully
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
 *                   example: "分片合并成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                       example: "file_1726492384567_a1b2c3d4e5f"
 *                     name:
 *                       type: string
 *                       example: "largefile.zip"
 *                     path:
 *                       type: string
 *                       example: "uploads/largefile.zip"
 *                     size:
 *                       type: integer
 *                       example: 104857600
 *                     type:
 *                       type: string
 *                       example: "application/zip"
 *       400:
 *         description: Missing required parameters
 *       401:
 *         description: Unauthorized access
 *       500:
 *         description: Chunks merge failed
 */
export const mergeChunks = async (req: Request, res: Response): Promise<void> => {
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
    
    if (!uploadConfig.enableChunkedUpload) {
      res.status(400).json({
        code: 400,
        message: '分片上传功能未启用',
        data: null
      });
      return;
    }
    
    const { uploadId, fileName, fileSize, chunkCount } = req.body;
    
    if (!uploadId || !fileName || !fileSize || !chunkCount) {
      res.status(400).json({
        code: 400,
        message: '缺少必要参数',
        data: null
      });
      return;
    }
    
    // 确保上传目录存在
    await ensureUploadDir();
    
    // 生成最终文件路径
    const fileExtension = path.extname(fileName);
    const finalFileName = `${Date.now()}_${crypto.randomBytes(16).toString('hex')}${fileExtension}`;
    const finalFilePath = path.join(uploadConfig.uploadDir, finalFileName);
    
    // 创建写入流
    const writeStream = fsSync.createWriteStream(finalFilePath);
    
    // 按顺序合并分片
    for (let i = 0; i < chunkCount; i++) {
      const chunkFileName = `chunk_${i}`;
      const chunkFilePath = path.join(uploadConfig.chunkDir, uploadId, chunkFileName);
      
      try {
        const chunkData = await fs.readFile(chunkFilePath);
        writeStream.write(chunkData);
      } catch (error) {
        console.error(`读取分片 ${i} 时出错:`, error);
        // 继续处理其他分片
      }
    }
    
    // 关闭写入流
    writeStream.end();
    
    // 等待写入完成
    await new Promise<void>((resolve, reject) => {
      writeStream.on('finish', () => resolve());
      writeStream.on('error', reject);
    });
    
    // 计算最终文件哈希
    const fileHash = await calculateFileHash(finalFilePath);
    console.log(`[DEBUG] Calculated final file hash for ${fileName}: ${fileHash}`);
    
    // 获取文件扩展名和类型
    const finalFileExtension = path.extname(fileName);
    const fileType = getFileType(finalFileExtension);
    
    // 创建文件记录
    const fileRecordData = {
      name: fileName,
      path: path.relative(process.cwd(), finalFilePath),
      size: fileSize,
      type: fileType,
      extension: finalFileExtension,
      checksum: fileHash,
      version: 1,
      createdBy: user.id,
      status: 'active',
      description: req.body.description || ''
    };
    
    console.log('[DEBUG] Creating merged file record with data:', fileRecordData);
    
    const fileRecord = new File(fileRecordData);
    const savedFile = await fileRecord.save();
    
    console.log('[DEBUG] Saved merged file record:', savedFile);
    
    // 创建文件权限记录（默认所有者权限）
    const filePermission = new FilePermission({
      fileId: savedFile.id,
      userId: user.id,
      role: FilePermissionRole.OWNER
    });
    
    await filePermission.save();
    
    // 清理分片文件
    try {
      const chunkUploadDir = path.join(uploadConfig.chunkDir, uploadId);
      await fs.rm(chunkUploadDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('清理分片文件时出错:', error);
    }
    
    res.status(200).json({
      code: 200,
      message: '分片合并成功',
      data: {
        id: savedFile.id,
        name: savedFile.name,
        path: savedFile.path,
        checksum: savedFile.checksum,
        size: savedFile.size,
        type: savedFile.type
      }
    });
  } catch (error) {
    console.error('合并分片时出错:', error);
    res.status(500).json({
      code: 500,
      message: '分片合并失败',
      data: null
    });
  }
};