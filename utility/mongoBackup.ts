import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
import cron from 'node-cron';

dotenv.config({ path: '.env.config' });

const execAsync = promisify(exec);

// MongoDB 备份配置接口
interface MongoBackupConfig {
  backupEnabled: boolean;
  backupPath: string;
  schedule: string;
  retentionDays: number;
  dbHost: string;
  dbPort: string;
  dbName: string;
  dbUsername?: string | undefined;
  dbPassword?: string | undefined;
}

// 获取 MongoDB 备份配置
function getMongoBackupConfig(): MongoBackupConfig {
  return {
    backupEnabled: process.env.MONGO_BACKUP_ENABLED === 'true',
    backupPath: process.env.MONGO_BACKUP_PATH || './resource/backups',
    schedule: process.env.MONGO_BACKUP_SCHEDULE || '0 2 * * *', // 默认每天凌晨2点
    retentionDays: parseInt(process.env.MONGO_BACKUP_RETENTION_DAYS || '7', 10),
    dbHost: process.env.DB_HOST || 'localhost',
    dbPort: process.env.DB_PORT || '27017',
    dbName: process.env.DB_NAME || 'testdb',
    dbUsername: process.env.DB_USERNAME || undefined,
    dbPassword: process.env.DB_PASSWORD || undefined
  };
}

// 确保备份目录存在
async function ensureBackupDirectory(backupPath: string): Promise<void> {
  try {
    await fs.mkdir(backupPath, { recursive: true });
  } catch (_error) {
    console.error('创建备份目录失败:', _error);
    throw _error;
  }
}

// 生成备份文件名
function generateBackupFilename(dbName: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `mongodb-${dbName}-${timestamp}`;
}

// 检查 mongodump 是否可用
async function isMongodumpAvailable(): Promise<boolean> {
  try {
    await execAsync('mongodump --version');
    return true;
  } catch (_error) {
    return false;
  }
}

// 执行 MongoDB 备份
async function performMongoBackup(config: MongoBackupConfig): Promise<void> {
  // 检查 mongodump 是否可用
  const isAvailable = await isMongodumpAvailable();
  if (!isAvailable) {
    throw new Error('mongodump 工具不可用，请确保已安装 MongoDB 数据库工具');
  }

  // 确保备份目录存在
  await ensureBackupDirectory(config.backupPath);
  
  // 生成备份文件名
  const backupFilename = generateBackupFilename(config.dbName);
  const backupDir = path.join(config.backupPath, backupFilename);
  const archivePath = `${backupDir}.gz`;
  
  try {
    // 构建 mongodump 命令
    let mongodumpCmd = `mongodump --host ${config.dbHost}:${config.dbPort} --db ${config.dbName} --out "${backupDir}"`;
    
    // 如果提供了用户名和密码，添加认证信息
    if (config.dbUsername && config.dbPassword) {
      mongodumpCmd = `mongodump --host ${config.dbHost}:${config.dbPort} --db ${config.dbName} --username ${config.dbUsername} --password ${config.dbPassword} --out "${backupDir}"`;
    }
    
    console.log(`执行 MongoDB 备份: ${mongodumpCmd}`);
    
    // 执行备份命令
    const { stderr } = await execAsync(mongodumpCmd);
    
    if (stderr) {
      console.warn('mongodump 警告:', stderr);
    }
    
    console.log('备份完成，开始压缩...');
    
    // 压缩备份目录
    await compressDirectory(backupDir, archivePath);
    
    // 删除未压缩的备份目录
    await fs.rm(backupDir, { recursive: true, force: true });
    
    console.log(`MongoDB 备份完成: ${archivePath}`);
  } catch (error) {
    // 清理未完成的备份目录
    try {
      await fs.rm(backupDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.warn('清理未完成的备份目录失败:', cleanupError);
    }
    throw error;
  }
  
  // 清理旧备份
  await cleanupOldBackups(config.backupPath, config.retentionDays);
}

// 压缩备份目录
async function compressDirectory(sourceDir: string, targetPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // 创建 tar.gz 文件
    const tarCmd = `tar -czf "${targetPath}" -C "${path.dirname(sourceDir)}" "${path.basename(sourceDir)}"`;
    
    exec(tarCmd, (error, _stdout, _stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

// 清理旧备份
async function cleanupOldBackups(backupPath: string, retentionDays: number): Promise<void> {
  try {
    const files = await fs.readdir(backupPath);
    const now = Date.now();
    const retentionMs = retentionDays * 24 * 60 * 60 * 1000; // 转换为毫秒
    
    for (const file of files) {
      if (file.startsWith('mongodb-') && file.endsWith('.gz')) {
        const filePath = path.join(backupPath, file);
        try {
          const stats = await fs.stat(filePath);
          const fileAge = now - stats.mtime.getTime();
          
          // 如果文件超过保留天数，则删除
          if (fileAge > retentionMs) {
            await fs.unlink(filePath);
            console.log(`已删除旧备份: ${file}`);
          }
        } catch (error) {
          console.error(`检查文件 ${file} 时出错:`, error);
        }
      }
    }
  } catch (error) {
    console.error('清理旧备份失败:', error);
  }
}

// 启动 MongoDB 备份定时任务
export function startMongoBackupSchedule(): void {
  const config = getMongoBackupConfig();
  
  // 检查是否启用了备份功能
  if (!config.backupEnabled) {
    console.log('MongoDB 备份功能已禁用');
    return;
  }
  
  // 检查 mongodump 是否可用
  isMongodumpAvailable().then(async (isAvailable) => {
    if (!isAvailable) {
      console.warn('警告: mongodump 工具不可用，MongoDB 备份功能将无法正常工作。请确保已安装 MongoDB 数据库工具。');
      return;
    }
    
    // 服务启动时立即执行一次备份
    console.log('服务启动，开始执行初始 MongoDB 备份...');
    try {
      await performMongoBackup(config);
      console.log('初始 MongoDB 备份完成');
    } catch (error) {
      console.error('初始 MongoDB 备份失败:', error);
    }
    
    // 设置定时任务
    cron.schedule(config.schedule, async () => {
      console.log('开始执行 MongoDB 定时备份...');
      try {
        await performMongoBackup(config);
        console.log('MongoDB 定时备份完成');
      } catch (error) {
        console.error('MongoDB 定时备份失败:', error);
      }
    });
    
    console.log(`MongoDB 备份任务已启动，计划: ${config.schedule}`);
  }).catch(error => {
    console.error('启动 MongoDB 备份任务失败:', error);
  });
}

// 手动执行备份
export async function manualMongoBackup(): Promise<void> {
  const config = getMongoBackupConfig();
  await performMongoBackup(config);
}

export default {
  startMongoBackupSchedule,
  manualMongoBackup,
  getMongoBackupConfig
};