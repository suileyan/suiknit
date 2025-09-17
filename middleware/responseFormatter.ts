import { Request, Response, NextFunction } from 'express';
import { writeLog } from '../utility/logger.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.config' });

// 定义统一返回格式的接口
interface ApiResponse {
  code: number;
  message: string;
  data: any;
}

// 定义自定义的 Response 类型，包含重写的 json 方法
interface CustomResponse extends Response {
  json: (data: any) => this;
}

// 统一返回格式中间件
export function unifiedResponseMiddleware(req: Request, res: CustomResponse, next: NextFunction): void {
  console.log('收到请求');
  // 保存原始的 json 方法
  const originalJson = res.json;

  // 重写 json 方法以实现统一返回格式
  res.json = function(data: any) {
    // 如果已经是统一格式，直接返回
    if (data && typeof data === 'object' && ('code' in data) && ('message' in data)) {
      return originalJson.call(this, data);
    }
    
    // 默认成功响应
    const response: ApiResponse = {
      code: res.statusCode || 200,
      message: 'success',
      data: data
    };
    
    return originalJson.call(this, response);
  };

  next();
}

// 日志记录中间件
export function loggingMiddleware(req: Request, res: CustomResponse, next: NextFunction): void {
  const start = process.hrtime.bigint(); // 纳秒级
  // 保存原始的 json 方法
  const originalJson = res.json;

  // 重写 json 方法以添加日志记录
  res.json = function(data: any) {
    const end = process.hrtime.bigint();
    const consume = Number(end - start) / 1e6; // 转为毫秒
    const status = res.statusCode || 200;

    // 检查是否启用日志
    const isLogEnabled = process.env.ISLOG === 'true';
    if (isLogEnabled) {
      writeLog(req, data, status, consume)
        .catch(err => console.error('日志记录失败:', err));
    }

    // 调用原始的 json 方法
    return originalJson.call(this, data);
  };

  next();
}

export default {
  unifiedResponseMiddleware,
  loggingMiddleware
};