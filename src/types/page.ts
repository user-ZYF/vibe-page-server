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
  /** 防抖定时器：修改停止 PERSIST_DELAY_MS 后触发落库（null 表示未调度） */
  timer: NodeJS.Timeout | null;
  /** 写库串行队列：后提交的写一定在前一个写完成后执行，避免乱序覆盖 */
  queue: Promise<void>;
}
