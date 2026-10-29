import { ResultCodeEnum } from '../constants/result-code.js';

/**
 * 统一响应结果：{ code, message?, data? }
 * 成功时只带 data，失败时只带 message
 */
export interface ApiResult<T> {
  /** 状态码 */
  code: ResultCodeEnum;
  /** 提示信息（失败时返回） */
  message?: string;
  /** 响应数据（成功时返回） */
  data?: T;
}

export const Result = {
  /**
   * 成功响应
   * @param data 响应数据
   */
  success<T>(data?: T): ApiResult<T> {
    return { code: ResultCodeEnum.SUCCESS, data };
  },

  /**
   * 错误响应
   * @param code 错误码
   * @param message 提示信息
   */
  error(code: ResultCodeEnum, message: string): ApiResult<undefined> {
    return { code, message };
  },
};
