import express, { Router } from 'express';
import { getIndex, postIndex } from '../controllers/indexController.js';

const router: Router = express.Router();

// GET 路由
router.get('/', getIndex);

// POST 路由
router.post('/', postIndex);

export default router;