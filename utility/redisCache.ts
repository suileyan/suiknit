import { redisClient } from '../config/redisConfig.js';

/**
 * 生成缓存键
 * @param collection 集合名称
 * @param id 文档ID
 * @returns 缓存键
 */
function generateCacheKey(collection: string, id: string): string {
  return `db:${collection}:${id}`;
}

/**
 * 将数据存储到 Redis 缓存中
 * @param collection 集合名称
 * @param id 文档ID
 * @param data 要缓存的数据
 * @param expireSeconds 过期时间（秒），默认300秒（5分钟）
 */
export async function cacheData(
  collection: string,
  id: string,
  data: any,
  expireSeconds: number = 300
): Promise<void> {
  try {
    const cacheKey = generateCacheKey(collection, id);
    const serializedData = JSON.stringify(data);
    await redisClient.setEx(cacheKey, expireSeconds, serializedData);
  } catch (error) {
    console.error('缓存数据时出错:', error);
  }
}

/**
 * 从 Redis 缓存中获取数据
 * @param collection 集合名称
 * @param id 文档ID
 * @returns 缓存的数据，如果不存在则返回null
 */
export async function getCachedData(
  collection: string,
  id: string
): Promise<any> {
  try {
    const cacheKey = generateCacheKey(collection, id);
    const cachedData = await redisClient.get(cacheKey);
    
    if (cachedData) {
      return JSON.parse(cachedData);
    }
    
    return null;
  } catch (error) {
    console.error('获取缓存数据时出错:', error);
    return null;
  }
}

/**
 * 从 Redis 缓存中删除数据
 * @param collection 集合名称
 * @param id 文档ID
 */
export async function removeCachedData(
  collection: string,
  id: string
): Promise<void> {
  try {
    const cacheKey = generateCacheKey(collection, id);
    await redisClient.del(cacheKey);
  } catch (error) {
    console.error('删除缓存数据时出错:', error);
  }
}

/**
 * 缓存数据库操作结果的装饰器函数
 * @param collection 集合名称
 * @param operation 数据库操作类型
 */
export function withCache(
  collection: string,
  operation: 'find' | 'insert' | 'update' | 'delete'
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      try {
        // 对于查找操作，先检查缓存
        if (operation === 'find' && args[1]) {
          // args[1] 是查询条件，我们尝试从中提取ID
          const condition = args[1];
          let id: string | null = null;
          
          if (condition._id) {
            id = condition._id.toString();
          } else if (condition.id) {
            id = condition.id.toString();
          }
          
          if (id) {
            const cachedResult = await getCachedData(collection, id);
            if (cachedResult) {
              console.log(`从缓存中获取数据: ${collection}:${id}`);
              return cachedResult;
            }
          }
        }

        // 执行原始数据库操作
        const result = await originalMethod.apply(this, args);

        // 对于插入、更新操作，将结果缓存
        if ((operation === 'insert' || operation === 'update') && result) {
          // 处理单个文档和多个文档的情况
          if (Array.isArray(result)) {
            // 批量操作
            for (const doc of result) {
              if (doc._id || doc.id) {
                const docId = (doc._id || doc.id).toString();
                await cacheData(collection, docId, doc);
              }
            }
          } else {
            // 单个文档操作
            if (result._id || result.id) {
              const docId = (result._id || result.id).toString();
              await cacheData(collection, docId, result);
            }
          }
        }

        // 对于删除操作，从缓存中移除
        if (operation === 'delete' && args[1]) {
          const condition = args[1];
          let id: string | null = null;
          
          if (condition._id) {
            id = condition._id.toString();
          } else if (condition.id) {
            id = condition.id.toString();
          }
          
          if (id) {
            await removeCachedData(collection, id);
          }
        }

        return result;
      } catch (error) {
        console.error('缓存装饰器执行出错:', error);
        // 出错时直接执行原始方法
        return await originalMethod.apply(this, args);
      }
    };

    return descriptor;
  };
}