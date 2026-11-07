import type { ResultCodeEnum } from '../constants/result-code.js';
import type { User } from '../models/index.js';

/** 访问令牌载荷 */
export interface AccessTokenPayload {
  /** 用户 ID */
  userId: number;
  /** 用户名 */
  username: string;
  /** 登录时的会话 ID */
  sessionId: string;
  /** 其余字段（iat/exp 等 JWT 标准声明） */
  [key: string]: any;
}

/** 访问令牌校验结果 */
export interface TokenAuthResult {
  /** 校验结果码，SUCCESS 表示通过 */
  code: ResultCodeEnum;
  /** 校验通过的用户，仅 code 为 SUCCESS 时有值 */
  user: User | null;
}

/** 注册请求 */
export interface RegisterBody {
  /** 用户名 */
  username: string;
  /** 密码 */
  password: string;
  /** 昵称 */
  nickname?: string;
}

/** 登录请求 */
export interface LoginBody {
  /** 用户名 */
  username: string;
  /** 密码 */
  password: string;
}
