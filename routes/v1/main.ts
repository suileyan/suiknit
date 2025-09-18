import express, { Router } from 'express';
import authRoutes from '@/routes/v1/auth.js';
import fileRoutes from '@/routes/v1/fileRouter.js';
import indexRoutes from '@/routes/v1/index.js';

const router: Router = express.Router();

// 挂载所有v1版本的路由
router.use('/auth', authRoutes);
router.use('/file', fileRoutes);
router.use('/', indexRoutes);

export default router;