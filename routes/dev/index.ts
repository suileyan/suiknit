import express, { Router } from 'express';
import authRoutes from '@routes/dev/auth.js';
import mainRoutes from '@routes/dev/main.js';
import fileRoutes from '@routes/dev/fileRouter.js';
import fileDownloadRoutes from '@routes/dev/fileDownloadRouter.js';
import adminRoutes from '@routes/dev/admin.js';

const router: Router = express.Router();

router.use('/auth', authRoutes);
router.use('/file', fileRoutes);
router.use('/file/download', fileDownloadRoutes);
router.use('/admin', adminRoutes);
router.use('/', mainRoutes);

export default router;
