import type { Request, Response } from 'express';
import { Result } from '../common/result.js';
import {
  createPage,
  deletePage,
  disableShare,
  enableShare,
  getShareStatus,
  listPages,
  renamePage,
} from '../services/page.js';
import { kickSharedMembers } from '../ws/room.js';
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
  requireNonEmpty(req.body, 'content');
  assertIsString(req.body, 'content');
  const data = await createPage(req.userId!, req.body);
  res.json(Result.success(data));
}

/**
 * 重命名画布（内容由协作房间实时落库，不走此接口）
 */
export async function updateController(req: Request, res: Response): Promise<void> {
  const id = assertId(req.body?.id);
  requireNonEmpty(req.body, 'title');
  assertIsString(req.body, 'title');
  assertMaxLength(req.body, 'title', 100);
  const data = await renamePage(req.userId!, { id, title: req.body.title });
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

/**
 * 开启协作分享，返回分享令牌
 */
export async function enableShareController(req: Request, res: Response): Promise<void> {
  const id = assertId(req.body?.id);
  const data = await enableShare(req.userId!, id);
  // 重复开启会重新生成令牌，旧链接即刻失效，踢掉持有旧令牌的协作者
  kickSharedMembers(id);
  res.json(Result.success(data));
}

/**
 * 关闭协作分享
 */
export async function disableShareController(req: Request, res: Response): Promise<void> {
  const id = assertId(req.body?.id ?? req.query.id);
  await disableShare(req.userId!, id);
  // 分享关闭：踢掉所有通过分享链接加入的协作者
  kickSharedMembers(id);
  res.json(Result.success());
}

/**
 * 画布分享状态
 */
export async function getShareStatusController(req: Request, res: Response): Promise<void> {
  const id = assertId(req.query.id);
  const data = await getShareStatus(req.userId!, id);
  res.json(Result.success(data));
}
