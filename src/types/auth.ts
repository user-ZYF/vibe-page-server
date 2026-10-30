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
