import jwt from 'jsonwebtoken';
import type { AccessTokenPayload } from '../types/auth.js';

/**
 * 签发访问令牌，载荷含 userId、username、sessionId
 * @param userId 用户 ID
 * @param username 用户名
 * @param sessionId 当前会话 ID
 * @returns JWT 字符串
 */
export function generateToken(userId: number, username: string, sessionId: string): string {
  return jwt.sign({ userId, username, sessionId }, process.env.JWT_SECRET!, {
    expiresIn: Number(process.env.JWT_ACCESS_EXPIRE_HOURS) * 60 * 60,
  });
}

/**
 * 解析访问令牌，非法或过期时抛异常
 * @param token JWT 字符串
 * @returns 令牌载荷
 */
export function parseToken(token: string): AccessTokenPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as AccessTokenPayload;
}
