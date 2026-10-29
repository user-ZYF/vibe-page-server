/**
 * 响应状态码
 */
export enum ResultCodeEnum {
  /** 成功 */
  SUCCESS = 0,
  /** 参数错误/业务错误 */
  BAD_REQUEST = 400,
  /** 未登录或令牌已过期 */
  UNAUTHORIZED = 401,
  /** 资源不存在或无权访问 */
  NOT_FOUND = 404,
  /** 系统异常 */
  INTERNAL_ERROR = 500,
}
