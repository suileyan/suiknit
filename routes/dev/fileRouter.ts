import express, { Router } from 'express';
import multer from 'multer';
import uploadConfig from '@/config/uploadConfig.js';
import { 
  getPublicFile, 
  uploadSingleFile, 
  uploadMultipleFiles,
  initChunkUpload,
  uploadChunk,
  mergeChunks
} from '@controllers/dev/fileController.js';

const router: Router = express.Router();

// 配置multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './temp'); // 临时存储目录
  },
  filename: function (req, file, cb) {
    // 生成唯一文件名
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + '-' + file.originalname);
  }
});

// 确保临时目录存在
import fs from 'fs';
const tempDir = './temp';
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

const upload = multer({ storage, limits: { fileSize: uploadConfig.maxFileSize } });

// 专用于分片的上传限制，默认更大（可通过 CHUNK_MAX_SIZE 配置）
const chunkUpload = multer({ storage, limits: { fileSize: uploadConfig.chunkMaxSize } });

router.get('/public', getPublicFile);

// 文件上传路由
router.post('/upload/single', upload.single('file'), uploadSingleFile);
router.post('/upload/multiple', upload.array('files', 10), uploadMultipleFiles);

// 分片上传路由
router.post('/upload/chunk/init', initChunkUpload);
// 包装分片上传，优雅处理 Multer 的体积限制错误
router.post(
  '/upload/chunk',
  (req, res, next) => {
    chunkUpload.single('chunk')(req as any, res as any, (err: any) => {
      if (!err) return next();
      if (err && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ code: 400, message: '分片大小超过限制，请减小 chunkSize 或增大 CHUNK_MAX_SIZE', data: null });
      }
      return next(err);
    });
  },
  uploadChunk
);
router.post('/upload/chunk/merge', mergeChunks);

export default router;
