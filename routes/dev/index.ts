import express, { Router } from 'express';
import authRoutes from '@routes/dev/auth.js';
import mainRoutes from '@routes/dev/main.js';
import fileRoutes from '@routes/dev/fileRouter.js';
import fileDownloadRoutes from '@routes/dev/fileDownloadRouter.js';

const router: Router = express.Router();

// 挂载所有v2版本的路由
router.use('/auth', authRoutes);
router.use('/file', fileRoutes);
router.use('/file/download', fileDownloadRoutes);
router.use('/', mainRoutes);

export default router;