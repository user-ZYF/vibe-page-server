import { BizException } from '../common/biz-exception.js';
import { ResultCodeEnum } from '../constants/result-code.js';
import { Page, type PageInfo, type PageListItem } from '../models/index.js';
import type { PageCreateBody, PageUpdateBody } from '../types/page.js';

/**
 * 当前用户的画布列表（不含内容，按更新时间倒序）
 * @param userId 用户 ID
 * @returns PageListItem 列表
 */
export async function listPages(userId: number): Promise<PageListItem[]> {
  const pages = await Page.findAll({
    attributes: ['id', 'title', 'thumbnail', 'createdAt', 'updatedAt'],
    where: { userId },
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
  const page = await Page.create({ userId, title, content: content ?? '', thumbnail: '' });
  return page.toJSON();
}

/**
 * 画布详情，仅所有者可访问
 * @param userId 用户 ID
 * @param id 页面 ID
 * @returns PageInfo
 */
export async function pageDetail(userId: number, id: number): Promise<PageInfo> {
  const page = await requireOwnedPage(userId, id);
  return page.toJSON();
}

/**
 * 更新画布，仅所有者可操作（只更新非空字段）
 * @param userId 用户 ID
 * @param request 更新请求
 * @returns PageInfo
 */
export async function updatePage(
  userId: number,
  { id, title, content, thumbnail }: PageUpdateBody,
): Promise<PageInfo> {
  const page = await requireOwnedPage(userId, id);
  const patch: Omit<PageUpdateBody, 'id'> = {};
  if (title !== undefined) patch.title = title;
  if (content !== undefined) patch.content = content;
  if (thumbnail !== undefined) patch.thumbnail = thumbnail;
  await page.update(patch);
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
 * 获取页面并校验归属当前用户，不存在或无权限时抛异常
 * @param userId 用户 ID
 * @param id 页面 ID
 */
async function requireOwnedPage(userId: number, id: number): Promise<Page> {
  const page = await Page.findOne({ where: { id, userId } });
  if (!page) {
    throw new BizException(ResultCodeEnum.NOT_FOUND, '画布不存在或无权访问');
  }
  return page;
}
