// CORS configuration
// This file defines CORS settings for the application

import fs from 'fs';
import path from 'path';

interface CORSConfig {
  allowedOrigins: string[];
  blockedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  credentials: boolean;
  maxAge: number;
}

// 读取 origins 文件的函数
function readOriginsFromFile(filename: string): string[] {
  try {
    const filePath = path.join(process.cwd(), 'config', 'cors', filename);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));
  } catch (error) {
    console.error(`Error reading ${filename}:${error}`);
    return [];
  }
}

// 加载 origins
const allowedOrigins = readOriginsFromFile('allowed_origins.txt');
const blockedOrigins = readOriginsFromFile('blocked_origins.txt');

const corsConfig: CORSConfig = {
  allowedOrigins: allowedOrigins,
  blockedOrigins: blockedOrigins,
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'X-Access-Token', 'Token'],
  exposedHeaders: ['X-Access-Token'],
  credentials: true,
  maxAge: 86400 // 24 hours
};

export default corsConfig;