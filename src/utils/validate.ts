import { BizException } from '../common/biz-exception.js';
import { ResultCodeEnum } from '../constants/result-code.js';

/** 判空（未传 / null / 空字符串均视为空） */
function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === '';
}

/**
 * 必填：字段为空抛 "{field} 不能为空"
 * @param body 请求体
 * @param field 字段名
 */
export function requireNonEmpty(body: Record<string, unknown> | undefined, field: string): void {
  if (isEmpty(body?.[field])) {
    throw new BizException(ResultCodeEnum.BAD_REQUEST, `${field} 不能为空`);
  }
}

/**
 * 类型
 * @param body 请求体
 * @param field 字段名
 */
export function assertIsString(body: Record<string, unknown> | undefined, field: string): void {
  const value = body?.[field];
  if (isEmpty(value)) return;
  if (typeof value !== 'string') {
    throw new BizException(ResultCodeEnum.BAD_REQUEST, `${field} 参数格式错误`);
  }
}

/**
 * 长度区间
 * @param body 请求体
 * @param field 字段名
 * @param min 最小长度
 * @param max 最大长度
 */
export function assertLengthRange(
  body: Record<string, unknown> | undefined,
  field: string,
  min: number,
  max: number,
): void {
  const value = body?.[field];
  if (isEmpty(value) || typeof value !== 'string') return;
  if (value.length < min || value.length > max) {
    throw new BizException(ResultCodeEnum.BAD_REQUEST, `${field} 长度需在 ${min}-${max} 之间`);
  }
}

/**
 * 最大长度
 * @param body 请求体
 * @param field 字段名
 * @param max 最大长度
 */
export function assertMaxLength(
  body: Record<string, unknown> | undefined,
  field: string,
  max: number,
): void {
  const value = body?.[field];
  if (isEmpty(value) || typeof value !== 'string') return;
  if (value.length > max) {
    throw new BizException(ResultCodeEnum.BAD_REQUEST, `${field} 长度不能超过 ${max}`);
  }
}

/**
 * 校验并返回正整数 ID（query 或 body 中的 id 参数）
 * @param value 原始值
 * @param field 字段名
 * @returns 正整数 ID
 */
export function assertId(value: unknown, field = 'id'): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw new BizException(ResultCodeEnum.BAD_REQUEST, `${field} 不能为空`);
  }
  return n;
}
