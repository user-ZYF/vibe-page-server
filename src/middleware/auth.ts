import type { NextFunction, Request, Response } from 'express';
import { Result } from '../common/result.js';
import { ResultCodeEnum } from '../constants/result-code.js';
import { resolveTokenUser } from '../services/auth.js';

/** Authorization 头前缀 */
const BEARER_PREFIX = 'Bearer ';

/** 令牌校验失败原因对应的提示文案 */
const AUTH_ERROR_MESSAGES: Partial<Record<ResultCodeEnum, string>> = {
  [ResultCodeEnum.UNAUTHORIZED]: '未登录或令牌已过期',
  [ResultCodeEnum.USER_NOT_FOUND]: '账号不存在，请重新登录',
  [ResultCodeEnum.FORCE_OFFLINE]: '账号已在其他地方登录，请重新登录',
};

/**
 * JWT 鉴权中间件：校验 Authorization 头，解析用户 ID 写入 req.userId
 */
export async function authRequired(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.get('Authorization');
  if (!header?.startsWith(BEARER_PREFIX)) {
    // 未携带 token 或格式不对（没有 Bearer 前缀）
    res.json(Result.error(ResultCodeEnum.UNAUTHORIZED, '令牌格式不正确'));
    return;
  }
  try {
    const auth = await resolveTokenUser(header.slice(BEARER_PREFIX.length));
    if (auth.code !== ResultCodeEnum.SUCCESS || !auth.user) {
      res.json(Result.error(auth.code, AUTH_ERROR_MESSAGES[auth.code] ?? '未授权'));
      return;
    }
    req.userId = auth.user.id;
    next();
  } catch {
    res.json(Result.error(ResultCodeEnum.UNAUTHORIZED, '未登录或令牌已过期'));
  }
}
