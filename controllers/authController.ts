import type { Request, Response } from 'express';
import { generateJWT, verifyJWT } from '../utility/jwt.js';
import jwt from 'jsonwebtoken';
import User, { UserRole } from '../models/User.js';
import svgCaptcha from 'svg-captcha';
import dotenv from 'dotenv';
import { redisClient } from '../config/redisConfig.js';
import { emailService } from '../utility/email.js';
import { redisCacheMiddleware, DB_OPERATION_TYPE } from '../utility/redisQueue.js';

dotenv.config({ path: '.env.config' });

// 从环境变量获取验证码配置
const captchaConfig = {
  size: parseInt(process.env.CAPTCHA_SIZE || '4', 10),
  width: parseInt(process.env.CAPTCHA_WIDTH || '120', 10),
  height: parseInt(process.env.CAPTCHA_HEIGHT || '40', 10),
  expire: parseInt(process.env.CAPTCHA_EXPIRE || '300', 10) // 默认5分钟
};

// 从环境变量获取邮箱验证码配置
interface EmailCodeConfig {
  expire: number;
  limit: number;
}

const emailCodeConfig: EmailCodeConfig = {
  expire: parseInt(process.env.EMAIL_CODE_EXPIRE || '300', 10), // 默认5分钟
  limit: parseInt(process.env.EMAIL_CODE_LIMIT || '60', 10) // 默认60秒
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
    await redisClient.setEx(captchaId, captchaConfig.expire, captcha.text.toLowerCase());

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

    // 验证图像验证码（从Redis中获取）
    const storedCaptcha = await redisClient.get(captchaId);
    if (!storedCaptcha || storedCaptcha !== captchaCode.toLowerCase()) {
      res.status(400).json({
        code: 400,
        message: '图像验证码错误或已过期',
        data: null
      });
      return;
    }

    // 验证成功后立即删除图像验证码，防止重复使用
    await redisClient.del(captchaId);

    // 验证邮箱验证码（从Redis中获取）
    const codeKey = `email_code_register_${email}`;
    const storedEmailCode = await redisClient.get(codeKey);
    if (!storedEmailCode || storedEmailCode !== emailCode) {
      res.status(400).json({
        code: 400,
        message: '邮箱验证码错误或已过期',
        data: null
      });
      return;
    }

    // 验证成功后立即删除邮箱验证码，防止重复使用
    await redisClient.del(codeKey);

    // 检查用户是否已存在
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      res.status(400).json({
        code: 400,
        message: '该邮箱已被注册',
        data: null
      });
      return;
    }

    // 创建新用户
    const user = new User({
      email,
      password,
      name,
      role: UserRole.USER
    });

    // 将用户保存操作添加到Redis队列
    await redisCacheMiddleware({
      type: DB_OPERATION_TYPE.INSERT,
      collection: 'users',
      data: {
        email,
        password,
        name,
        role: UserRole.USER,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    // 保存用户到数据库
    const savedUser = await user.save();

    // 生成JWT token
    const token = generateJWT({
      id: savedUser.id,
      email: savedUser.email,
      name: savedUser.name
    });

    res.status(201).json({
      code: 201,
      message: '注册成功',
      data: {
        token,
        user: {
          id: savedUser.id,
          email: savedUser.email,
          name: savedUser.name
        }
      }
    });
  } catch (error) {
    console.error('注册处理时出错:', error);
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
      const storedCode = await redisClient.get(captchaId);
      if (!storedCode || storedCode !== captchaCode.toLowerCase()) {
        res.status(400).json({
          code: 400,
          message: '图像验证码错误或已过期',
          data: null
        });
        return;
      }

      // 验证成功后立即删除验证码，防止重复使用
      await redisClient.del(captchaId);
    }

    // 如果是邮箱验证码登录，验证邮箱验证码
    if (isEmailCodeLogin) {
      const codeKey = `email_code_login_${email}`;
      const storedCode = await redisClient.get(codeKey);
      if (!storedCode || storedCode !== emailCode) {
        res.status(400).json({
          code: 400,
          message: '邮箱验证码错误或已过期',
          data: null
        });
        return;
      }

      // 验证成功后立即删除验证码，防止重复使用
      await redisClient.del(codeKey);
    }

    // 查找用户（会自动使用Redis缓存）
    const user = await User.findByEmail(email);
    if (!user) {
      res.status(401).json({
        code: 401,
        message: '用户不存在',
        data: null
      });
      return;
    }

    // 如果是密码登录，验证密码
    if (isPasswordLogin) {
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        res.status(401).json({
          code: 401,
          message: '密码错误',
          data: null
        });
        return;
      }
    }

    // 更新最后登录时间
    user.lastLoginAt = new Date();
    await user.save();

    // 生成JWT token
    const token = generateJWT({
      id: user.id,
      email: user.email,
      name: user.name
    });

    res.status(200).json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      }
    });
  } catch (error) {
    console.error('登录处理时出错:', error);
    res.status(500).json({
      code: 500,
      message: '登录失败',
      data: null
    });
  }
};

