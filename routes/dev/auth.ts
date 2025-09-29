import express, { Router } from 'express';
import { generateCaptcha, register, login, loginByToken } from '@controllers/dev/authController.js';
import { updateUserProfile, getMyAvatar, getAvatarByUserId } from '@controllers/dev/userController.js';
import { sendEmailCode } from '@controllers/dev/emailController.js';

const router: Router = express.Router();

router.get('/captcha', generateCaptcha);
router.post('/sendEmailCode', sendEmailCode);
router.post('/emailCode', sendEmailCode);
router.post('/email/code', sendEmailCode);

router.post('/register', register);

router.post('/login', login);

router.get('/loginByToken', loginByToken);

// user profile
router.put('/updateUserInfo', updateUserProfile);
router.get('/avatar', getMyAvatar);
router.get('/avatar/:userId', getAvatarByUserId);

export default router;

