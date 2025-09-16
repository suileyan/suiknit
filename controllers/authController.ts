// authController.ts - 处理认证相关请求的控制器
import type { Request, Response } from 'express';
import { generateJWT, verifyJWT } from "../utility/jwt.ts";

// 登录处理函数
export const login = (req: Request, res: Response) => {
  try {
    const token = generateJWT(req.body);
    res.status(200).json({ token });
  } catch (error) {
    console.error('登录处理时出错:', error);
    res.status(500).json({ error: '登录失败' });
  }
};

// 通过Token登录处理函数
export const loginByToken = (req: Request, res: Response) => {
  try {
    const token = req.get('token');
    if (verifyJWT(token)) {
      res.status(200).json({ is: true });
    } else {
      res.status(401).json({ is: false });
    }
  } catch (error) {
    console.error('Token验证时出错:', error);
    res.status(500).json({ error: '验证失败' });
  }
};