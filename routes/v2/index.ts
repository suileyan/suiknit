import express, { Router } from 'express';
import authRoutes from '@/routes/v2/auth.js';
import mainRoutes from '@/routes/v2/main.js';
import fileRoutes from '@/routes/v2/fileRouter.js';

const router: Router = express.Router();

// 挂载所有v2版本的路由
router.use('/auth', authRoutes);
router.use('/file', fileRoutes);
router.use('/', mainRoutes);

export default router;