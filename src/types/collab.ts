import type { WebSocket } from 'ws';
import type { CanvasStorageData, CanvasInnerElement, CanvasStyleRule } from './canvas.js';

/**
 * 协作消息类型（WebSocket 消息的 type 字段，数字枚举）
 * 1-9 为客户端发往服务端，10+ 为服务端发往客户端
 */
export enum CollabMsgTypeEnum {
  /** 客户端提交画布修改（语义操作列表） */
  OP = 1,
  /** 客户端上报选中元素（选中标记，非操作锁） */
  SELECT = 2,
  /** 客户端取消选中元素 */
  DESELECT = 3,
  /** 服务端下发初始数据 / 重同步数据 */
  INIT = 10,
  /** 服务端确认修改已被接受 */
  ACK = 11,
  /** 服务端拒绝修改（版本过期），附带最新画布数据供重发 */
  REJECT = 12,
  /** 服务端广播其他成员的修改 */
  OP_BCAST = 13,
  /** 服务端广播远程选中标记变化 */
  SELECTION_UPDATE = 15,
  /** 服务端广播在线成员列表 */
  MEMBERS = 16,
}

/** 协作语义操作类型 */
export enum CollabOpTypeEnum {
  /** 未定义 */
  UNDEFINED = 0,
  /** 新增元素（含子树） */
  ADD = 1,
  /** 删除元素（含子树） */
  REMOVE = 2,
  /** 移动元素 */
  MOVE = 3,
  /** 更新元素属性 */
  UPDATE = 4,
  /** 写入/覆盖样式规则 */
  STYLE_SET = 5,
  /** 删除样式规则 */
  STYLE_REMOVE = 6,
}

/** 新增元素操作（beforeId 为插入点后的兄弟元素 id，null 表示追加到末尾；parentId 为空串表示根级） */
export interface CollabAddOp {
  /** 操作类型 */
  type: CollabOpTypeEnum.ADD;
  /** 目标父元素 id（空串表示根级 children） */
  parentId: string;
  /** 插入到该元素之前（null 表示追加） */
  beforeId: string | null;
  /** 新增元素（含完整子树） */
  element: CanvasInnerElement;
}

/** 删除元素操作（含子树） */
export interface CollabRemoveOp {
  /** 操作类型 */
  type: CollabOpTypeEnum.REMOVE;
  /** 元素 id */
  id: string;
}

/** 移动元素操作 */
export interface CollabMoveOp {
  /** 操作类型 */
  type: CollabOpTypeEnum.MOVE;
  /** 元素 id */
  id: string;
  /** 目标父元素 id（空串表示根级） */
  parentId: string;
  /** 插入到该元素之前（null 表示追加） */
  beforeId: string | null;
}

/** 更新元素属性操作（浅合并；值为 null 表示删除该属性；id/type/children 不可更新） */
export interface CollabUpdateOp {
  /** 操作类型 */
  type: CollabOpTypeEnum.UPDATE;
  /** 元素 id */
  id: string;
  /** 属性补丁 */
  props: Record<string, unknown>;
}

/** 写入/覆盖样式规则（按 selector + type 定位） */
export interface CollabStyleSetOp {
  /** 操作类型 */
  type: CollabOpTypeEnum.STYLE_SET;
  /** 样式规则 */
  rule: CanvasStyleRule;
}

/** 删除样式规则 */
export interface CollabStyleRemoveOp {
  /** 操作类型 */
  type: CollabOpTypeEnum.STYLE_REMOVE;
  /** 选择器 */
  selector: string;
  /** 规则类型 */
  ruleType: number;
  /** 完整 at-rule 文本 */
  atRuleCssText?: string;
}

/** 协作语义操作 */
export type CollabOp =
  | CollabAddOp
  | CollabRemoveOp
  | CollabMoveOp
  | CollabUpdateOp
  | CollabStyleSetOp
  | CollabStyleRemoveOp;

/** 房间成员信息 */
export interface CollabMember {
  /** 用户 ID */
  userId: number;
  /** 昵称 */
  nickname: string;
}

/** 远程选中标记信息 */
export interface CollabSelectionInfo {
  /** 元素 ID */
  elementId: string;
  /** 选中该元素的成员列表 */
  members: CollabMember[];
}

