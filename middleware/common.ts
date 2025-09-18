import { Request, Response, NextFunction } from 'express';
import corsConfig from '@/config/corsConfig.js';

// 验证请求参数的中间件
export const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // 检查 Content-Type
  const contentType = req.get('Content-Type');
  
  // 跳过文件上传相关路径的验证
  const skipValidationPaths = [
    '/file/upload/chunk',
    '/file/upload/single',
    '/file/upload/multiple'
  ];
  
  const shouldSkipValidation = skipValidationPaths.some(path => 
    req.originalUrl.includes(path)
  );
  
  if (!shouldSkipValidation && (req.method === 'POST' || req.method === 'PUT')) {
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

// CORS 中间件
export const cors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // 获取允许的来源
  const allowedOrigins = corsConfig.allowedOrigins;
  const blockedOrigins = corsConfig.blockedOrigins;
  const origin = req.get('Origin');
  
  // 检查是否在黑名单中
  if (origin && blockedOrigins.includes(origin)) {
    // 如果在黑名单中，不设置CORS头部，直接返回403
    res.status(403).json({
      code: 403,
      message: 'Origin is blocked',
      data: null
    });
    return;
  }
  
  // 如果有白名单，则只允许白名单中的origin
  if (allowedOrigins.length > 0) {
    if (origin && allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
  } else {
    // 如果没有白名单，则允许所有origin（但排除黑名单）
    res.header('Access-Control-Allow-Origin', origin || '*');
  }
  
  // 设置其他CORS头部
  res.header('Access-Control-Allow-Methods', corsConfig.allowedMethods.join(', '));
  res.header('Access-Control-Allow-Headers', corsConfig.allowedHeaders.join(', '));
  res.header('Access-Control-Expose-Headers', corsConfig.exposedHeaders.join(', '));
  res.header('Access-Control-Allow-Credentials', corsConfig.credentials.toString());
  res.header('Access-Control-Max-Age', corsConfig.maxAge.toString());
  
  // 处理preflight请求
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
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