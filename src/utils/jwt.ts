import jwt, { type JwtPayload } from 'jsonwebtoken';

/**
 * 签发访问令牌，subject 为用户 ID
 * @param userId 用户 ID
 * @param username 用户名
 * @returns JWT 字符串
 */
export function generateToken(userId: number, username: string): string {
  return jwt.sign({ username }, process.env.JWT_SECRET!, {
    subject: String(userId),
    expiresIn: Number(process.env.JWT_ACCESS_EXPIRE_HOURS) * 60 * 60,
  });
}

/**
 * 解析访问令牌，非法或过期时抛异常
 * @param token JWT 字符串
 * @returns 载荷（sub 为用户 ID 字符串）
 */
export function parseToken(token: string): JwtPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
}
