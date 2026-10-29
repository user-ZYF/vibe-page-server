import { ResultCodeEnum } from '../constants/result-code.js';

/**
 * 业务异常
 */
export class BizException extends Error {
  /** 错误码 */
  readonly code: ResultCodeEnum;

  /**
   * @param code 错误码
   * @param message 提示信息
   */
  constructor(code: ResultCodeEnum, message: string) {
    super(message);
    this.code = code;
  }
}
