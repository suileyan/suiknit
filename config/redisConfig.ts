import dotenv from 'dotenv';
import { createClient, RedisClientType } from 'redis';

dotenv.config({ path: '.env.config' });

// Redis配置接口
interface RedisConfig {
  host: string;
  port: number;
  password?: string | undefined;
}

// 获取Redis配置
const redisConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined
};

// 创建Redis客户端
const redisClient: RedisClientType = createClient({
  socket: {
    host: redisConfig.host,
    port: redisConfig.port
  },
  ...(redisConfig.password && { password: redisConfig.password })
});

// 连接Redis
redisClient.on('error', (err) => {
  console.error('Redis连接错误:', err);
});

redisClient.on('connect', () => {
  console.log('Redis连接成功');
});

redisClient.on('ready', () => {
  console.log('Redis准备就绪');
});

// 初始化连接
const connectRedis = async (): Promise<void> => {
  try {
    await redisClient.connect();
  } catch (error) {
    console.error('Redis连接失败:', error);
  }
};

export { redisClient, connectRedis, redisConfig };