import { randomUUID } from 'node:crypto';
import { BizException } from '../common/biz-exception.js';
import { ResultCodeEnum } from '../constants/result-code.js';
import { Page, type PageInfo, type PageListItem } from '../models/index.js';
import type { PageCreateBody, PageRenameBody, ShareStatusResult } from '../types/page.js';
import type { CanvasStorageData } from '../types/canvas.js';

/**
 * 当前用户的画布列表
 * @param userId 用户 ID
 * @returns PageListItem 列表
 */
export async function listPages(userId: number): Promise<PageListItem[]> {
  const pages = await Page.findAll({
    // 不含内容
    attributes: ['id', 'title', 'createdAt', 'updatedAt'],
    where: { userId },
    // 按更新时间倒序
    order: [['updatedAt', 'DESC']],
  });
  return pages.map((page) => page.get({ plain: true }));
}

/**
 * 新建画布
 * @param userId 用户 ID
 * @param request 新建请求
 * @returns PageInfo
 */
export async function createPage(userId: number, { title, content }: PageCreateBody): Promise<PageInfo> {
  const page = await Page.create({ userId, title, content });
  return page.toJSON();
}

/**
 * 重命名画布（仅所有者可操作；画布内容由协作房间落库，不走此接口）
 * @param userId 用户 ID
 * @param request 重命名请求
 * @returns PageInfo
 */
export async function renamePage(
  userId: number,
  { id, title }: PageRenameBody,
): Promise<PageInfo> {
  const page = await requireOwnedPage(userId, id);
  await page.update({ title });
  return page.toJSON();
}

/**
 * 删除画布（逻辑删除），仅所有者可操作
 * @param userId 用户 ID
 * @param id 页面 ID
 */
export async function deletePage(userId: number, id: number): Promise<void> {
  const page = await requireOwnedPage(userId, id);
  await page.update({ deleted: 1 });
}

/**
 * 开启协作分享：生成分享令牌并返回（重复开启时重新生成）
 * @param userId 用户 ID
 * @param id 页面 ID
 * @returns 分享令牌
 */
export async function enableShare(userId: number, id: number): Promise<ShareStatusResult> {
  const page = await requireOwnedPage(userId, id);
  const shareToken = randomUUID();
  await page.update({ shareToken });
  return { shareToken };
}

/**
 * 关闭协作分享：清空分享令牌，已有链接即刻失效
 * @param userId 用户 ID
 * @param id 页面 ID
 */
export async function disableShare(userId: number, id: number): Promise<void> {
  const page = await requireOwnedPage(userId, id);
  await page.update({ shareToken: '' });
}

/**
 * 获取画布当前的分享状态，仅所有者可查看
 * @param userId 用户 ID
 * @param id 页面 ID
 * @returns 分享令牌（未开启为空串）
 */
export async function getShareStatus(userId: number, id: number): Promise<ShareStatusResult> {
  const page = await requireOwnedPage(userId, id);
  return { shareToken: page.shareToken };
}

/**
 * 协作房间落库：把房间最新画布数据写回页面 content
 * @param pageId 页面 ID
 * @param canvasData 画布数据（JSON 序列化后存储）
 */
export async function persistPageContent(pageId: number, canvasData: CanvasStorageData): Promise<void> {
  try {
    await Page.update({ content: JSON.stringify(canvasData) }, { where: { id: pageId } });
  } catch (err) {
    console.error(`[collab] 房间 ${pageId} 落库失败`, err);
  }
}

/**
 * 获取页面并校验归属当前用户，不存在或无权限时抛异常
 * @param userId 用户 ID
 * @param id 页面 ID
 */
async function requireOwnedPage(userId: number, id: number): Promise<Page> {
  const page = await Page.findOne({ where: { id, userId } });
  if (!page) {
    throw new BizException(ResultCodeEnum.NOT_FOUND, '画布不存在');
  }
  return page;
}
