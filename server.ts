import express from 'express'
import type { Request, Response, NextFunction } from 'express'
import dotenv from 'dotenv'
import { writeLog } from './utility/logger.js';
import DB from './utility/mongoDB.js';
import indexRoutes from './routes/index.js';
import fileRoutes from './routes/fileRouter.js';
import authRoutes from './routes/auth.js';
import dbConfig from './config/dbConfig.js';
import { connectRedis } from './config/redisConfig.js';

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

// 使用外部路由
app.use('/auth', authRoutes);
app.use('/file', fileRoutes);
app.use('/', indexRoutes);


app.listen(+port, LANMode ? server : '', () => {
    console.log(`服务器运行在端口 ${port}`)
});