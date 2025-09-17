import { redisClient } from '../config/redisConfig.js';
import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.config' });

// 数据库操作类型枚举
export enum DB_OPERATION_TYPE {
  INSERT = 'insert',
  UPDATE = 'update',
  DELETE = 'delete'
}

// 数据库操作接口
export interface DatabaseOperation {
  id: string;
  type: DB_OPERATION_TYPE;
  collection: string;
  data: any;
  condition?: any;
  timestamp: number;
  retryCount: number;
}

// Redis 队列处理器类
export class RedisQueueProcessor {
  private db: Db | null = null;
  private isProcessing: boolean = false;
  private queueKey: string = 'db_operations_queue';
  private processingKey: string = 'db_operations_processing';
  private maxRetryCount: number = 3;

  constructor() {
    this.connectToDatabase();
  }

  // 连接到 MongoDB 数据库
  private async connectToDatabase(): Promise<void> {
    try {
      // 从环境变量获取数据库连接信息
      const dbHost = process.env.DB_HOST || 'localhost';
      const dbPort = process.env.DB_PORT || '27017';
      const dbName = process.env.DB_NAME || 'suiknit';
      const dbUsername = process.env.DB_USERNAME || '';
      const dbPassword = process.env.DB_PASSWORD || '';
      
      let connectionString = 'mongodb://';
      if (dbUsername && dbPassword) {
        connectionString += `${dbUsername}:${dbPassword}@`;
      }
      connectionString += `${dbHost}:${dbPort}/${dbName}`;
      
      const client = new MongoClient(connectionString);
      await client.connect();
      this.db = client.db(dbName);
      console.log('数据库连接成功');
    } catch (error) {
      console.error('数据库连接失败:', error);
    }
  }

  // 将操作添加到队列
  async enqueueOperation(operation: Omit<DatabaseOperation, 'id' | 'timestamp' | 'retryCount'>): Promise<void> {
    try {
      const operationWithMetadata: DatabaseOperation = {
        ...operation,
        id: this.generateOperationId(),
        timestamp: Date.now(),
        retryCount: 0
      };
      
      const serializedOperation = JSON.stringify(operationWithMetadata);
      await redisClient.lPush(this.queueKey, serializedOperation);
      console.log(`操作已添加到队列: ${operation.type} ${operation.collection}`);
    } catch (error) {
      console.error('添加操作到队列时出错:', error);
    }
  }

  // 处理队列中的操作
  async processQueue(): Promise<void> {
    if (this.isProcessing || !this.db) {
      return;
    }

    this.isProcessing = true;
    
    try {
      while (true) {
        // 从队列中取出一个操作
        const result = await redisClient.brPop(this.queueKey, 1);
        
        if (!result) {
          // 没有更多操作，退出循环
          break;
        }
        
        const operation: DatabaseOperation = JSON.parse(result.element);
        
        // 将操作移到处理中队列
        await redisClient.lPush(this.processingKey, result.element);
        
        try {
          // 处理操作
          await this.processOperation(operation);
          
          // 处理成功，从处理中队列移除
          await this.removeFromProcessingQueue(result.element);
          console.log(`操作处理成功: ${operation.type} ${operation.collection}`);
        } catch (error) {
          console.error(`操作处理失败: ${operation.type} ${operation.collection}`, error);
          
          // 处理失败，增加重试次数
          operation.retryCount++;
          
          if (operation.retryCount < this.maxRetryCount) {
            // 重新加入队列
            const serializedOperation = JSON.stringify(operation);
            await redisClient.lPush(this.queueKey, serializedOperation);
            console.log(`操作重新加入队列: ${operation.type} ${operation.collection} (重试次数: ${operation.retryCount})`);
          } else {
            // 达到最大重试次数，移动到失败队列
            await this.moveToFailedQueue(result.element);
            console.log(`操作达到最大重试次数，已移动到失败队列: ${operation.type} ${operation.collection}`);
          }
          
          // 从处理中队列移除
          await this.removeFromProcessingQueue(result.element);
        }
      }
    } catch (error) {
      console.error('处理队列时出错:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  // 处理单个数据库操作
  private async processOperation(operation: DatabaseOperation): Promise<void> {
    if (!this.db) {
      throw new Error('数据库未连接');
    }

    const collection = this.db.collection(operation.collection);

    switch (operation.type) {
      case DB_OPERATION_TYPE.INSERT:
        await collection.insertOne(operation.data);
        break;
        
      case DB_OPERATION_TYPE.UPDATE:
        if (!operation.condition) {
          throw new Error('更新操作必须提供条件');
        }
        await collection.updateOne(operation.condition, { $set: operation.data });
        break;
        
      case DB_OPERATION_TYPE.DELETE:
        if (!operation.condition) {
          throw new Error('删除操作必须提供条件');
        }
        await collection.deleteOne(operation.condition);
        break;
        
      default:
        throw new Error(`不支持的操作类型: ${operation.type}`);
    }
  }

  // 从处理中队列移除
  private async removeFromProcessingQueue(element: string): Promise<void> {
    await redisClient.lRem(this.processingKey, 1, element);
  }

  // 移动到失败队列
  private async moveToFailedQueue(element: string): Promise<void> {
    await redisClient.lPush('db_operations_failed', element);
  }

  // 生成操作ID
  private generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  // 获取队列长度
  async getQueueLength(): Promise<number> {
    return await redisClient.lLen(this.queueKey);
  }

  // 获取处理中队列长度
  async getProcessingLength(): Promise<number> {
    return await redisClient.lLen(this.processingKey);
  }

  // 获取失败队列长度
  async getFailedLength(): Promise<number> {
    return await redisClient.lLen('db_operations_failed');
  }
}

// 创建全局队列处理器实例
export const queueProcessor = new RedisQueueProcessor();

// 定期处理队列的函数
export async function startQueueProcessing(): Promise<void> {
  // 立即处理一次
  await queueProcessor.processQueue();
  
  // 每5秒检查一次队列
  setInterval(async () => {
    await queueProcessor.processQueue();
  }, 5000);
}

// 中间件函数，用于在数据库操作前先记录到 Redis 队列
export async function redisCacheMiddleware(
  operation: Omit<DatabaseOperation, 'id' | 'timestamp' | 'retryCount'>
): Promise<void> {
  await queueProcessor.enqueueOperation(operation);
}