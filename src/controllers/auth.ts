import type { Request, Response } from 'express';
import { Result } from '../common/result.js';
import {
  login,
  logout,
  refresh,
  register,
  type LoginBody,
  type RegisterBody,
} from '../services/auth.js';
import {
  assertIsString,
  assertLengthRange,
  assertMaxLength,
  requireNonEmpty,
} from '../utils/validate.js';

/**
 * 注册
 */
export async function registerController(req: Request, res: Response): Promise<void> {
  requireNonEmpty(req.body, 'username');
  assertIsString(req.body, 'username');
  assertLengthRange(req.body, 'username', 3, 50);
  requireNonEmpty(req.body, 'password');
  assertIsString(req.body, 'password');
  assertLengthRange(req.body, 'password', 6, 64);
  assertIsString(req.body, 'nickname');
  assertMaxLength(req.body, 'nickname', 50);
  const data = await register(req.body as RegisterBody);
  res.json(Result.success(data));
}

/**
 * 登录
 */
export async function loginController(req: Request, res: Response): Promise<void> {
  requireNonEmpty(req.body, 'username');
  requireNonEmpty(req.body, 'password');
  const data = await login(req.body as LoginBody);
  res.json(Result.success(data));
}

/**
 * 刷新令牌
 */
export async function refreshController(req: Request, res: Response): Promise<void> {
  requireNonEmpty(req.body, 'refreshToken');
  const data = await refresh(req.body.refreshToken);
  res.json(Result.success(data));
}

/**
 * 登出
 */
export async function logoutController(req: Request, res: Response): Promise<void> {
  requireNonEmpty(req.body, 'refreshToken');
  await logout(req.body.refreshToken);
  res.json(Result.success());
}
