import type { Server } from "node:http";
import type { Duplex } from "node:stream";
import type { IncomingMessage } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import type { CanvasStorageData } from "../types/canvas.js";
import { Page, User } from "../models/index.js";
import type { CollabClientMsg, CollabRoom, ConnContext } from "../types/collab.js";
import { CollabMsgTypeEnum } from "../types/collab.js";
import { ResultCodeEnum } from "../constants/result-code.js";
import { CollabCloseCodeEnum } from "../constants/collab.js";
import { resolveTokenUser } from "../services/auth.js";
import {
  getOrCreateRoom,
  handleSelect,
  handleOp,
  handleDeselect,
  joinRoom,
  leaveRoom,
  removeRoom,
} from "./room.js";

/** WebSocket 挂载路径 */
const WS_PATH = "/ws";

/**
 * 把协作 WebSocket 服务挂到现有 HTTP 服务上
 * 连接地址：/ws?pageId=<页面ID>&token=<JWT>&share=<分享token，可选>
 * @param server HTTP 服务实例
 */
export function attachCollabServer(server: Server): void {
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 10 * 1024 * 1024,
  });

  // noServer 模式下 wss.clients 为空，需自行跟踪连接做心跳
  const clients = new Set<WebSocket>();
  const aliveClients = new Set<WebSocket>();
  // 每条连接对应的鉴权上下文，供周期性会话校验使用
  const connCtx = new Map<WebSocket, ConnContext>();
  const heartbeat = setInterval(() => {
    sweepConnections();
    // 定期校验会话有效性，防止会话已失效但旧连接一直挂着（登出、别处登录但没进房、账号被删等情况）
    checkSessions();
  }, 30000);

  // 服务器断开
  wss.on("close", () => clearInterval(heartbeat));

  /** 心跳巡检 */
  function sweepConnections(): void {
    for (const ws of clients) {
      if (!aliveClients.has(ws)) {
        clients.delete(ws);
        connCtx.delete(ws);
        // 关闭服务器侧的半连接状态
        ws.terminate();
        continue;
      }
      aliveClients.delete(ws);
      ws.ping();
    }
  }

  /**
   * 周期性校验每条连接的会话有效性
   */
  async function checkSessions(): Promise<void> {
    for (const [ws, ctx] of connCtx) {
      try {
        const user = await User.findByPk(ctx.userId, {
          attributes: ["sessionId"],
        });
        if (user && user.sessionId === ctx.sessionId) continue;
      } catch {
        // 数据库异常不该强制所有人下线
        continue;
      }
      clients.delete(ws);
      aliveClients.delete(ws);
      connCtx.delete(ws);
      ws.close(CollabCloseCodeEnum.FORCE_OFFLINE);
    }
  }

  // 协议升级
  server.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    // 鉴权成功后才升级为WebSocket协议
    handleUpgrade(wss, req, socket, head);
  });

  // 收到来自一个客户端的连接
  wss.on(
    "connection",
    (ws: WebSocket, _req: IncomingMessage, ctx: ConnContext) => {
      clients.add(ws);
      aliveClients.add(ws);
      connCtx.set(ws, ctx);
      // 客户端心跳
      ws.on("pong", () => aliveClients.add(ws));
      // 客户端消息
      ws.on("message", (raw) => {
        console.log("[collab] 服务端收到:", raw.toString().slice(0, 200));
        let msg: CollabClientMsg;
        try {
          msg = JSON.parse(String(raw));
        } catch {
          return;
        }
        dispatch(ws, ctx.room, msg);
      });
      // 客户端断开
      ws.on("close", () => {
        clients.delete(ws);
        aliveClients.delete(ws);
        connCtx.delete(ws);
        const { room } = ctx;
        leaveRoom(room, ws);
        // 房间无人：销毁
        if (room.members.size === 0) {
          removeRoom(room);
        }
      });
    },
  );
}

/**
 * 升级请求鉴权：校验 JWT 会话、画布存在性与访问权
 * 失败直接断开 TCP，不进入 ws 连接
 */
async function handleUpgrade(
  wss: WebSocketServer,
  req: IncomingMessage,
  socket: Duplex,
  head: Buffer,
): Promise<void> {
  try {
    const url = new URL(req.url ?? "", "http://localhost");
    if (url.pathname !== WS_PATH) {
      socket.destroy();
      return;
    }
    const pageId = Number(url.searchParams.get("pageId"));
    const token = url.searchParams.get("token") ?? "";
    const share = url.searchParams.get("share") ?? "";
    if (!Number.isInteger(pageId) || pageId <= 0 || !token) {
      socket.destroy();
      return;
    }

    // JWT失效或同账号多会话
    const { code, user } = await resolveTokenUser(token);
    if (code !== ResultCodeEnum.SUCCESS || !user) {
      socket.destroy();
      return;
    }

    // 画布不存在
    const page = await Page.findByPk(pageId);
    if (!page) {
      socket.destroy();
      return;
    }

    // 无访问权限（不是画布所有者且shareToken不匹配）
    const isMine = page.userId === user.id;
    const shareMatched = !!page.shareToken && page.shareToken === share;
    if (!isMine && !shareMatched) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(
      req,
      socket,
      head,
      // 握手成功后的回调
      (ws) => {
        const canvasData = JSON.parse(page.content) as CanvasStorageData;
        const room = getOrCreateRoom(pageId, canvasData, {
          title: page.title,
          userId: page.userId,
        });
        joinRoom(room, {
          socket: ws,
          userId: user.id,
          nickname: user.nickname || user.username,
        });
        // 手动执行wss.on('connection')
        wss.emit("connection", ws, req, {
          userId: user.id,
          sessionId: user.sessionId,
          room,
        } as ConnContext);
      },
    );
  } catch {
    socket.destroy();
  }
}

/** 按消息类型分发到房间逻辑 */
function dispatch(ws: WebSocket, room: CollabRoom, msg: CollabClientMsg): void {
  switch (msg.type) {
    case CollabMsgTypeEnum.OP:
      if (msg.baseData && msg.canvasData && Array.isArray(msg.ops)) {
        handleOp(room, ws, msg);
      }
      return;
    case CollabMsgTypeEnum.SELECT:
      if (typeof msg.elementId === "string")
        handleSelect(room, ws, msg.elementId);
      return;
    case CollabMsgTypeEnum.DESELECT:
      if (typeof msg.elementId === "string")
        handleDeselect(room, ws, msg.elementId);
      return;
    default:
      return;
  }
}
