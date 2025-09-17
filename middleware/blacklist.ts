import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../config/redisConfig.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.config' });

// 从环境变量获取请求频率限制配置
const rateLimitConfig = {
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  blacklistDuration: parseInt(process.env.RATE_LIMIT_BLACKLIST_DURATION || '3600', 10)
};

// 将IP添加到黑名单
export async function addToBlacklist(ip: string): Promise<void> {
  try {
    if (!redisClient) {
      console.error('Redis客户端未初始化');
      return;
    }
    
    // 添加到Redis黑名单
    const blacklistKey = `blacklist:${ip}`;
    await redisClient.setEx(blacklistKey, rateLimitConfig.blacklistDuration, '1');
  } catch (error) {
    console.error('添加IP到黑名单失败:', error);
  }
}

// 检查IP是否在黑名单中
export async function isIpBlacklisted(ip: string): Promise<boolean> {
  try {
    if (!redisClient) {
      console.error('Redis客户端未初始化');
      return false;
    }
    
    const blacklistKey = `blacklist:${ip}`;
    const result = await redisClient.exists(blacklistKey);
    return result === 1;
  } catch (error) {
    console.error('检查IP黑名单状态失败:', error);
    return false;
  }
}

// 获取客户端真实IP地址
export function getClientIp(req: Request): string {
  // 检查各种可能的IP头
  return (req.headers['x-forwarded-for'] as string || 
          req.headers['x-real-ip'] as string || 
          req.headers['x-client-ip'] as string || 
          req.ip || 
          req.connection.remoteAddress || 
          '')[0]?.split(',')[0]?.trim() || 
         req.connection.remoteAddress || 
         '';
}

// 请求频率限制和IP黑名单中间件
export async function rateLimitAndBlacklistMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!redisClient) {
      console.error('Redis客户端未初始化');
      next();
      return;
    }
    
    const ip = getClientIp(req);
    
    // 检查IP是否在黑名单中
    const isBlacklisted = await isIpBlacklisted(ip);
    if (isBlacklisted) {
      res.status(403).json({
        code: 403,
        message: '您的IP已被拉黑，请联系管理员',
        data: null
      });
      return;
    }
    
    // 使用Redis记录请求次数
    const rateLimitKey = `rate_limit:${ip}`;
    const currentTime = Date.now();
    const windowStart = currentTime - rateLimitConfig.windowMs;
    
    // 清除窗口外的请求记录
    await redisClient.zRemRangeByScore(rateLimitKey, 0, windowStart);
    
    // 生成唯一的请求标识，避免同一毫秒内的请求被去重
    const uniqueRequestId = `${currentTime}-${Math.random().toString(36).substring(2, 15)}`;
    
    // 添加当前请求记录
    await redisClient.zAdd(rateLimitKey, {
      score: currentTime,
      value: uniqueRequestId
    });
    
    // 设置键的过期时间
    await redisClient.expire(rateLimitKey, Math.ceil(rateLimitConfig.windowMs / 1000) + 10);
    
    // 获取当前窗口内的请求数量
    const requestCount = await redisClient.zCard(rateLimitKey);
    
    // 检查是否超过限制
    if (requestCount > rateLimitConfig.maxRequests) {
      // 将IP添加到黑名单
      await addToBlacklist(ip);
      
      res.status(429).json({
        code: 429,
        message: '请求过于频繁，您的IP已被拉黑',
        data: null
      });
      return;
    }
    
    next();
  } catch (error) {
    console.error('请求频率限制中间件出错:', error);
    next();
  }
}

export default {
  addToBlacklist,
  isIpBlacklisted,
  getClientIp,
  rateLimitAndBlacklistMiddleware
};