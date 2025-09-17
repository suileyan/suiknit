import express from 'express';
import dotenv from 'dotenv';
import DB from './utility/mongoDB.js';
import indexRoutes from './routes/index.js';
import fileRoutes from './routes/fileRouter.js';
import authRoutes from './routes/auth.js';
import dbConfig from './config/dbConfig.js';
import { connectRedis } from './config/redisConfig.js';
import { startQueueProcessing } from './utility/redisQueue.js';
import { startMongoBackupSchedule } from './utility/mongoBackup.js';
import { cors, requestLogger, validateRequest } from './middleware/common.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { rateLimitAndBlacklistMiddleware } from './middleware/blacklist.js';
import { unifiedResponseMiddleware, loggingMiddleware } from './middleware/responseFormatter.js';

dotenv.config({ path: '.env.config' });
const app = express();
const port = process.env.PORT || '4000';
const LANMode = process.env.LAN || false;
const server = process.env.SERVER || '0.0.0.0';


const db = new DB(dbConfig.getConnectionString());
db.connect();

// 连接Redis
connectRedis().catch(err => {
  console.error('Redis连接失败:', err);
});

// 应用基础中间件
app.use(cors);
app.use(requestLogger);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(validateRequest);

// 统一返回格式中间件
app.use(unifiedResponseMiddleware);

// 日志记录中间件
app.use(loggingMiddleware);

// 应用请求频率限制和IP黑名单中间件
app.use(rateLimitAndBlacklistMiddleware);

// 使用外部路由
app.use('/auth', authRoutes);
app.use('/file', fileRoutes);
app.use('/', indexRoutes);

// 404 处理
app.use(notFoundHandler);

// 错误处理中间件
app.use(errorHandler);

app.listen(+port, LANMode ? server : '', () => {
    console.log(`服务器运行在端口 ${port}`);
    // 启动Redis队列处理
    startQueueProcessing().catch(err => {
        console.error('启动Redis队列处理失败:', err);
    });
    
    // 启动MongoDB备份定时任务
    startMongoBackupSchedule();
});