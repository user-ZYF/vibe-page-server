/** 新建画布请求 */
export interface PageCreateBody {
  /** 页面标题 */
  title: string;
  /** 画布内容 JSON，不传则为空画布 */
  content?: string;
}

/** 更新画布请求 */
export interface PageUpdateBody {
  /** 页面 ID */
  id: number;
  /** 页面标题 */
  title?: string;
  /** 画布内容 JSON */
  content?: string;
  /** 画布缩略图（base64 PNG） */
  thumbnail?: string;
}
