// 测试 WebSocket 服务器
import { createWebSocketServer } from "../server/websocket-server";

console.log("Starting WebSocket server...");
try {
  const wss = createWebSocketServer(4927);
  console.log("WebSocket server started successfully on port 4927");
  console.log("Press Ctrl+C to stop");
  
  // 保持进程运行
  process.on('SIGINT', () => {
    console.log("\nShutting down WebSocket server...");
    wss.close(() => {
      console.log("WebSocket server closed");
      process.exit(0);
    });
  });
} catch (error) {
  console.error("Failed to start WebSocket server:", error);
  process.exit(1);
}
