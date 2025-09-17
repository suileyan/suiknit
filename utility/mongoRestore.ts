import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.config' });

const execAsync = promisify(exec);

// MongoDB 恢复配置接口
interface MongoRestoreConfig {
  backupPath: string;
  dbHost: string;
  dbPort: string;
  dbName: string;
  dbUsername?: string | undefined;
  dbPassword?: string | undefined;
}

// 获取 MongoDB 恢复配置
function getMongoRestoreConfig(): MongoRestoreConfig {
  return {
    backupPath: process.env.MONGO_BACKUP_PATH || './backups',
    dbHost: process.env.DB_HOST || 'localhost',
    dbPort: process.env.DB_PORT || '27017',
    dbName: process.env.DB_NAME || 'testdb',
    dbUsername: process.env.DB_USERNAME || undefined,
    dbPassword: process.env.DB_PASSWORD || undefined
  };
}

// 检查 mongorestore 是否可用
async function isMongorestoreAvailable(): Promise<boolean> {
  try {
    await execAsync('mongorestore --version');
    return true;
  } catch (_error) {
    return false;
  }
}

// 解压备份文件
async function decompressArchive(archivePath: string, targetDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // 解压 tar.gz 文件
    const tarCmd = `tar -xzf "${archivePath}" -C "${targetDir}"`;
    
    exec(tarCmd, (error, _stdout, _stderr) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

// 执行 MongoDB 恢复
async function performMongoRestore(backupName: string): Promise<void> {
  // 检查 mongorestore 是否可用
  const isAvailable = await isMongorestoreAvailable();
  if (!isAvailable) {
    throw new Error('mongorestore 工具不可用，请确保已安装 MongoDB 数据库工具');
  }

  const config = getMongoRestoreConfig();
  
  // 构造备份文件路径
  const archivePath = path.join(config.backupPath, `${backupName}.gz`);
  const extractDir = path.join(config.backupPath, 'temp_restore');
  const backupDir = path.join(extractDir, backupName);
  
  // 检查备份文件是否存在
  try {
    await fs.access(archivePath);
  } catch (_error) {
    throw new Error(`备份文件不存在: ${archivePath}`);
  }
  
  console.log(`开始恢复 MongoDB 备份: ${archivePath}`);
  
  try {
    // 创建临时解压目录
    await fs.mkdir(extractDir, { recursive: true });
    
    // 解压备份文件
    console.log('解压备份文件...');
    await decompressArchive(archivePath, extractDir);
    
    // 构建 mongorestore 命令
    let mongorestoreCmd = `mongorestore --host ${config.dbHost}:${config.dbPort} --drop --db ${config.dbName} "${path.join(backupDir, config.dbName)}"`;
    
    // 如果提供了用户名和密码，添加认证信息
    if (config.dbUsername && config.dbPassword) {
      mongorestoreCmd = `mongorestore --host ${config.dbHost}:${config.dbPort} --username ${config.dbUsername} --password ${config.dbPassword} --drop --db ${config.dbName} "${path.join(backupDir, config.dbName)}"`;
    }
    
    console.log(`执行 MongoDB 恢复: ${mongorestoreCmd}`);
    
    // 执行恢复命令
    const { stderr } = await execAsync(mongorestoreCmd);
    
    if (stderr) {
      console.warn('mongorestore 警告:', stderr);
    }
    
    console.log('MongoDB 恢复完成');
  } catch (error) {
    // 清理临时目录（即使恢复失败也要清理）
    try {
      await fs.rm(extractDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.warn('清理临时目录失败:', cleanupError);
    }
    throw error;
  }
  
  // 清理临时目录
  await fs.rm(extractDir, { recursive: true, force: true });
}

// 列出可用的备份文件
async function listBackups(): Promise<string[]> {
  try {
    const config = getMongoRestoreConfig();
    const files = await fs.readdir(config.backupPath);
    return files
      .filter(file => file.startsWith('mongodb-') && file.endsWith('.gz'))
      .map(file => file.replace(/\.gz$/, ''))
      .sort();
  } catch (error) {
    console.error('列出备份文件失败:', error);
    return [];
  }
}

// 主函数
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('用法: npm run restore <备份名称>');
    console.log('可用的备份文件:');
    const backups = await listBackups();
    backups.forEach(backup => console.log(`  ${backup}`));
    return;
  }
  
  const backupName = args[0];
  if (backupName) {
    try {
      await performMongoRestore(backupName);
    } catch (error) {
      console.error('恢复过程出错:', error);
      process.exit(1);
    }
  } else {
    console.error('备份名称不能为空');
    process.exit(1);
  }
}

// Main function execution
main().catch(console.error);

export default {
  performMongoRestore,
  listBackups
};