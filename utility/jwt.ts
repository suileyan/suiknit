import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.config' });

// 生成JWT Token
export function generateJWT(payload: object, expiresIn?: string | number): string {
  const secret = process.env.JWENCRPTION || 'your-secret-key';
  const defaultExpiresIn = process.env.JWT_EXPIRES_IN || '30d';
  
  // 使用 any 类型来绕过 TypeScript 类型检查问题
  return (jwt.sign as any)(payload, secret, { 
    expiresIn: expiresIn || defaultExpiresIn,
    issuer: 'suiknit-api'
  });
}

// 验证JWT Token
export function verifyJWT(token: string): boolean {
  try {
    const secret = process.env.JWENCRPTION || 'your-secret-key';
    (jwt.verify as any)(token, secret);
    return true;
  } catch (error) {
    console.error('JWT验证失败:', error);
    return false;
  }
}

// 解码JWT Token（不验证签名）
export function decodeJWT(token: string): string | jwt.JwtPayload | null {
  try {
    return (jwt.decode as any)(token);
  } catch (error) {
    console.error('JWT解码失败:', error);
    return null;
  }
}