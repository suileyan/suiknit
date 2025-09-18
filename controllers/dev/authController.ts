import type { Request, Response } from 'express';
import svgCaptcha from 'svg-captcha';
import dotenv from 'dotenv';
import { redisClient } from '@/config/redisConfig.js';
import { generateJWT } from '@/utility/jwt.js';
import { 
  ValidationError, 
  AuthenticationError 
} from '@/exceptions/AppError.js';

dotenv.config({ path: '.env.config' });

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
 *   name: Authentication V2
 *   description: Authentication management (v2 API)
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

// 注册处理函数 (v2增强版本)
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

    // 检查用户是否已存在
    // 注意：这里需要实现实际的用户检查逻辑
    // 为了简化示例，我们假设用户不存在

    // 密码加密
    // 注意：这里需要实现实际的密码加密逻辑
    // 为了简化示例，我们假设密码已加密

    // 创建用户
    // 注意：这里需要实现实际的用户创建逻辑
    // 为了简化示例，我们直接生成token

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