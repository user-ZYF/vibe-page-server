import type { Request, Response } from 'express';
import { Result } from '../common/result.js';
import { createPage, deletePage, listPages, pageDetail, updatePage } from '../services/page.js';
import { assertId, assertIsString, assertMaxLength, requireNonEmpty } from '../utils/validate.js';

/**
 * 我的画布列表
 */
export async function listController(req: Request, res: Response): Promise<void> {
  const list = await listPages(req.userId!);
  res.json(Result.success(list));
}

/**
 * 新建画布
 */
export async function createController(req: Request, res: Response): Promise<void> {
  requireNonEmpty(req.body, 'title');
  assertIsString(req.body, 'title');
  assertMaxLength(req.body, 'title', 100);
  const data = await createPage(req.userId!, req.body);
  res.json(Result.success(data));
}

/**
 * 画布详情
 */
export async function detailController(req: Request, res: Response): Promise<void> {
  const id = assertId(req.query.id);
  const data = await pageDetail(req.userId!, id);
  res.json(Result.success(data));
}

/**
 * 保存画布
 */
export async function updateController(req: Request, res: Response): Promise<void> {
  const id = assertId(req.body?.id);
  assertIsString(req.body, 'title');
  assertMaxLength(req.body, 'title', 100);
  const data = await updatePage(req.userId!, { ...req.body, id });
  res.json(Result.success(data));
}

/**
 * 删除画布
 */
export async function deleteController(req: Request, res: Response): Promise<void> {
  const id = assertId(req.query.id);
  await deletePage(req.userId!, id);
  res.json(Result.success());
}
