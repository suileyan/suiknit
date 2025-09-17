import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import dotenv from 'dotenv'
import { writeLog } from './utility/logger.js';
import DB from './utility/mongoDB.js';
import indexRoutes from './routes/index.js';
import fileRoutes from './routes/fileRouter.js';
import authRoutes from './routes/auth.js';
import dbConfig from './config/dbConfig.js';
import { connectRedis, redisClient } from './config/redisConfig.js';
import { startQueueProcessing } from './utility/redisQueue.js';

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

dotenv.config({path: '.env.config'})
const app = express()
const port = process.env.PORT || '4000'
const LANMode = process.env.LAN || false
const server = process.env.SERVER || '0.0.0.0'


const db = new DB(dbConfig.getConnectionString())
db.connect()

// 连接Redis
connectRedis().catch(err => {
  console.error('Redis连接失败:', err);
});

// 从环境变量获取请求频率限制配置
const rateLimitConfig = {
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  blacklistDuration: parseInt(process.env.RATE_LIMIT_BLACKLIST_DURATION || '3600')
};

// 将IP添加到黑名单
async function addToBlacklist(ip: string): Promise<void> {
  try {
    // 添加到Redis黑名单
    const blacklistKey = `blacklist:${ip}`;
    await redisClient.setEx(blacklistKey, rateLimitConfig.blacklistDuration, '1');
  } catch (error) {
    console.error('添加IP到黑名单失败:', error);
  }
}

// 检查IP是否在黑名单中
async function isIpBlacklisted(ip: string): Promise<boolean> {
  try {
    const blacklistKey = `blacklist:${ip}`;
    const result = await redisClient.exists(blacklistKey);
    return result === 1;
  } catch (error) {
    console.error('检查IP黑名单状态失败:', error);
    return false;
  }
}

// 获取客户端真实IP地址
function getClientIp(req: Request): string {
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
async function rateLimitAndBlacklistMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
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

app.use(express.json())
app.use(express.urlencoded({ extended: true }));

// 统一返回格式中间件
app.use((req: Request, res: CustomResponse, next: NextFunction) => {
    console.log("收到请求")
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
});

app.use((req: Request, res: CustomResponse, next: NextFunction) => {
    const start = process.hrtime.bigint(); // 纳秒级
    // 保存原始的 json 方法
    const originalJson = res.json;

    // 重写 json 方法以添加日志记录
    res.json = function(data: any) {
        const end = process.hrtime.bigint();
        const consume = Number(end - start) / 1e6; // 转为毫秒
        const status = res.statusCode || 200;

        // 只有在启用日志时才记录
        if (process.env.ISLOG === 'true') {
            writeLog(req, data, status, consume)
                .catch(err => console.error('日志记录失败:', err));
        }

        // 调用原始的 json 方法
        return originalJson.call(this, data);
    };

    next();
});

// 应用请求频率限制和IP黑名单中间件
app.use(rateLimitAndBlacklistMiddleware);

// 使用外部路由
app.use('/auth', authRoutes);
app.use('/file', fileRoutes);
app.use('/', indexRoutes);


app.listen(+port, LANMode ? server : '', () => {
    console.log(`服务器运行在端口 ${port}`)
    // 启动Redis队列处理
    startQueueProcessing().catch(err => {
        console.error('启动Redis队列处理失败:', err);
    });
});