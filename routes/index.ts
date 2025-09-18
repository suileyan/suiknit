import express from 'express';
import devRoutes from '@/routes/dev/index.js';

const router = express.Router();

// 挂载不同版本的API路由
router.use('/dev', devRoutes);

// 默认版本路由 (可选，指向最新稳定版本)
router.use('/api', devRoutes); // 当前将默认API指向v1

// 根路径重定向到API文档
router.get('/', (req, res) => {
  res.redirect('/api-docs');
});

export default router;