/** 客户端提交修改 */
export interface CollabOpMsg {
  /** 消息类型 */
  type: CollabMsgTypeEnum.OP;
  /** 应用 ops 前的画布数据 */
  baseData: CanvasStorageData;
  /** 应用 ops 后的画布数据 */
  canvasData: CanvasStorageData;
  /** 语义操作列表 */
  ops: CollabOp[];
}

/** 客户端上报/取消元素选中标记 */
export interface CollabSelectionMsg {
  /** 消息类型 */
  type: CollabMsgTypeEnum.SELECT | CollabMsgTypeEnum.DESELECT;
  /** 元素 ID */
  elementId: string;
  /** 客户端基准画布数据 */
  baseData: CanvasStorageData;
}

/** 客户端发往服务端的消息联合 */
export type CollabClientMsg = CollabOpMsg | CollabSelectionMsg;

/** 服务端下发初始数据 */
export interface CollabInitMsg {
  /** 消息类型 */
  type: CollabMsgTypeEnum.INIT;
  /** 页面标题 */
  title: string;
  /** 页面所有者用户 ID */
  userId: number;
  /** 服务端最新画布数据 */
  canvasData: CanvasStorageData;
  /** 当前在线成员列表 */
  members: CollabMember[];
  /** 当前远程选中标记表 */
  selections: CollabSelectionInfo[];
}

/** 服务端确认修改 */
export interface CollabAckMsg {
  /** 消息类型 */
  type: CollabMsgTypeEnum.ACK;
}

/** 服务端拒绝修改 */
export interface CollabRejectMsg {
  /** 消息类型 */
  type: CollabMsgTypeEnum.REJECT;
  /** 服务器当前画布数据 */
  canvasData: CanvasStorageData;
}

/** 服务端广播其他成员的修改 */
export interface CollabOpBcastMsg {
  /** 消息类型 */
  type: CollabMsgTypeEnum.OP_BCAST;
  /** 应用后的服务端画布数据 */
  canvasData: CanvasStorageData;
  /** 语义操作列表 */
  ops: CollabOp[];
  /** 修改来源用户 ID */
  userId: number;
}

/** 服务端广播远程选中标记变化 */
export interface CollabSelectionUpdateMsg {
  /** 消息类型 */
  type: CollabMsgTypeEnum.SELECTION_UPDATE;
  /** 元素 ID */
  elementId: string;
  /** 选中该元素的成员列表（空数组表示标记已移除） */
  members: CollabMember[];
}

/** 服务端广播成员列表 */
export interface CollabMembersMsg {
  /** 消息类型 */
  type: CollabMsgTypeEnum.MEMBERS;
  /** 在线成员列表 */
  members: CollabMember[];
}

/** 服务端发往客户端的消息联合 */
export type CollabServerMsg =
  | CollabInitMsg
  | CollabAckMsg
  | CollabRejectMsg
  | CollabOpBcastMsg
  | CollabSelectionUpdateMsg
  | CollabMembersMsg;

/** 房间内成员（含连接对象） */
export interface RoomMember extends CollabMember {
  /** WebSocket 连接 */
  socket: WebSocket;
}

/** 房间元信息 */
export interface RoomMeta {
  /** 页面标题 */
  title: string;
  /** 页面所有者用户 ID */
  userId: number;
}

/** 连接上下文（WebSocket 鉴权通过后挂到连接上） */
export interface ConnContext {
  /** 当前用户 ID */
  userId: number;
  /** 握手时的会话 ID */
  sessionId: string;
  /** 所在房间 */
  room: CollabRoom;
}

/** 协作房间：每个画布页一个，持有最新画布数据与版本号 */
export interface CollabRoom {
  /** 页面 ID */
  pageId: number;
  /** 页面标题 */
  title: string;
  /** 页面所有者用户 ID */
  userId: number;
  /** 服务端最新画布数据 */
  canvasData: CanvasStorageData;
  /** 在线成员（socket -> 成员信息） */
  members: Map<WebSocket, RoomMember>;
  /** 选中表（elementId -> 选中者用户 ID 列表） */
  selections: Map<string, number[]>;
}
