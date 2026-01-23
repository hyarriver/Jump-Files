# 局域网传输功能故障排除指南

## 常见问题

### 1. WebSocket 连接失败

**症状**: 页面显示"未连接到信令服务器"

**解决方法**:
1. 确保 WebSocket 服务器正在运行：
   ```bash
   npm run dev:ws
   ```
   应该看到输出：`WebSocket server running on port 4927`

2. 检查端口是否被占用：
   ```powershell
   Get-NetTCPConnection -LocalPort 4927
   ```

3. 检查防火墙设置，确保端口 4927 未被阻止

4. 检查浏览器控制台错误信息

### 2. 无法发现其他用户

**症状**: 看不到其他在线用户

**解决方法**:
1. 确保所有设备在同一局域网
2. 确保所有设备都访问了 `/lan-transfer` 页面
3. 检查 WebSocket 服务器日志，确认用户已连接
4. 检查浏览器控制台，查看是否有连接错误

### 3. 文件传输失败

**症状**: 文件传输开始但无法完成

**解决方法**:
1. 检查 WebRTC 连接状态（浏览器控制台）
2. 确保防火墙允许 P2P 连接
3. 检查网络是否支持 WebRTC（某些企业网络可能阻止）
4. 尝试较小的文件进行测试

### 4. WebSocket 服务器无法启动

**症状**: 运行 `npm run dev:ws` 时出错

**解决方法**:
1. 检查依赖是否安装：
   ```bash
   npm install
   ```

2. 检查端口是否被占用：
   ```powershell
   Get-NetTCPConnection -LocalPort 4927
   ```
   如果被占用，可以设置环境变量使用其他端口：
   ```bash
   $env:WS_PORT=4928
   npm run dev:ws
   ```

3. 检查 TypeScript 编译错误：
   ```bash
   npx tsc --noEmit server/websocket-server.ts
   ```

## 调试步骤

### 1. 检查服务状态

```powershell
# 检查 WebSocket 服务器
Get-NetTCPConnection -LocalPort 4927

# 检查 Next.js 服务器
Get-NetTCPConnection -LocalPort 3000
```

### 2. 查看日志

**WebSocket 服务器日志**:
- 启动服务器时会显示连接信息
- 用户连接时会显示 "User joined: ..."
- 错误会显示在控制台

**浏览器控制台**:
- 打开浏览器开发者工具 (F12)
- 查看 Console 标签页
- 查看 Network 标签页，检查 WebSocket 连接

### 3. 测试 WebSocket 连接

在浏览器控制台中运行：
```javascript
const ws = new WebSocket('ws://localhost:4927/ws?deviceName=Test');
ws.onopen = () => console.log('Connected');
ws.onmessage = (e) => console.log('Message:', e.data);
ws.onerror = (e) => console.error('Error:', e);
```

## 环境变量配置

创建 `.env.local` 文件（如果不存在）：

```env
# WebSocket 服务器配置
WS_PORT=4927

# 客户端 WebSocket 连接配置
NEXT_PUBLIC_WS_HOST=localhost
NEXT_PUBLIC_WS_PORT=4927
```

**注意**: 如果 WebSocket 服务器运行在不同的机器上，需要设置 `NEXT_PUBLIC_WS_HOST` 为服务器的 IP 地址。

## 网络要求

1. **局域网**: 所有设备必须在同一局域网
2. **防火墙**: 确保端口 3000 和 4927 未被阻止
3. **WebRTC**: 需要支持 WebRTC 的网络环境
4. **STUN 服务器**: 使用 Google 的公共 STUN 服务器

## 手动启动步骤

1. **启动 WebSocket 服务器**（终端 1）:
   ```bash
   cd D:\codeViews\jumpFiles
   npm run dev:ws
   ```

2. **启动 Next.js 开发服务器**（终端 2）:
   ```bash
   cd D:\codeViews\jumpFiles
   npm run dev
   ```

3. **访问页面**:
   - 主页: http://localhost:3000
   - 局域网传输: http://localhost:3000/lan-transfer

4. **在其他设备上访问**:
   - 使用服务器的局域网 IP 地址
   - 例如: http://192.168.1.100:3000/lan-transfer

## 获取帮助

如果问题仍然存在：
1. 检查浏览器控制台的完整错误信息
2. 检查 WebSocket 服务器的完整日志
3. 确认所有依赖已正确安装
4. 尝试重启所有服务
