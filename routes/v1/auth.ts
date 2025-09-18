import express, { Router } from 'express';
import { generateCaptcha, register, login, loginByToken, logout, updateUserInfo, sendEmailCode } from '@/controllers/v1/authController.js';

const router: Router = express.Router();

/**
 * @openapi
 * /v1/auth/captcha:
 *   get:
 *     summary: Generate CAPTCHA
 *     description: Generate a CAPTCHA image for registration or login
 *     tags:
 *       - Authentication
 *     responses:
 *       200:
 *         description: CAPTCHA generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "验证码生成成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     captchaId:
 *                       type: string
 *                       example: "captcha_1726492384567_a1b2c3d4e5f"
 *                     captchaImage:
 *                       type: string
 *                       example: "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iNDAiP..."
 *       500:
 *         description: CAPTCHA generation failed
 */

// 生成验证码路由
router.get('/captcha', generateCaptcha);

/**
 * @openapi
 * /v1/auth/sendEmailCode:
 *   post:
 *     summary: Send Email Verification Code
 *     description: Send a verification code to the user's email address
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *               type:
 *                 type: string
 *                 example: "register"
 *             required:
 *               - email
 *               - type
 *     responses:
 *       200:
 *         description: Verification code sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "验证码发送成功"
 *       400:
 *         description: Missing email or type / Invalid email format
 *       429:
 *         description: Too many requests (same IP within 60 seconds)
 *       500:
 *         description: Failed to send verification code
 */
router.post('/sendEmailCode', sendEmailCode);

/**
 * @openapi
 * /v1/auth/register:
 *   post:
 *     summary: User Registration
 *     description: Register a new user account with both image captcha and email verification code
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *                 example: "user@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *               name:
 *                 type: string
 *                 example: "John Doe"
 *               captchaId:
 *                 type: string
 *                 example: "captcha_1726492384567_a1b2c3d4e5f"
 *               captchaCode:
 *                 type: string
 *                 example: "ABCD"
 *               emailCode:
 *                 type: string
 *                 example: "123456"
 *             required:
 *               - email
 *               - password
 *               - name
 *               - captchaId
 *               - captchaCode
 *               - emailCode
 *     responses:
 *       201:
 *         description: Registration successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 201
 *                 message:
 *                   type: string
 *                   example: "注册成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "507f1f77bcf86cd799439011"
 *                         email:
 *                           type: string
 *                           example: "user@example.com"
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *       400:
 *         description: Invalid parameters, captcha error, or email verification code error
 *       500:
 *         description: Registration failed
 */
router.post('/register', register);

/**
 * @openapi
 * /v1/auth/logout:
 *   get:
 *     summary: User Logout
 *     description: Logout user (client should delete token)
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "注销成功"
 *       500:
 *         description: Logout failed
 */
router.get('/logout', logout);

/**
 * @openapi
 * /v1/auth/updateUserInfo:
 *   put:
 *     summary: Update User Information
 *     description: Update user profile information
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "John Smith"
 *               avatarPath:
 *                 type: string
 *                 example: "/images/avatar.jpg"
 *     responses:
 *       200:
 *         description: User information updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "用户信息更新成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "507f1f77bcf86cd799439011"
 *                         email:
 *                           type: string
 *                           example: "user@example.com"
 *                         name:
 *                           type: string
 *                           example: "John Smith"
 *                         avatarPath:
 *                           type: string
 *                           example: "/images/avatar.jpg"
 *                         role:
 *                           type: string
 *                           example: "user"
 *       400:
 *         description: Missing token
 *       401:
 *         description: Invalid token
 *       404:
 *         description: User not found
 *       500:
 *         description: Update failed
 */
router.put('/updateUserInfo', updateUserInfo);

/**
 * @openapi
 * /v1/auth/login:
 *   post:
 *     summary: User Login
 *     description: Authenticate user and generate JWT token (supports both password and email verification code login)
 *     tags:
 *       - Authentication
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 properties:
 *                   email:
 *                     type: string
 *                     example: "user@example.com"
 *                   password:
 *                     type: string
 *                     example: "password123"
 *                   captchaId:
 *                     type: string
 *                     example: "captcha_1726492384567_a1b2c3d4e5f"
 *                   captchaCode:
 *                     type: string
 *                     example: "ABCD"
 *                 required:
 *                   - email
 *                   - password
 *                   - captchaId
 *                   - captchaCode
 *               - type: object
 *                 properties:
 *                   email:
 *                     type: string
 *                     example: "user@example.com"
 *                   emailCode:
 *                     type: string
 *                     example: "123456"
 *                 required:
 *                   - email
 *                   - emailCode
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "登录成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "507f1f77bcf86cd799439011"
 *                         email:
 *                           type: string
 *                           example: "user@example.com"
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *       400:
 *         description: Invalid parameters, captcha error, or email verification code error
 *       401:
 *         description: Invalid email, password, or verification code
 *       500:
 *         description: Login failed
 */
router.post('/login', login);

/**
 * @openapi
 * /v1/auth/loginByToken:
 *   get:
 *     summary: Token-based Authentication
 *     description: Verify existing JWT token and generate a new one
 *     tags:
 *       - Authentication
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Token verification successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 code:
 *                   type: integer
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: "token验证成功"
 *                 data:
 *                   type: object
 *                   properties:
 *                     token:
 *                       type: string
 *                       example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "507f1f77bcf86cd799439011"
 *                         email:
 *                           type: string
 *                           example: "user@example.com"
 *                         name:
 *                           type: string
 *                           example: "John Doe"
 *       400:
 *         description: Missing token
 *       401:
 *         description: Invalid or expired token
 *       500:
 *         description: Verification failed
 */
router.get('/loginByToken', loginByToken);

export default router;