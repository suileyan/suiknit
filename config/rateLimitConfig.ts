// Redis请求频率限制配置
// 此文件定义了哪些路由应该被排除在请求频率限制之外

import fs from 'fs';
import path from 'path';

interface RateLimitConfig {
  // 最大请求数
  maxRequests: number;
  // 时间窗口（毫秒）
  windowMs: number;
  // IP黑名单持续时间（秒）
  blacklistDuration: number;
  // 是否启用频率限制
  enabled: boolean;
  // 排除的路由路径（不计入频率限制）
  excludedPaths: string[];
  // 排除的HTTP方法（不计入频率限制）
  excludedMethods: string[];
}

// 从文件读取排除路径的函数
function readExcludedPathsFromFile(filename: string): string[] {
  try {
    const filePath = path.join(process.cwd(), 'config', 'rate-limit', filename);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return [];
  }
}

// 从文件读取排除方法的函数
function readExcludedMethodsFromFile(filename: string): string[] {
  try {
    const filePath = path.join(process.cwd(), 'config', 'rate-limit', filename);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return content
      .split(',')
      .map(method => method.trim().toUpperCase())
      .filter(method => method);
  } catch (error) {
    console.error(`Error reading ${filename}:`, error);
    return [];
  }
}

// 加载排除的路径和方法
const excludedPaths = readExcludedPathsFromFile('excluded_paths.txt');
const excludedMethods = readExcludedMethodsFromFile('excluded_methods.txt');

// 从环境变量获取配置
const rateLimitConfig: RateLimitConfig = {
  maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  blacklistDuration: parseInt(process.env.RATE_LIMIT_BLACKLIST_DURATION || '3600', 10),
  enabled: process.env.RATE_LIMIT_ENABLED === 'true',
  excludedPaths: excludedPaths,
  excludedMethods: excludedMethods
};

export default rateLimitConfig;