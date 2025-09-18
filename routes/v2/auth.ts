import express, { Router } from 'express';
import { generateCaptcha, register, login } from '@/controllers/v2/authController.js';

const router: Router = express.Router();

/**
 * @openapi
 * /auth/captcha:
 *   get:
 *     summary: Generate CAPTCHA (v2)
 *     description: Generate a CAPTCHA image for registration or login (v2 API)
 *     tags:
 *       - Authentication V2
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
router.get('/captcha', generateCaptcha);

/**
 * @openapi
 * /auth/register:
 *   post:
 *     summary: User Registration (v2)
 *     description: Register a new user account with enhanced security (v2 API)
 *     tags:
 *       - Authentication V2
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
 *             required:
 *               - email
 *               - password
 *               - name
 *               - captchaId
 *               - captchaCode
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
 *         description: Invalid parameters or captcha error
 *       500:
 *         description: Registration failed
 */
router.post('/register', register);

/**
 * @openapi
 * /auth/login:
 *   post:
 *     summary: User Login (v2)
 *     description: Authenticate user with enhanced security (v2 API)
 *     tags:
 *       - Authentication V2
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
 *               captchaId:
 *                 type: string
 *                 example: "captcha_1726492384567_a1b2c3d4e5f"
 *               captchaCode:
 *                 type: string
 *                 example: "ABCD"
 *             required:
 *               - email
 *               - password
 *               - captchaId
 *               - captchaCode
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
 *         description: Invalid parameters or captcha error
 *       401:
 *         description: Invalid email or password
 *       500:
 *         description: Login failed
 */
router.post('/login', login);

export default router;