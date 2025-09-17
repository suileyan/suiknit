// logger.ts
import fs from 'fs/promises';
import path from 'node:path';
import { createWriteStream, WriteStream } from 'node:fs';
import dotenv from 'dotenv';
import type { Request } from 'express';

dotenv.config({ path: '.env.config' });

// 缓存日志文件流
const logStreams = new Map<string, WriteStream>();

// 获取日志文件路径
const getLogFilePath = (): string => {
  const date = new Date().toISOString().split('T')[0];
  return path.resolve(process.env.LOGPATH || './logs', `${date}.log`);
};

// 获取或创建日志文件流
const getLogStream = async (): Promise<WriteStream> => {
  const filePath = getLogFilePath();
  const dirPath = path.dirname(filePath);

  // 确保目录存在
  await fs.mkdir(dirPath, { recursive: true });

  if (!logStreams.has(filePath)) {
    const stream = createWriteStream(filePath, { flags: 'a', encoding: 'utf8' });
    logStreams.set(filePath, stream);
  }

  return logStreams.get(filePath)!;
};

// 检查路径是否应该被排除
const shouldExcludePath = (reqPath: string, excludeList: string[]): boolean => {
  return excludeList.some(excludePath => reqPath === excludePath || reqPath.startsWith(excludePath + '/'));
};

// 过滤敏感字段
const filterSensitiveFields = (obj: any, sensitiveFields: string[], placeholder: string): any => {
  if (!obj || typeof obj !== 'object') return obj;

  const filtered: any = Array.isArray(obj) ? [] : {};
  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveFields.includes(key.toLowerCase())) {
      filtered[key] = placeholder;
    } else if (typeof value === 'object' && value !== null) {
      filtered[key] = filterSensitiveFields(value, sensitiveFields, placeholder);
    } else {
      filtered[key] = value;
    }
  }
  return filtered;
};

// 格式化日志数据
const formatLogData = (req: Request, data: any, status: number, consume: number, excludeBodyPaths: string[]): string | null => {
  const excludePaths = [
    '/favicon.ico',
    '/robots.txt'
  ];
  
  if (shouldExcludePath(req.path, excludePaths)) return null;

  const excludeBody = shouldExcludePath(req.path, excludeBodyPaths);
  
  // 敏感字段列表
  const sensitiveFields = [
    'password',
    'token',
    'authorization',
    'cookie',
    'session',
    'captcha',
    'captchaimage'
  ];

  // 过滤敏感字段
  const filteredBody = req.body
    ? filterSensitiveFields(req.body, sensitiveFields, '[已屏蔽]')
    : null;
  const filteredQuery = req.query
    ? filterSensitiveFields(req.query, sensitiveFields, '[已屏蔽]')
    : null;
  const filteredData = data
    ? filterSensitiveFields(data, sensitiveFields, '[已屏蔽]')
    : null;

  return `time:${new Date().toLocaleTimeString()},ip:${req.ip},path:"${req.path}",method:${req.method},query:${
    excludeBody ? '[EXCLUDED]' : filteredQuery ? JSON.stringify(filteredQuery) : 'null'
  },body:${excludeBody ? '[EXCLUDED]' : filteredBody ? JSON.stringify(filteredBody) : 'null'},status:'${status}',response:${
    filteredData ? JSON.stringify(filteredData) : 'null'
  },timestamp:'${new Date().toISOString()}',time-consuming:'${consume}ms'
`;
};

// 写入日志
export const writeLog = async (req: Request, data: any, status: number, consume: number = 0): Promise<void> => {
  try {
    // 检查是否启用日志
    const isLogEnabled = process.env.ISLOG === 'true';
    if (!isLogEnabled) return;

    const excludeBodyPaths = [
      '/health',
      '/status',
      '/ping',
      '/metrics',
      '/auth/captcha'
    ];

    const logStream = await getLogStream();
    const logData = formatLogData(req, data, status, consume, excludeBodyPaths);

    if (!logData) return;

    await new Promise<void>((resolve, reject) => {
      logStream.write(logData, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('日志写入成功');
  } catch (error) {
    console.error('日志写入失败:', error);
    throw error;
  }
};

// 关闭所有日志流
export const closeLogStreams = (): void => {
  for (const stream of logStreams.values()) {
    stream.end();
  }
  logStreams.clear();
};
