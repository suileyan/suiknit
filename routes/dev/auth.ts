import express, { Router } from 'express';
import { generateCaptcha, register, login, loginByToken } from '@controllers/dev/authController.js';

const router: Router = express.Router();

router.get('/captcha', generateCaptcha);

router.post('/register', register);

router.post('/login', login);

router.get('/loginByToken', loginByToken);

export default router;