import type { Request, Response } from 'express';
import svgCaptcha from 'svg-captcha';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { redisClient } from '@/config/redisConfig.js';
import { generateJWT, verifyJWT } from '@/utility/jwt.js';
import { 
  ValidationError, 
  AuthenticationError 
} from '@/exceptions/AppError.js';

dotenv.config({ path: '.env.config' });

/**
 * @openapi
 * tags:
 *   name: Authentication Dev
 *   description: Authentication management (dev API)
 */

// 从环境变量获取验证码配置
const captchaConfig = {
  size: parseInt(process.env.CAPTCHA_SIZE || '4', 10),
  width: parseInt(process.env.CAPTCHA_WIDTH || '120', 10),
  height: parseInt(process.env.CAPTCHA_HEIGHT || '40', 10),
  expire: parseInt(process.env.CAPTCHA_EXPIRE || '300', 10) // 默认5分钟
};

/**
 * @openapi
 * tags:
 *   name: Authentication dev
 *   description: Authentication management (dev API)
 */

/**
 * @openapi
 * /dev/auth/captcha:
 *   get:
 *     summary: Generate CAPTCHA
 *     description: Generate a CAPTCHA image for registration or login
 *     tags: [Authentication Dev]
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
// 生成验证码图片
export const generateCaptcha = async (req: Request, res: Response): Promise<void> => {
  try {
    // 生成验证码
    const captcha = svgCaptcha.create({
      size: captchaConfig.size,
      width: captchaConfig.width,
      height: captchaConfig.height,
      noise: 3,
      color: true,
      background: '#f0f0f0'
    });

    // 生成唯一的验证码ID
    const randomStr = Math.random().toString(36).substring(2, 11);
    const captchaId = `captcha_${Date.now()}_${randomStr}`;

    // 将验证码存储到Redis中，设置过期时间
    if (redisClient) {
      await redisClient.setEx(captchaId, captchaConfig.expire, captcha.text.toLowerCase());
    } else {
      console.error('Redis客户端未初始化');
    }

    // 返回验证码图片和ID
    res.status(200).json({
      code: 200,
      message: '验证码生成成功',
      data: {
        captchaId,
        captchaImage: `data:image/svg+xml;base64,${Buffer.from(captcha.data).toString('base64')}`
      }
    });
  } catch (error) {
    console.error('生成验证码时出错:', error);
    res.status(500).json({
      code: 500,
      message: '验证码生成失败',
      data: null
    });
  }
};


/**
 * @openapi
 * /dev/auth/register:
 *   post:
 *     summary: User Registration
 *     description: Register a new user account with image captcha verification
 *     tags: [Authentication dev]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - name
 *               - captchaId
 *               - captchaCode
 *             properties:
 *               email:
 *                 type: string
 *                 example: "test@example.com"
 *               password:
 *                 type: string
 *                 example: "password123"
 *               name:
 *                 type: string
 *                 example: "Test User"
 *               captchaId:
 *                 type: string
 *                 example: "captcha_1234567890_abcdef"
 *               captchaCode:
 *                 type: string
 *                 example: "ABCD"
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
 *                       example: "jwt_token_string"
 *                     user:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           example: "user_id_v2"
 *                         email:
 *                           type: string
 *                           example: "test@example.com"
 *                         name:
 *                           type: string
 *                           example: "Test User"
 *       400:
 *         description: Validation error
 *       500:
 *         description: Registration failed
 */
// 注册处理函数
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, captchaId, captchaCode } = req.body;

    // 验证参数
    if (!email || !password || !name || !captchaId || !captchaCode) {
      res.status(400).json({
        code: 400,
        message: '邮箱、密码、姓名、图像验证码ID、图像验证码不能为空',
        data: null
      });
      return;
    }

    // 验证图像验证码
    if (redisClient) {
      const storedCaptcha = await redisClient.get(captchaId);
      if (!storedCaptcha || storedCaptcha !== captchaCode.toLowerCase()) {
        res.status(400).json({
          code: 400,
          message: '图像验证码错误或已过期',
          data: null
        });
        return;
      }
      // 验证成功后删除验证码
      await redisClient.del(captchaId);
    } else {
      console.error('Redis客户端未初始化');
      res.status(500).json({
        code: 500,
        message: '验证码验证失败',
        data: null
      });
      return;
    }

    const user = {
      id: 'user_id_v2',
      email,
      name
    };

    // 生成JWT token
    const token = generateJWT(user);

    res.status(201).json({
      code: 201,
      message: '注册成功',
      data: {
        token,
        user
      }
    });
  } catch (error) {
    console.error('注册处理时出错:', error);
    
    // 处理自定义异常
    if (error instanceof ValidationError) {
      res.status(400).json({
        code: 400,
        message: error.message,
        data: null
      });
      return;
    }
    
    res.status(500).json({
      code: 500,
      message: '注册失败',
      data: null
    });
  }
};

