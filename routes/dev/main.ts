import express, { Router } from 'express';
import { getIndex, postIndex } from '@controllers/dev/indexController.js';

const router: Router = express.Router();

router.get('/', getIndex);

router.post('/', postIndex);

export default router;