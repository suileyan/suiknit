import express, { Router } from 'express';
import { generateCaptcha, register, login, loginByToken, logout, updateUserInfo, sendEmailCode } from '../controllers/authController.js';

const router: Router = express.Router();

// 生成验证码路由
router.get('/captcha', generateCaptcha);
router.post('/sendEmailCode', sendEmailCode);
router.post('/register', register);
router.get('/logout', logout);
router.get('/updateUserInfo', updateUserInfo);

// 登录路由
router.post('/login', login);

// 通过Token登录路由
router.get('/loginByToken', loginByToken);

export default router;