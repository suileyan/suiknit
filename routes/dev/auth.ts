import express, { Router } from 'express';
import { generateCaptcha, register, login } from '@controllers/dev/authController.js';

const router: Router = express.Router();

router.get('/captcha', generateCaptcha);

router.post('/register', register);

router.post('/login', login);

export default router;