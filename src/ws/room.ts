import { WebSocket } from 'ws';
import { isDeepStrictEqual } from 'node:util';
import type {
  CollabSelectionInfo,
  CollabMember,
  CollabServerMsg,
  CollabOpMsg,
  CollabRoom,
  RoomMember,
  RoomMeta,
} from '../types/collab.js';
import type { CanvasStorageData, CanvasInnerElement } from '../types/canvas.js';
import { CollabMsgTypeEnum as MsgType } from '../types/collab.js';
import { CollabCloseCodeEnum, MAX_ROOM_MEMBERS } from '../constants/collab.js';
import { schedulePersistPageContent, flushPersistPageContent } from '../services/page.js';

/** 全局房间表 pageId -> CollabRoom */
const rooms = new Map<number, CollabRoom>();

// ==================== 房间管理 ====================

/**
 * 获取房间，不存在则创建
 * @param pageId 页面 ID
 * @param canvasData 初始画布数据（首次创建时从数据库读出）
 * @param meta 页面元信息（标题、所有者）
 */
export function getOrCreateRoom(
  pageId: number,
  canvasData: CanvasStorageData,
  meta: RoomMeta,
): CollabRoom {
  let room = rooms.get(pageId);
  if (!room) {
    room = { pageId, title: meta.title, userId: meta.userId, canvasData, members: new Map(), selections: new Map() };
    rooms.set(pageId, room);
  }
  return room;
}

/** 从房间表移除 */
export function removeRoom(room: CollabRoom): void {
  rooms.delete(room.pageId);
  // 销毁前冲刷可能仍在暂存中的画布数据
  flushPersistPageContent(room.pageId, room.canvasData);
}

// ==================== 成员进出 ====================

/**
 * 成员加入房间
 * @param room 房间
 * @param member 成员；房间已满直接关闭连接；同账号已在房间时踢掉旧连接，由新连接顶替
 */
export function joinRoom(room: CollabRoom, member: RoomMember): void {
  // 同账号已在房间中：移出旧成员并断开其连接，阻止同账号多次进入同一个房间
  const existing = findMember(room, member.userId);
  if (existing) {
    leaveRoom(room, existing.socket);
    existing.socket.close(CollabCloseCodeEnum.DUPLICATE_USER);
  }
  // 房间人数已达上限
  if (room.members.size >= MAX_ROOM_MEMBERS) {
    member.socket.close(CollabCloseCodeEnum.ROOM_FULL);
    return;
  }
  room.members.set(member.socket, member);
  // 发送init数据
  send(member.socket, {
    type: MsgType.INIT,
    title: room.title,
    userId: room.userId,
    canvasData: room.canvasData,
    members: memberList(room),
    selections: selectionList(room),
  });
  // 广播成员列表
  broadcastMembers(room);
}

/**
 * 成员离开房间：释放其所有选中标记、广播成员列表；房间空了由调用方负责销毁
 * @param room 房间
 * @param socket 连接
 */
export function leaveRoom(room: CollabRoom, socket: WebSocket): void {
  const member = room.members.get(socket);
  if (!member) return;
  room.members.delete(socket);
  releaseUserSelections(room, member.userId);
  broadcastMembers(room);
}

// ==================== 画布修改 ====================

/**
 * 处理客户端修改包：基准数据比对 -> 采信客户端应用结果 -> 广播
 * 服务端不感知画布结构，ops 由前端保证可正确应用
 * @param room 房间
 * @param socket 发送者连接
 * @param msg 修改包（基准数据 + 应用后的画布数据 + 语义操作列表）
 */
export function handleOp(room: CollabRoom, socket: WebSocket, msg: CollabOpMsg): void {
  const member = room.members.get(socket);
  if (!member) return;

  // 基准不一致（客户端数据过期）：拒收并回传最新画布数据，客户端对齐后重发
  if (!isDeepStrictEqual(msg.baseData, room.canvasData)) {
    send(socket, { type: MsgType.REJECT, canvasData: room.canvasData });
    return;
  }

  // 提交：直接采信客户端应用后的画布数据
  room.canvasData = msg.canvasData;
  send(socket, { type: MsgType.ACK });
  broadcast(room, socket, {
    type: MsgType.OP_BCAST,
    canvasData: room.canvasData,
    ops: msg.ops,
    userId: member.userId,
  });

  // 本次修改删除掉的元素若带选中标记（含自己的），自动释放
  pruneStaleSelections(room);
  // 标记脏数据并延迟合并落库（串行队列保证写库顺序）
  schedulePersistPageContent(room.pageId, room.canvasData);
}

// ==================== 选中标记 ====================

/**
 * 处理元素选中变化：cur 为成员当前唯一选中，清扫其在其他元素上的标记后写入 cur（仅标记持有者本人可移除）
 * 仅作展示；同元素可被多人同时选中，各自保留标记
 * 基准不一致（客户端数据过期）：拒收并回传最新画布数据，客户端对齐后可重新选中
 * @param room 房间
 * @param socket 发送者连接
 * @param cur 当前选中的元素 ID（null 表示当前未选中）
 * @param baseData 客户端基准画布数据
 */
