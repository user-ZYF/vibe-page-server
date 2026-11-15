/** 房间在线人数上限 */
export const MAX_ROOM_MEMBERS = 4;

/** 画布落库最小间隔（ms）：间隔内的修改只覆盖暂存数据，不触发写库 */
export const PERSIST_DELAY_MS = 2000;

/** 协作 WebSocket 关闭码（自定义 4000+，客户端据此停止自动重连） */
export enum CollabCloseCodeEnum {
  /** 未定义 */
  UNDEFINED = 0,
  /** 房间已满 */
  ROOM_FULL = 4001,
  /** 同账号已加入 */
  DUPLICATE_USER = 4002,
  /** 会话失效（账号在其他设备登录或已登出） */
  FORCE_OFFLINE = 4003,
  /** 分享已关闭或令牌已重置 */
  SHARE_DISABLED = 4004,
}
