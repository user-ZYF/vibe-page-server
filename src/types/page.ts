import type { CanvasStorageData } from './canvas.js';

/** 新建画布请求 */
export interface PageCreateBody {
  /** 页面标题 */
  title: string;
  /** 初始画布数据（JSON 字符串） */
  content: string;
}

/** 重命名画布请求 */
export interface PageRenameBody {
  /** 页面 ID */
  id: number;
  /** 页面标题 */
  title: string;
}

/** 分享状态响应 */
export interface ShareStatusResult {
  /** 分享令牌（未开启为空串） */
  shareToken: string;
}

/** 单页画布落库调度状态 */
export interface PagePersistState {
  /** 暂存待写库的最新画布数据（null 表示无脏数据） */
  pending: CanvasStorageData | null;
  /** 上次发起写库的时间戳（0 表示从未写过） */
  lastPersistAt: number;
  /** 写库串行队列：后提交的写一定在前一个写完成后执行，避免乱序覆盖 */
  queue: Promise<void>;
}
