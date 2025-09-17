import { Request, Response, NextFunction } from 'express';

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

// CORS 中间件
export const cors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Token');
  
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