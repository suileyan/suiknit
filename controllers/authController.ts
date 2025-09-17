import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import svgCaptcha from 'svg-captcha';
import dotenv from 'dotenv';
import { redisClient } from '../config/redisConfig.js';
import { verifyJWT, generateJWT } from '../utility/jwt.js';
import authService from '../services/authService.js';
import { 
  ValidationError, 
  AuthenticationError, 
  NotFoundError, 
  RateLimitError 
} from '../exceptions/AppError.js';

dotenv.config({ path: '.env.config' });

// 从环境变量获取验证码配置
const captchaConfig = {
  size: parseInt(process.env.CAPTCHA_SIZE || '4', 10),
  width: parseInt(process.env.CAPTCHA_WIDTH || '120', 10),
  height: parseInt(process.env.CAPTCHA_HEIGHT || '40', 10),
  expire: parseInt(process.env.CAPTCHA_EXPIRE || '300', 10) // 默认5分钟
};

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

// 注册处理函数
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, captchaId, captchaCode, emailCode } = req.body;

    // 验证参数
    if (!email || !password || !name || !captchaId || !captchaCode || !emailCode) {
      res.status(400).json({
        code: 400,
        message: '邮箱、密码、姓名、图像验证码ID、图像验证码和邮箱验证码不能为空',
        data: null
      });
      return;
    }

    // 验证图像验证码
    const isCaptchaValid = await authService.verifyCaptcha(captchaId, captchaCode);
    if (!isCaptchaValid) {
      res.status(400).json({
        code: 400,
        message: '图像验证码错误或已过期',
        data: null
      });
      return;
    }

    // 验证邮箱验证码
    const isEmailCodeValid = await authService.verifyEmailCode(email, emailCode, 'register');
    if (!isEmailCodeValid) {
      res.status(400).json({
        code: 400,
        message: '邮箱验证码错误或已过期',
        data: null
      });
      return;
    }

    // 注册用户
    const result = await authService.registerUser(email, password, name);

    res.status(201).json({
      code: 201,
      message: '注册成功',
      data: result
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

// 登录处理函数
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, emailCode, captchaId, captchaCode } = req.body;

    // 验证基本参数
    if (!email) {
      res.status(400).json({
        code: 400,
        message: '邮箱不能为空',
        data: null
      });
      return;
    }

    // 确定登录方式
    const isPasswordLogin = !!(password && captchaId && captchaCode);
    const isEmailCodeLogin = !!emailCode;

    // 验证登录方式
    if (!isPasswordLogin && !isEmailCodeLogin) {
      res.status(400).json({
        code: 400,
        message: '请选择登录方式：密码登录需要密码和图像验证码，邮箱验证码登录需要邮箱验证码',
        data: null
      });
      return;
    }

    // 如果是密码登录，验证图像验证码
    if (isPasswordLogin) {
      const isCaptchaValid = await authService.verifyCaptcha(captchaId, captchaCode);
      if (!isCaptchaValid) {
        res.status(400).json({
          code: 400,
          message: '图像验证码错误或已过期',
          data: null
        });
        return;
      }
    }

    // 如果是邮箱验证码登录，验证邮箱验证码
    if (isEmailCodeLogin) {
      const isEmailCodeValid = await authService.verifyEmailCode(email, emailCode, 'login');
      if (!isEmailCodeValid) {
        res.status(400).json({
          code: 400,
          message: '邮箱验证码错误或已过期',
          data: null
        });
        return;
      }
    }

    // 执行登录
    let result = null;
    if (isPasswordLogin) {
      result = await authService.loginWithPassword(email, password);
    } else if (isEmailCodeLogin) {
      result = await authService.loginWithEmailCode(email);
    }

    res.status(200).json({
      code: 200,
      message: '登录成功',
      data: result
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

// 通过Token登录处理函数
export const loginByToken = (_req: Request, res: Response): void => {
  try {
    const token = _req.get('token');
    
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

// 注销处理函数
export const logout = (_req: Request, res: Response): void => {
  try {
    // 在基于JWT的无状态认证中，注销通常由客户端删除token来实现
    // 服务端可以将token加入黑名单（需要Redis等存储）
    res.status(200).json({
      code: 200,
      message: '注销成功',
      data: null
    });
  } catch (error) {
    console.error('注销处理时出错:', error);
    res.status(500).json({
      code: 500,
      message: '注销失败',
      data: null
    });
  }
};

// 更新用户信息处理函数
export const updateUserInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, avatarPath } = req.body;
    const token = req.get('token');

    if (!token) {
      res.status(400).json({
        code: 400,
        message: '缺少token',
        data: null
      });
      return;
    }

    // 验证JWT token
    if (!verifyJWT(token)) {
      res.status(401).json({
        code: 401,
        message: '无效的token',
        data: null
      });
      return;
    }

    // 解码token获取用户ID
    const decoded = jwt.decode(token) as { id: string } | null;
    if (!decoded || !decoded.id) {
      res.status(401).json({
        code: 401,
        message: '无效的token',
        data: null
      });
      return;
    }

    // 更新用户信息
    const updatedUser = await authService.updateUserInfo(decoded.id, name, avatarPath);

    res.status(200).json({
      code: 200,
      message: '用户信息更新成功',
      data: {
        user: updatedUser
      }
    });
  } catch (error) {
    console.error('更新用户信息时出错:', error);
    
    // 处理自定义异常
    if (error instanceof ValidationError) {
      res.status(400).json({
        code: 400,
        message: error.message,
        data: null
      });
      return;
    }
    
    if (error instanceof NotFoundError) {
      res.status(404).json({
        code: 404,
        message: error.message,
        data: null
      });
      return;
    }
    
    res.status(500).json({
      code: 500,
      message: '更新用户信息失败',
      data: null
    });
  }
};

// 发送邮箱验证码
export const sendEmailCode = async (_req: Request, res: Response): Promise<void> => {
  try {
    const { email, type } = _req.body;
    const ip = _req.ip || 'unknown';
      console.log('Headers:', _req.headers);
      console.log('Raw body:', _req.body);
      console.log('Parsed email:', _req.body.email, JSON.stringify(_req.body.email));

    // 验证参数
    if (!email || !type) {
      res.status(400).json({
        code: 400,
        message: '邮箱和用途类型不能为空',
        data: null
      });
      return;
    }

    // 发送邮箱验证码
    await authService.sendEmailVerificationCode(email, type, ip);
    
    res.status(200).json({
      code: 200,
      message: '验证码发送成功',
      data: null
    });
  } catch (error) {
    console.error('发送邮箱验证码时出错:', error);
    
    // 处理自定义异常
    if (error instanceof ValidationError) {
      res.status(400).json({
        code: 400,
        message: error.message,
        data: null
      });
      return;
    }
    
    if (error instanceof RateLimitError) {
      res.status(429).json({
        code: 429,
        message: error.message,
        data: null
      });
      return;
    }
    
    res.status(500).json({
      code: 500,
      message: '发送验证码失败',
      data: null
    });
  }
};