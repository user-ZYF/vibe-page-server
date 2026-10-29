import type { NextFunction, Request, Response } from 'express';
import { Result } from '../common/result.js';
import { ResultCodeEnum } from '../constants/result-code.js';
import { parseToken } from '../utils/jwt.js';

/** Authorization 头前缀 */
const BEARER_PREFIX = 'Bearer ';

/**
 * JWT 鉴权中间件：校验 Authorization 头，解析用户 ID 写入 req.userId
 */
export function authRequired(req: Request, res: Response, next: NextFunction): void {
  const header = req.get('Authorization');
  if (!header?.startsWith(BEARER_PREFIX)) {
    // 未携带 token 或格式不对（没有 Bearer 前缀）
    res.json(Result.error(ResultCodeEnum.UNAUTHORIZED, '令牌格式不正确'));
    return;
  }
  try {
    const payload = parseToken(header.slice(BEARER_PREFIX.length));
    req.userId = Number(payload.sub);
    next();
  } catch {
    // token 非法或过期
    res.json(Result.error(ResultCodeEnum.UNAUTHORIZED, '未登录或令牌已过期'));
  }
}
