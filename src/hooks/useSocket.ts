// WebSocket 服务 Hook
"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { ServerMessage, ClientMessage, User } from "@/types/lan-transfer";
import { getOS } from "@/lib/utils";

export function useSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Map<string, Function[]>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) return;

    const deviceName = getOS();
    // 从环境变量或配置中获取 WebSocket 服务器地址
    const wsHost = process.env.NEXT_PUBLIC_WS_HOST || (typeof window !== "undefined" ? window.location.hostname : "localhost");
    const wsPort = process.env.NEXT_PUBLIC_WS_PORT || "4927";
    const wsUrl = `ws://${wsHost}:${wsPort}/ws?deviceName=${encodeURIComponent(deviceName)}`;
    
    console.log(`Attempting to connect to WebSocket: ${wsUrl}`);

    // 如果已有连接但未打开，先关闭
    if (wsRef.current) {
      wsRef.current.close();
    }

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log("Connected to signaling server");
      setIsConnected(true);
      emit("connected");
    };

    ws.onmessage = (event) => {
      try {
        const message: ServerMessage = JSON.parse(event.data);
        handleMessage(message);
      } catch (e) {
        console.error("Failed to parse message", e);
      }
    };

    ws.onclose = (event) => {
      console.log("Disconnected from signaling server", event.code, event.reason);
      wsRef.current = null;
      setIsConnected(false);
      emit("disconnected");
      // 自动重连（仅在非正常关闭时）
      if (event.code !== 1000) {
        setTimeout(() => {
          if (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED) {
            connect();
          }
        }, 3000);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      console.error("Failed to connect to WebSocket server. Make sure the server is running on port", wsPort);
      setIsConnected(false);
    };
  }, []);

  const handleMessage = useCallback((message: ServerMessage) => {
    switch (message.type) {
      case "user-info":
        setCurrentUser(message.data);
        emit("user-info", message.data);
        break;
      case "user-list":
        emit("user-list", message.data);
        break;
      case "offer":
      case "answer":
      case "ice-candidate":
        emit(message.type, {
          sender: message.sender,
          type: message.type,
          payload: message.payload,
        });
        break;
      case "invite":
      case "accept":
      case "reject":
        emit(message.type, {
          sender: message.sender,
          payload: message.payload,
        });
        break;
    }
  }, []);

  const sendSignal = useCallback((target: string, type: string, payload: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      const message: ClientMessage = {
        type,
        target,
        payload,
      };
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("Socket not open, cannot send signal");
    }
  }, []);

  const on = useCallback((event: string, handler: Function) => {
    if (!handlersRef.current.has(event)) {
      handlersRef.current.set(event, []);
    }
    handlersRef.current.get(event)?.push(handler);
  }, []);

  const off = useCallback((event: string, handler: Function) => {
    const handlers = handlersRef.current.get(event);
    if (handlers) {
      handlersRef.current.set(
        event,
        handlers.filter((h) => h !== handler),
      );
    }
  }, []);

  const emit = useCallback((event: string, data?: any) => {
    const handlers = handlersRef.current.get(event);
    if (handlers) {
      handlers.forEach((h) => h(data));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      handlersRef.current.clear();
    };
  }, [connect]);

  return {
    isConnected,
    currentUser,
    sendSignal,
    on,
    off,
    connect,
  };
}
