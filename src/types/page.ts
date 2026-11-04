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
