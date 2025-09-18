import { Request, Response, NextFunction } from 'express';
import corsConfig from '@/config/corsConfig.js';

// CORS 中间件
export const cors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const origin = req.get('Origin');
  
  // 检查是否在黑名单中
  if (origin && corsConfig.blockedOrigins.includes(origin)) {
    res.status(403).json({
      code: 403,
      message: 'Origin is blocked',
      data: null
    });
    return;
  }
  
  // 如果有白名单，则只允许白名单中的 origin
  if (corsConfig.allowedOrigins.length > 0) {
    if (origin && corsConfig.allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
  } else {
    // 如果没有白名单，则允许所有 origin（但排除黑名单）
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  res.header('Access-Control-Allow-Methods', corsConfig.allowedMethods.join(', '));
  res.header('Access-Control-Allow-Headers', corsConfig.allowedHeaders.join(', '));
  res.header('Access-Control-Expose-Headers', corsConfig.exposedHeaders.join(', '));
  res.header('Access-Control-Allow-Credentials', corsConfig.credentials.toString());
  res.header('Access-Control-Max-Age', corsConfig.maxAge.toString());
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
};

// 验证请求参数的中间件
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // 检查 Content-Type
  const contentType = req.get('Content-Type');
  if (req.method === 'POST' || req.method === 'PUT') {
    if (!contentType || !contentType.includes('application/json')) {
      res.status(400).json({
        code: 400,
        message: 'Content-Type must be application/json',
        data: null
      });
      return;
    }
  }
  
  next();
};

// 请求日志中间件
export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
};

export default {
  validateRequest,
  cors,
  requestLogger
};