export function handleSelect(
  room: CollabRoom,
  socket: WebSocket,
  cur: string | null,
  baseData: CanvasStorageData,
): void {
  const member = room.members.get(socket);
  if (!member) return;
  if (!isDeepStrictEqual(baseData, room.canvasData)) {
    send(socket, { type: MsgType.REJECT, canvasData: room.canvasData });
    return;
  }
  // 成员同一时刻只持有一个选中标记：释放 cur 以外的全部旧标记（含客户端未上报的残留）
  for (const [elementId] of room.selections) {
    if (elementId !== cur && dropSelection(room, elementId, member.userId)) {
      broadcastSelection(room, elementId);
    }
  }
  if (cur) {
    const userIds = room.selections.get(cur) ?? [];
    if (!userIds.includes(member.userId)) {
      userIds.push(member.userId);
      room.selections.set(cur, userIds);
      broadcastSelection(room, cur);
    }
  }
}

/** 从某元素的选中者列表移除指定用户（空列表则删键），返回是否有变化 */
function dropSelection(room: CollabRoom, elementId: string, userId: number): boolean {
  const userIds = room.selections.get(elementId);
  if (!userIds?.includes(userId)) return false;
  const rest = userIds.filter((id) => id !== userId);
  if (rest.length) {
    room.selections.set(elementId, rest);
  } else {
    room.selections.delete(elementId);
  }
  return true;
}

/** 释放某成员的全部选中标记并广播 */
function releaseUserSelections(room: CollabRoom, userId: number): void {
  for (const [elementId] of room.selections) {
    if (dropSelection(room, elementId, userId)) {
      broadcastSelection(room, elementId);
    }
  }
}

/** 清理因元素被删除而失效的选中标记，并广播释放 */
function pruneStaleSelections(room: CollabRoom): void {
  if (room.selections.size === 0) return;
  const ids = collectElementIds(room.canvasData);
  for (const [elementId] of room.selections) {
    if (!ids.has(elementId)) {
      room.selections.delete(elementId);
      broadcastSelection(room, elementId);
    }
  }
}

/** 广播某元素当前的完整标记状态（空成员列表表示标记已全部移除） */
function broadcastSelection(room: CollabRoom, elementId: string): void {
  broadcast(room, null, {
    type: MsgType.SELECTION_UPDATE,
    elementId,
    members: selectionMembers(room, elementId),
  });
}

/** 选中标记列表（同元素多成员合并为一条） */
function selectionList(room: CollabRoom): CollabSelectionInfo[] {
  const list: CollabSelectionInfo[] = [];
  for (const [elementId] of room.selections) {
    list.push({ elementId, members: selectionMembers(room, elementId) });
  }
  return list;
}

/** 某元素当前的选中者成员列表 */
function selectionMembers(room: CollabRoom, elementId: string): CollabMember[] {
  const userIds = room.selections.get(elementId) ?? [];
  return userIds
    .map((userId) => findMember(room, userId))
    .filter((m): m is RoomMember => !!m)
    .map(memberInfo);
}

/** 收集画布数据中所有元素 id（含根元素） */
function collectElementIds(canvasData: CanvasStorageData): Set<string> {
  const ids = new Set<string>([canvasData.root.id]);
  const walk = (list: CanvasInnerElement[] | undefined) => {
    for (const el of list ?? []) {
      ids.add(el.id);
      if (hasChildren(el)) walk(el.children);
    }
  };
  walk(canvasData.root.children);
  return ids;
}

/** 判断元素是否可包含子元素（children 为数组即视为容器） */
function hasChildren(el: CanvasInnerElement): el is CanvasInnerElement & { children: CanvasInnerElement[] } {
  return Array.isArray((el as { children?: unknown }).children);
}

// ==================== 成员工具 ====================

/** 广播当前成员列表 */
function broadcastMembers(room: CollabRoom): void {
  broadcast(room, null, { type: MsgType.MEMBERS, members: memberList(room) });
}

/** 成员列表（去掉连接对象） */
function memberList(room: CollabRoom): CollabMember[] {
  return [...room.members.values()].map(memberInfo);
}

/** 按用户 ID 找成员 */
function findMember(room: CollabRoom, userId: number): RoomMember | undefined {
  for (const member of room.members.values()) {
    if (member.userId === userId) return member;
  }
  return undefined;
}

/** 剥离连接对象 */
function memberInfo(member: RoomMember): CollabMember {
  return {
    userId: member.userId,
    nickname: member.nickname,
  };
}

// ==================== 消息发送 ====================

/** 广播消息 */
function broadcast(room: CollabRoom, except: WebSocket | null, msg: CollabServerMsg): void {
  const data = JSON.stringify(msg);
  for (const [socket] of room.members) {
    if (socket !== except && socket.readyState === WebSocket.OPEN) {
      socket.send(data);
    }
  }
}

/** 单独发送消息 */
function send(socket: WebSocket, msg: CollabServerMsg): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(msg));
  }
}
