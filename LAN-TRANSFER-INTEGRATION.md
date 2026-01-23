# LAN-Transfer 功能融合说明

## 概述

已成功将 LAN-Transfer 项目的局域网文件传输功能融合到 jumpFiles 主项目中。

## 新增功能

### 1. 局域网文件传输
- 在同一局域网内的设备之间直接传输文件
- 使用 WebRTC 进行点对点传输，无需经过服务器
- 使用 WebSocket 进行信令交换
- 支持多文件传输和传输进度显示

### 2. 在线用户发现
- 自动发现同一局域网内的在线用户
- 显示用户头像、名称和设备信息
- 实时更新在线状态

### 3. 文件传输管理
- 拖放文件或点击选择文件
- 选择目标用户进行传输
- 实时显示传输进度
- 支持接收文件请求的接受/拒绝

## 技术实现

### 后端
- **WebSocket 服务器**: `server/websocket-server.ts`
  - 处理用户连接和信令交换
  - 管理在线用户列表
  - 转发 WebRTC 信令消息

### 前端
- **React Hooks**:
  - `useSocket`: WebSocket 连接管理
  - `useWebRTC`: WebRTC 连接和文件传输
  - `useFileTransfer`: 文件传输业务逻辑

- **React 组件**:
  - `FileTransfer`: 主组件
  - `NearbyDevices`: 显示附近设备
  - `FileDropZone`: 文件拖放区域
  - `TransferQueue`: 传输队列显示
  - `IncomingRequest`: 接收文件请求
  - `TransferActionBar`: 传输操作栏

## 使用方法

### 1. 安装依赖

```bash
npm install
```

### 2. 启动 WebSocket 服务器

在开发环境中，需要单独启动 WebSocket 服务器：

```bash
npm run dev:ws
```

WebSocket 服务器默认运行在端口 `4927`。

### 3. 启动 Next.js 开发服务器

```bash
npm run dev
```

### 4. 访问功能

- 主页: `http://localhost:3000`
- 局域网传输: `http://localhost:3000/lan-transfer`

## 环境变量

可以在 `.env.local` 中配置以下环境变量：

```env
# WebSocket 服务器配置
WS_PORT=4927

# 客户端 WebSocket 连接配置
NEXT_PUBLIC_WS_HOST=localhost
NEXT_PUBLIC_WS_PORT=4927
```

## 文件结构

```
jumpFiles/
├── server/
│   └── websocket-server.ts      # WebSocket 服务器
├── src/
│   ├── app/
│   │   └── lan-transfer/
│   │       └── page.tsx          # 局域网传输页面
│   ├── components/
│   │   └── lan-transfer/         # 文件传输组件
│   ├── hooks/
│   │   ├── useSocket.ts          # WebSocket Hook
│   │   ├── useWebRTC.ts          # WebRTC Hook
│   │   └── useFileTransfer.ts    # 文件传输 Hook
│   ├── lib/
│   │   └── lan-transfer/
│   │       ├── scheduler.ts      # 传输调度器
│   │       └── nameGenerator.ts  # 名称生成器
│   └── types/
│       └── lan-transfer.ts       # 类型定义
└── scripts/
    └── start-websocket.ts        # WebSocket 启动脚本
```

## 注意事项

1. **WebSocket 服务器**: 需要单独运行 WebSocket 服务器，不能通过 Next.js API 路由提供
2. **HTTPS/WSS**: 在生产环境中，建议使用 HTTPS/WSS 以确保安全
3. **防火墙**: 确保防火墙允许 WebSocket 端口（默认 4927）的通信
4. **局域网**: 功能仅在局域网内有效，需要所有设备在同一网络

## 未来改进

- [ ] 支持文件传输加密
- [ ] 添加传输速度显示
- [ ] 支持传输历史记录
- [ ] 优化大文件传输性能
- [ ] 添加传输错误重试机制
