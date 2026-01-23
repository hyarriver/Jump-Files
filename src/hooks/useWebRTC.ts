// WebRTC 服务 Hook
"use client";

"use client";

import { useRef, useCallback } from "react";

// 动态导入 streamsaver（仅在客户端）
let streamSaver: any = null;
if (typeof window !== "undefined") {
  // 使用动态导入来避免 SSR 问题
  streamSaver = require("streamsaver");
  // 设置 streamsaver 的 mitm 脚本（用于浏览器兼容性）
  streamSaver.mitm = "https://jimmywarting.github.io/StreamSaver.js/mitm.html";
}

type PeerConnectionMap = Map<string, RTCPeerConnection>;
type DataChannelMap = Map<string, RTCDataChannel>;

interface FileStartMessage {
  type: "file-start";
  id: string;
  name: string;
  size: number;
  mime: string;
}

interface FileEndMessage {
  type: "file-end";
  id: string;
}

export function useWebRTC(sendSignal: (target: string, type: string, payload: any) => void) {
  const peersRef = useRef<PeerConnectionMap>(new Map());
  const dataChannelsRef = useRef<DataChannelMap>(new Map());
  const currentWritersRef = useRef<Map<string, WritableStreamDefaultWriter>>(new Map());
  const currentFileMetaRef = useRef<Map<string, { id: string; size: number; received: number }>>(new Map());
  
  const onDataChannelCallbackRef = useRef<((userId: string, channel: RTCDataChannel) => void) | null>(null);
  const onSenderProgressCallbackRef = useRef<((userId: string, fileId: string, progress: number) => void) | null>(null);
  const onReceiverProgressCallbackRef = useRef<((userId: string, fileId: string, received: number, total: number) => void) | null>(null);
  const onConnectionStateChangeCallbackRef = useRef<((userId: string, state: RTCPeerConnectionState) => void) | null>(null);

  const sendData = useCallback(async (dc: RTCDataChannel, data: string | ArrayBuffer) => {
    if (dc.bufferedAmount > 1024 * 1024 * 2) {
      await new Promise<void>((resolve) => {
        const handler = () => {
          dc.removeEventListener("bufferedamountlow", handler);
          resolve();
        };
        dc.addEventListener("bufferedamountlow", handler);
      });
    }

    try {
      // RTCDataChannel.send() 接受 string 或 ArrayBufferView
      if (data instanceof ArrayBuffer) {
        dc.send(new Uint8Array(data));
      } else {
        dc.send(data);
      }
    } catch (err: any) {
      console.log(err);
      if (err.name === "OperationError" && dc.bufferedAmount > 0) {
        await new Promise<void>((resolve) => {
          const handler = () => {
            dc.removeEventListener("bufferedamountlow", handler);
            resolve();
          };
          dc.addEventListener("bufferedamountlow", handler);
        });
        // RTCDataChannel.send() 接受 string 或 ArrayBufferView
        if (data instanceof ArrayBuffer) {
          dc.send(new Uint8Array(data));
        } else {
          dc.send(data);
        }
      } else {
        throw err;
      }
    }
  }, []);

  const closeConnection = useCallback((userId: string) => {
    const pc = peersRef.current.get(userId);
    if (pc) {
      pc.close();
      peersRef.current.delete(userId);
    }
    const dc = dataChannelsRef.current.get(userId);
    if (dc) {
      dc.close();
      dataChannelsRef.current.delete(userId);
    }
    // 清理文件写入器
    currentWritersRef.current.forEach((writer, fileId) => {
      writer.close().catch(console.error);
      currentWritersRef.current.delete(fileId);
    });
    currentFileMetaRef.current.clear();
  }, []);

  const setupDataChannel = useCallback((userId: string, dc: RTCDataChannel) => {
    dataChannelsRef.current.set(userId, dc);
    
    dc.onopen = () => {
      console.log(`Data channel with ${userId} open`);
      if (onDataChannelCallbackRef.current) {
        onDataChannelCallbackRef.current(userId, dc);
      }
    };
    
    dc.onmessage = async (event) => {
      const { data } = event;

      if (typeof data === "string") {
        try {
          const msg = JSON.parse(data);
          if (msg.type === "file-start") {
            const startMsg = msg as FileStartMessage;
            console.log("Received file-start:", startMsg);

            if (!streamSaver) {
              console.error("streamSaver is not available");
              return;
            }

            const fileStream = streamSaver.createWriteStream(startMsg.name, {
              size: startMsg.size,
            });
            const writer = fileStream.getWriter();
            currentWritersRef.current.set(startMsg.id, writer);
            currentFileMetaRef.current.set(startMsg.id, {
              id: startMsg.id,
              size: startMsg.size,
              received: 0,
            });
          } else if (msg.type === "file-end") {
            const endMsg = msg as FileEndMessage;
            const writer = currentWritersRef.current.get(endMsg.id);
            if (writer) {
              await writer.close();
              currentWritersRef.current.delete(endMsg.id);
              currentFileMetaRef.current.delete(endMsg.id);
            }
          }
        } catch (e) {
          console.error("Failed to parse control message", e);
        }
      } else {
        const buffer = new Uint8Array(data);
        const idLen = buffer[0];
        const decoder = new TextDecoder();
        const fileId = decoder.decode(buffer.subarray(1, 1 + idLen!));
        const chunkData = buffer.subarray(1 + idLen!);

        const writer = currentWritersRef.current.get(fileId);
        const meta = currentFileMetaRef.current.get(fileId);

        if (writer && meta) {
          await writer.write(chunkData);
          meta.received += chunkData.byteLength;

          if (onReceiverProgressCallbackRef.current) {
            onReceiverProgressCallbackRef.current(
              userId,
              meta.id,
              meta.received,
              meta.size,
            );
          }
        }
      }
    };

    dc.onclose = () => {
      console.log(`Data channel with ${userId} closed`);
    };
  }, []);

  const createPeer = useCallback((userId: string): RTCPeerConnection => {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    };
    const pc = new RTCPeerConnection(config);
    peersRef.current.set(userId, pc);
    
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(userId, "ice-candidate", event.candidate);
      }
    };
    
    pc.onconnectionstatechange = () => {
      console.log(`Connection state with ${userId}: ${pc.connectionState}`);
      if (onConnectionStateChangeCallbackRef.current) {
        onConnectionStateChangeCallbackRef.current(userId, pc.connectionState);
      }
      if (
        pc.connectionState === "disconnected" ||
        pc.connectionState === "failed"
      ) {
        closeConnection(userId);
      }
    };
    
    pc.ondatachannel = (event) => {
      setupDataChannel(userId, event.channel);
    };
    
    return pc;
  }, [sendSignal, closeConnection, setupDataChannel]);

  const createConnection = useCallback(async (targetUserId: string) => {
    if (peersRef.current.has(targetUserId)) {
      console.warn(`Connection to ${targetUserId} already exists`);
      return;
    }
    const pc = createPeer(targetUserId);
    const dc = pc.createDataChannel("file-transfer");
    setupDataChannel(targetUserId, dc);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    sendSignal(targetUserId, "offer", offer);
  }, [sendSignal, createPeer, setupDataChannel]);

  const sendFile = useCallback(async (userId: string, file: File, fileId: string) => {
    const dc = await getDataChannel(userId);

    if (!dc) {
      throw new Error(`No data channel for user ${userId}`);
    }

    if (dc.readyState !== "open") {
      await new Promise<void>((resolve) => {
        const handler = () => {
          dc.removeEventListener("open", handler);
          resolve();
        };
        dc.addEventListener("open", handler);
      });
    }

    dc.bufferedAmountLowThreshold = 1024 * 64;

    const startMsg: FileStartMessage = {
      type: "file-start",
      id: fileId,
      name: file.name,
      size: file.size,
      mime: file.type,
    };

    await sendData(dc, JSON.stringify(startMsg));

    const chunkSize = 128 * 1024;
    let offset = 0;
    const reader = file.stream().getReader();
    const encoder = new TextEncoder();
    const fileIdBytes = encoder.encode(fileId);
    const fileIdLen = fileIdBytes.length;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        let buffer = value;
        let position = 0;

        while (position < buffer.length) {
          const end = Math.min(position + chunkSize, buffer.length);
          const chunk = buffer.subarray(position, end);

          const packet = new Uint8Array(1 + fileIdLen + chunk.length);
          packet[0] = fileIdLen;
          packet.set(fileIdBytes, 1);
          packet.set(chunk, 1 + fileIdLen);
          await sendData(dc, packet as unknown as ArrayBuffer);

          position = end;
          offset += chunk.length;

          if (onSenderProgressCallbackRef.current) {
            onSenderProgressCallbackRef.current(
              userId,
              fileId,
              (offset / file.size) * 100,
            );
          }
        }
      }

      const endMsg: FileEndMessage = { type: "file-end", id: fileId };
      await sendData(dc, JSON.stringify(endMsg));
    } catch (err) {
      console.error("Error sending file", err);
      throw err;
    } finally {
      reader.releaseLock();
    }
  }, [sendData]);

  const getDataChannel = useCallback((userId: string): Promise<RTCDataChannel | undefined> => {
    return new Promise((resolve) => {
      const dc = dataChannelsRef.current.get(userId);
      if (dc && dc.readyState === "open") {
        resolve(dc);
      } else if (dc) {
        const onOpen = () => {
          dc.removeEventListener("open", onOpen);
          resolve(dc);
        };
        dc.addEventListener("open", onOpen);
      } else {
        setTimeout(() => resolve(dataChannelsRef.current.get(userId)), 2000);
      }
    });
  }, []);

  const handleOffer = useCallback(async (senderId: string, offer: RTCSessionDescriptionInit) => {
    if (peersRef.current.has(senderId)) {
      console.warn(`Connection to ${senderId} already exists`);
      return;
    }
    const pc = createPeer(senderId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    sendSignal(senderId, "answer", answer);
  }, [sendSignal, createPeer]);

  const handleAnswer = useCallback(async (senderId: string, answer: RTCSessionDescriptionInit) => {
    const pc = peersRef.current.get(senderId);
    if (!pc) return;
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }, []);

  const handleCandidate = useCallback(async (senderId: string, candidate: RTCIceCandidateInit) => {
    const pc = peersRef.current.get(senderId);
    if (!pc) return;
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  }, []);

  const onDataChannel = useCallback((callback: (userId: string, channel: RTCDataChannel) => void) => {
    onDataChannelCallbackRef.current = callback;
  }, []);

  const onReceiverProgress = useCallback((callback: (userId: string, fileId: string, received: number, total: number) => void) => {
    onReceiverProgressCallbackRef.current = callback;
  }, []);

  const onSenderProgress = useCallback((callback: (userId: string, fileId: string, progress: number) => void) => {
    onSenderProgressCallbackRef.current = callback;
  }, []);

  const onConnectionStateChange = useCallback((callback: (userId: string, state: RTCPeerConnectionState) => void) => {
    onConnectionStateChangeCallbackRef.current = callback;
  }, []);

  return {
    createConnection,
    sendFile,
    handleOffer,
    handleAnswer,
    handleCandidate,
    closeConnection,
    onDataChannel,
    onReceiverProgress,
    onSenderProgress,
    onConnectionStateChange,
  };
}
