import { randomUUID } from 'node:crypto';
import { BizException } from '../common/biz-exception.js';
import { ResultCodeEnum } from '../constants/result-code.js';
import { Page, type PageInfo, type PageListItem } from '../models/index.js';
import type { PageCreateBody, PageRenameBody, ShareStatusResult, PagePersistState } from '../types/page.js';
import type { CanvasStorageData } from '../types/canvas.js';
import { PERSIST_DELAY_MS } from '../constants/collab.js';

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

/** 各页面的落库调度表（pageId -> 状态） */
const persistStates = new Map<number, PagePersistState>();

function getPersistState(pageId: number): PagePersistState {
  let state = persistStates.get(pageId);
  if (!state) {
    state = { pending: null, lastPersistAt: 0, queue: Promise.resolve() };
    persistStates.set(pageId, state);
  }
  return state;
}

/**
 * 协作修改落库（节流）：距上次写库超过 PERSIST_DELAY_MS 立即落库，否则仅覆盖暂存数据
 * @param pageId 页面 ID
 * @param canvasData 最新画布数据
 */
export function schedulePersistPageContent(pageId: number, canvasData: CanvasStorageData): void {
  const state = getPersistState(pageId);
  state.pending = canvasData;
  if (Date.now() - state.lastPersistAt < PERSIST_DELAY_MS) return;
  persist(pageId, state);
}

/**
 * 冲刷暂存数据（成员退出、房间销毁时调用）：无视时间间隔直接落库
 * @param pageId 页面 ID
 * @param canvasData 最新画布数据
 */
export function flushPersistPageContent(pageId: number, canvasData: CanvasStorageData): void {
  const state = getPersistState(pageId);
  state.pending = canvasData;
  persist(pageId, state);
}

/** 把写库任务排入串行队列（promise 链保证同页写库有序）；执行时取最新暂存数据，失败保留待下次触发重试 */
function persist(pageId: number, state: PagePersistState): void {
  // 写库和写完的时机无对应关系（后发起的 UPDATE 可能先完成），需串行保证旧数据不会覆盖新数据
  state.queue = state.queue.then(async () => {
    // 执行时才取暂存：期间若有新数据进来，直接写最新一份，旧快照自动跳过
    const data = state.pending;
    if (!data) return;
    state.lastPersistAt = Date.now();
    try {
      await Page.update({ content: JSON.stringify(data) }, { where: { id: pageId } });
      // 写库期间暂存未被新数据覆盖才清空，否则保留更新的数据等下次写
      if (state.pending === data) state.pending = null;
    } catch (err) {
      // 失败：暂存原样保留，待下次触发重试
      console.error(`[collab] 页面 ${pageId} 落库失败，待下次触发重试`, err);
    }
  });
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
