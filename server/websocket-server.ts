// WebSocket 服务器 - 用于 LAN Transfer 信令服务
import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import { URL } from "url";
import type { User, Message } from "../src/types/lan-transfer";

// 用户存储
class UserStore {
  private users: Map<string, User> = new Map();

  addUser(user: User) {
    this.users.set(user.id, user);
  }

  removeUser(id: string) {
    this.users.delete(id);
  }

  getUser(id: string) {
    return this.users.get(id);
  }

  getAllUsers() {
    return Array.from(this.users.values());
  }
}

const userStore = new UserStore();

// 生成唯一名称
function generateUniqueName(): string {
  const syllables = [
    "la", "no", "ra", "mi", "ka", "ta", "le", "ve",
    "xo", "zi", "an", "el", "or", "un",
  ];
  const len = 2 + Math.floor(Math.random() * 2);
  let name = "";
  for (let i = 0; i < len; i++) {
    name += syllables[Math.floor(Math.random() * syllables.length)];
  }
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// 信令服务
class SignalingService {
  processSignal(senderId: string, message: Message): string | null {
    const { target } = message;
    const targetUser = userStore.getUser(target);
    if (!targetUser) {
      return null;
    }
    return `user:${target}`;
  }
}

const signalingService = new SignalingService();

// 创建用户
function createUser(id: string, deviceName: string, ip: string): User {
  const name = generateUniqueName();
  const avatarIndex = Math.floor(Math.random() * 30);
  const avatar = `/avatars/adventurer/adventurer-${avatarIndex}.webp`;
  const user: User = {
    id,
    name,
    avatar,
    deviceName,
    ip,
    joinedAt: Date.now(),
  };
  userStore.addUser(user);
  return user;
}

export function createWebSocketServer(port: number = 4927) {
  const wss = new WebSocketServer({ 
    port,
    perMessageDeflate: false,
  });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    try {
      // 处理 URL，支持 /ws 路径或根路径
      const requestUrl = req.url || "/";
      const baseUrl = req.headers.host 
        ? `http://${req.headers.host}` 
        : `http://localhost:${port}`;
      const url = new URL(requestUrl, baseUrl);
      
      // 如果路径是 /ws，继续处理；如果是根路径，也继续处理
      if (url.pathname !== "/ws" && url.pathname !== "/") {
        console.warn(`Rejecting connection to unexpected path: ${url.pathname}`);
        ws.close(1008, "Invalid path");
        return;
      }
      
      const deviceName = url.searchParams.get("deviceName") || "Unknown Device";
      const ip = req.socket.remoteAddress || "unknown";

    const userId = Math.random().toString(36).substring(7);
    const user = createUser(userId, deviceName, ip);

    // 订阅用户频道和全局更新
    const userTopic = `user:${user.id}`;
    const globalTopic = "global-updates";

    // 发送用户信息
    ws.send(JSON.stringify({
      type: "user-info",
      data: user,
    }));

    // 广播用户列表
    const users = userStore.getAllUsers();
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: "user-list",
          data: users,
        }));
      }
    });

    console.log(`User joined: ${user.name} (${user.id})`);

    // 处理消息
    ws.on("message", (data: Buffer) => {
      try {
        const message: Message = JSON.parse(data.toString());
        if (message.target && message.type) {
          const targetTopic = signalingService.processSignal(userId, message);
          if (targetTopic && message.target) {
            // 转发给目标用户
            let forwarded = false;
            wss.clients.forEach((client) => {
              if (client !== ws && (client as any).userId === message.target) {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify({
                    type: message.type,
                    sender: userId,
                    payload: message.payload,
                  }));
                  forwarded = true;
                }
              }
            });
            if (!forwarded) {
              console.warn(`Target user ${message.target} not found or not connected`);
            }
          }
        }
      } catch (e) {
        console.error("Failed to parse message", e);
      }
    });

    // 标记用户ID
    (ws as any).userId = userId;

    // 处理关闭
    ws.on("close", () => {
      console.log(`User left: ${userId}`);
      userStore.removeUser(userId);

      // 广播更新后的用户列表
      const users = userStore.getAllUsers();
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({
            type: "user-list",
            data: users,
          }));
        }
      });
    });
    } catch (error) {
      console.error("Error handling WebSocket connection:", error);
      ws.close(1011, "Internal server error");
    }
  });

  wss.on("error", (error) => {
    console.error("WebSocket server error:", error);
  });

  wss.on("listening", () => {
    console.log(`WebSocket server running on port ${port}`);
    console.log(`Connect using: ws://localhost:${port}/ws`);
  });

  return wss;
}
