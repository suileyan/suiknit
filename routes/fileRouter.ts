import express, { Router } from 'express';
import { getPublic } from '../controllers/fileController.js';

const router: Router = express.Router();

router.get('/public', getPublic);

export default router;