import type { NextFunction, Request, Response } from 'express';
import { BizException } from '../common/biz-exception.js';
import { Result } from '../common/result.js';
import { ResultCodeEnum } from '../constants/result-code.js';

/**
 * 全局异常处理：始终返回 HTTP 200 + Result 包装
 * - BizException → 业务错误码
 * - body 解析失败 → 400
 * - 其他 → 500 兜底
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof BizException) {
    res.json(Result.error(err.code, err.message));
    return;
  }
  const type = (err as { type?: string } | null)?.type;
  if (type === 'entity.parse.failed' || type === 'entity.too.large') {
    res.json(Result.error(ResultCodeEnum.BAD_REQUEST, '请求体格式错误'));
    return;
  }
  console.error('系统异常', err);
  res.json(Result.error(ResultCodeEnum.INTERNAL_ERROR, '系统异常，请稍后重试'));
}