// 通过Token登录处理函数
export const loginByToken = (req: Request, res: Response): void => {
  try {
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
export const logout = (req: Request, res: Response): void => {
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

    // 查找用户
    const user = await User.findById(decoded.id);
    if (!user) {
      res.status(404).json({
        code: 404,
        message: '用户不存在',
        data: null
      });
      return;
    }

    // 更新用户信息
    if (name) user.name = name;
    if (avatarPath) user.avatarPath = avatarPath;
    user.updatedAt = new Date();
    
    // 将更新操作添加到Redis队列
    await redisCacheMiddleware({
      type: DB_OPERATION_TYPE.UPDATE,
      collection: 'users',
      condition: { _id: user._id },
      data: {
        name: name || user.name,
        avatarPath: avatarPath || user.avatarPath,
        updatedAt: new Date()
      }
    });

    const updatedUser = await user.save();

    res.status(200).json({
      code: 200,
      message: '用户信息更新成功',
      data: {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          name: updatedUser.name,
          avatarPath: updatedUser.avatarPath,
          role: updatedUser.role
        }
      }
    });
  } catch (error) {
    console.error('更新用户信息时出错:', error);
    res.status(500).json({
      code: 500,
      message: '更新用户信息失败',
      data: null
    });
  }
};

// 发送邮箱验证码
export const sendEmailCode = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, type } = req.body;
    const ip = req.ip;
      console.log("Headers:", req.headers);
      console.log("Raw body:", req.body);
      console.log("Parsed email:", req.body.email, JSON.stringify(req.body.email));

    // 验证参数
    if (!email || !type) {
      res.status(400).json({
        code: 400,
        message: '邮箱和用途类型不能为空',
        data: null
      });
      return;
    }

    // 验证邮箱格式
      const emailRegex =
          /^(?!.*\.\.)[a-zA-Z0-9._%+-]{1,64}@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,63})+$/;

      if (!emailRegex.test(email)) {
      res.status(400).json({
        code: 400,
        message: '邮箱格式不正确',
        data: null
      });
      return;
    }

    // 检查是否在限制时间内
    const limitKey = `email_code_limit_${type}_${ip}`;
    const isLimited = await redisClient.exists(limitKey);
    if (isLimited) {
      const ttl = await redisClient.ttl(limitKey);
      res.status(429).json({
        code: 429,
        message: `请求过于频繁，请${ttl}秒后再试`,
        data: null
      });
      return;
    }

    // 生成6位数字验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // 存储验证码到Redis，设置过期时间
    const codeKey = `email_code_${type}_${email}`;
    await redisClient.setEx(codeKey, emailCodeConfig.expire, code);

    // 设置IP限制，防止频繁发送
    await redisClient.setEx(limitKey, emailCodeConfig.limit, '1');

    // 发送邮件
    const subject = '验证码';
    const content = `您正在${type}，验证码为：${code}，${Math.floor(emailCodeConfig.expire/60)}分钟内有效。`;
    
    const emailResult = await emailService.send(email, subject, content);
    
    // 检查邮件发送结果
    if (emailResult && emailResult.length > 0) {
      const result = emailResult[0];
      if (result && result.success) {
        res.status(200).json({
          code: 200,
          message: '验证码发送成功',
          data: null
        });
      } else if (result) {
        res.status(500).json({
          code: 500,
          message: '验证码发送失败：' + result.message,
          data: null
        });
      } else {
        res.status(500).json({
          code: 500,
          message: '验证码发送失败：未知错误',
          data: null
        });
      }
    } else {
      res.status(500).json({
        code: 500,
        message: '验证码发送失败：未知错误',
        data: null
      });
    }
  } catch (error) {
    console.error('发送邮箱验证码时出错:', error);
    res.status(500).json({
      code: 500,
      message: '发送验证码失败',
      data: null
    });
  }
};