import express, { Router } from 'express';
import multer from 'multer';
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

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760', 10) // 默认10MB
  }
});

router.get('/public', getPublicFile);

// 文件上传路由
router.post('/upload/single', upload.single('file'), uploadSingleFile);
router.post('/upload/multiple', upload.array('files', 10), uploadMultipleFiles);

// 分片上传路由
router.post('/upload/chunk/init', initChunkUpload);
router.post('/upload/chunk', upload.single('chunk'), uploadChunk);
router.post('/upload/chunk/merge', mergeChunks);

export default router;