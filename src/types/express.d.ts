import 'express-serve-static-core';

/**
 * 扩展 Express Request：JWT 鉴权通过后写入当前用户 ID
 */
declare module 'express-serve-static-core' {
  interface Request {
    /** 当前登录用户 ID（authRequired 校验通过后写入） */
    userId?: number;
  }
}
