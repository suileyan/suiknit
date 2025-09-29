import express, { Router } from 'express';
import { authenticate, requireMinRole } from '@/middleware/authz.js';
import { listUsers, getUserById, createUser, updateUser, deleteUser, listFiles, updateFile, deleteFile } from '@/controllers/dev/adminController.js';
import { listLogFiles, getLogs } from '@/controllers/dev/adminLogsController.js';
import { UserRole } from '@/models/User.js';

const router: Router = express.Router();

// All admin routes require authentication and Admin+ role
router.use(authenticate);
router.use(requireMinRole(UserRole.ADMIN));

// User management
router.get('/users', listUsers);
router.get('/users/:id', getUserById);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.patch('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// File management
router.get('/files', listFiles);
router.patch('/files/:id', updateFile);
router.delete('/files/:id', deleteFile);

// Logs management
router.get('/logs/files', listLogFiles);
router.get('/logs', getLogs);

export default router;
