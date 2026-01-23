// 启动 WebSocket 服务器
import { createWebSocketServer } from "../server/websocket-server";

const PORT = process.env.WS_PORT ? parseInt(process.env.WS_PORT) : 4927;

console.log("Starting WebSocket server...");
try {
  const wss = createWebSocketServer(PORT);
  console.log("WebSocket server started successfully!");
  console.log(`Listening on port ${PORT}`);
  console.log(`Connect using: ws://localhost:${PORT}/ws`);
  console.log("\nPress Ctrl+C to stop the server");
  
  // 保持进程运行
  process.on('SIGINT', () => {
    console.log("\nShutting down WebSocket server...");
    wss.close(() => {
      console.log("WebSocket server closed");
      process.exit(0);
    });
  });
  
  process.on('SIGTERM', () => {
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