// 登录处理函数 (v2增强版本)
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, captchaId, captchaCode } = req.body;

    // 验证基本参数
    if (!email || !password || !captchaId || !captchaCode) {
      res.status(400).json({
        code: 400,
        message: '邮箱、密码、图像验证码ID、图像验证码不能为空',
        data: null
      });
      return;
    }

    // 验证图像验证码
    if (redisClient) {
      const storedCaptcha = await redisClient.get(captchaId);
      if (!storedCaptcha || storedCaptcha !== captchaCode.toLowerCase()) {
        res.status(400).json({
          code: 400,
          message: '图像验证码错误或已过期',
          data: null
        });
        return;
      }
      // 验证成功后删除验证码
      await redisClient.del(captchaId);
    } else {
      console.error('Redis客户端未初始化');
      res.status(500).json({
        code: 500,
        message: '验证码验证失败',
        data: null
      });
      return;
    }

    // 验证用户凭据
    // 注意：这里需要实现实际的用户验证逻辑
    // 为了简化示例，我们假设凭据正确

    const user = {
      id: 'user_id_v2',
      email,
      name: 'V2 User'
    };

    // 生成JWT token
    const token = generateJWT(user);

    res.status(200).json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user
      }
    });
  } catch (error) {
    console.error('登录处理时出错:', error);
    
    // 处理自定义异常
    if (error instanceof ValidationError) {
      res.status(400).json({
        code: 400,
        message: error.message,
        data: null
      });
      return;
    }
    
    if (error instanceof AuthenticationError) {
      res.status(401).json({
        code: 401,
        message: error.message,
        data: null
      });
      return;
    }
    
    res.status(500).json({
      code: 500,
      message: '登录失败',
      data: null
    });
  }
};

// Token验证处理函数 (v2版本)
export const loginByToken = (req: Request, res: Response): void => {
  try {
    const token = req.get('token') || req.get('authorization')?.replace('Bearer ', '');
    
    if (!token) {
      res.status(400).json({
        code: 400,
        message: '缺少token',
        data: null
      });
      return;
    }

    // 验证JWT token
    if (verifyJWT(token)) {
      // 解码token获取用户信息
      const decoded = jwt.decode(token) as { id: string; email: string; name: string } | null;
      
      if (!decoded) {
        res.status(401).json({
          code: 401,
          message: '无效的token',
          data: null
        });
        return;
      }

      // 生成新的token
      const newToken = generateJWT({
        id: decoded.id,
        email: decoded.email,
        name: decoded.name
      });

      res.status(200).json({
        code: 200,
        message: 'token验证成功',
        data: {
          token: newToken,
          user: {
            id: decoded.id,
            email: decoded.email,
            name: decoded.name
          }
        }
      });
    } else {
      res.status(401).json({
        code: 401,
        message: 'token已过期或无效',
        data: null
      });
    }
  } catch (error) {
    console.error('Token验证时出错:', error);
    res.status(500).json({
      code: 500,
      message: '验证失败',
      data: null
    });
  }
};

/**
 * @openapi
 * /dev/auth/register:
 *   post:
 *     summary: User Registration
 *     description: Register a new user account with both image captcha and email verification code
 *     tags: [Authentication Dev]
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

/**
 * @openapi
 * /dev/auth/login:
 *   post:
 *     summary: User Login
 *     description: Authenticate user and generate JWT token (supports both password and email verification code login)
 *     tags: [Authentication Dev]
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

/**
 * @openapi
 * /dev/auth/loginByToken:
 *   get:
 *     summary: Token-based Authentication
 *     description: Verify existing JWT token and generate a new one
 *     tags: [Authentication Dev]
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