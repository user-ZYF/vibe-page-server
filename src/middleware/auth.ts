import type { NextFunction, Request, Response } from 'express';
import { Result } from '../common/result.js';
import { ResultCodeEnum } from '../constants/result-code.js';
import { User } from '../models/index.js';
import { parseToken } from '../utils/jwt.js';

/** Authorization 头前缀 */
const BEARER_PREFIX = 'Bearer ';

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
    const payload = parseToken(header.slice(BEARER_PREFIX.length));
    const user = await User.findByPk(payload.userId, { attributes: ['id', 'sessionId'] });
    if (!user) {
      res.json(Result.error(ResultCodeEnum.USER_NOT_FOUND, '账号不存在，请重新登录'));
      return;
    }
    // 比对令牌 sessionId 与 user.session_id，不一致说明会话已被新登录顶替
    if (typeof payload.sessionId !== 'string' || user.sessionId !== payload.sessionId) {
      res.json(Result.error(ResultCodeEnum.FORCE_OFFLINE, '账号已在其他地方登录，请重新登录'));
      return;
    }
    req.userId = user.id;
    next();
  } catch {
    // token 非法或过期
    res.json(Result.error(ResultCodeEnum.UNAUTHORIZED, '未登录或令牌已过期'));
  }
}
