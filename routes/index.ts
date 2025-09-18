import express from 'express';
import v1Routes from '@/routes/v1/main.js';
import v2Routes from '@/routes/v2/index.js';

const router = express.Router();

// 挂载不同版本的API路由
router.use('/v1', v1Routes);
router.use('/v2', v2Routes);

// 默认版本路由 (可选，指向最新稳定版本)
router.use('/api', v1Routes); // 当前将默认API指向v1

export default router;