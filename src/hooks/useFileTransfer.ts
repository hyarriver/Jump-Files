// 文件传输 Hook
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { User, FileItem, TransferTask, IncomingTransfer, FileInfo } from "@/types/lan-transfer";
import { useSocket } from "./useSocket";
import { useWebRTC } from "./useWebRTC";
import { scheduler } from "@/lib/lan-transfer/scheduler";
import { formatBytes, randomIdByChar } from "@/lib/utils";

export function useFileTransfer() {
  const { isConnected, currentUser, sendSignal, on, off } = useSocket();
  const webrtc = useWebRTC(sendSignal);

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [files, setFiles] = useState<FileItem[]>([]);
  const [transfers, setTransfers] = useState<TransferTask[]>([]);
  const [incomingTransfers, setIncomingTransfers] = useState<IncomingTransfer[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isTransferring, setIsTransferring] = useState(false);

  const users = useMemo(() => {
    if (!currentUser) return allUsers;
    return allUsers.filter((u) => u.id !== currentUser.id);
  }, [allUsers, currentUser]);

  const totalSize = useMemo(() => {
    return files.reduce((acc, curr) => acc + curr.file.size, 0);
  }, [files]);

  const formattedTotalSize = useMemo(() => formatBytes(totalSize), [totalSize]);

  const canSend = useMemo(() => {
    return (
      files.length > 0 &&
      selectedUserIds.size > 0 &&
      !isTransferring
    );
  }, [files.length, selectedUserIds.size, isTransferring]);

  const selectedUsers = useMemo(() => {
    return users.filter((u) => selectedUserIds.has(u.id));
  }, [users, selectedUserIds]);

  useEffect(() => {
    on("user-list", (list: User[]) => {
      const currentUserIds = new Set(list.map((u) => u.id));
      
      setTransfers((prev) => prev.map((t) => {
        if (!currentUserIds.has(t.targetUserId) && t.status === "pending") {
          return { ...t, status: "rejected" as const };
        }
        return t;
      }));

      setIncomingTransfers((prev) => prev.filter((t) => {
        return currentUserIds.has(t.senderId);
      }));

      setSelectedUserIds((prev) => {
        const newSet = new Set(prev);
        prev.forEach((id) => {
          if (!currentUserIds.has(id)) {
            newSet.delete(id);
          }
        });
        return newSet;
      });

      setAllUsers(list);
    });

    on("offer", handleSignal);
    on("answer", handleSignal);
    on("ice-candidate", handleSignal);
    on("invite", handleOfferInvite);
    on("accept", handleOfferAccept);
    on("reject", handleOfferReject);

    webrtc.onSenderProgress((userId, fileId, progress) => {
      setTransfers((prev) => prev.map((t) => {
        if (t.targetUserId === userId && t.fileId === fileId) {
          const updated = { ...t, progress };
          if (progress >= 100) {
            updated.status = "completed";
          }
          return updated;
        }
        return t;
      }));
    });

    webrtc.onReceiverProgress((userId, fileId, received, total) => {
      setIncomingTransfers((prev) => prev.map((incoming) => {
        if (incoming.senderId === userId && incoming.status === "receiving") {
          const fileProgress = (incoming as any).fileProgress || new Map<string, number>();
          fileProgress.set(fileId, received);
          
          let totalReceived = 0;
          fileProgress.forEach((bytes: number) => {
            totalReceived += bytes;
          });

          const progress = incoming.totalSize > 0 ? (totalReceived / incoming.totalSize) * 100 : 0;
          const status = progress >= 100 ? "completed" : "receiving";

          return {
            ...incoming,
            progress,
            status: status as "receiving" | "completed",
            ...(fileProgress && { fileProgress }),
          };
        }
        return incoming;
      }));
    });

    webrtc.onConnectionStateChange((userId, state) => {
      if (state === "disconnected" || state === "failed" || state === "closed") {
        setTransfers((prev) => prev.map((t) => {
          if (t.targetUserId === userId && t.status === "transferring") {
            return { ...t, status: "error" as const };
          }
          return t;
        }));

        setIncomingTransfers((prev) => prev.map((incoming) => {
          if (incoming.senderId === userId && incoming.status === "receiving" && incoming.progress < 100) {
            return { ...incoming, status: "declined" as const };
          }
          return incoming;
        }));
      }
    });

    return () => {
      off("user-list", () => {});
      off("offer", handleSignal);
      off("answer", handleSignal);
      off("ice-candidate", handleSignal);
      off("invite", handleOfferInvite);
      off("accept", handleOfferAccept);
      off("reject", handleOfferReject);
    };
  }, [on, off, webrtc]);

  const handleSignal = useCallback((message: {
    sender: string;
    type: "answer" | "offer" | "ice-candidate";
    payload: RTCSessionDescriptionInit | RTCIceCandidateInit;
  }) => {
    const sender = users.find((u) => u.id === message.sender);
    if (!sender) return;
    
    switch (message.type) {
      case "offer":
        webrtc.handleOffer(message.sender, message.payload as RTCSessionDescriptionInit);
        break;
      case "answer":
        webrtc.handleAnswer(message.sender, message.payload as RTCSessionDescriptionInit);
        break;
      case "ice-candidate":
        webrtc.handleCandidate(message.sender, message.payload as RTCIceCandidateInit);
        break;
    }
  }, [users, webrtc]);

  const handleOfferInvite = useCallback((message: {
    sender: string;
    payload: { files: FileInfo[] };
  }) => {
    const { sender, payload } = message;
    const user = users.find((u) => u.id === sender);
    if (!user) return;

    setIncomingTransfers((prev) => {
      const existingTransfer = prev.find(
        (t) => t.senderId === sender && (t.status === "pending" || t.status === "receiving"),
      );

      if (existingTransfer) {
        return prev.map((t) => {
          if (t.id === existingTransfer.id) {
            return {
              ...t,
              files: [...t.files, ...payload.files],
              totalSize: t.totalSize + payload.files.reduce((acc, f) => acc + f.size, 0),
            };
          }
          return t;
        });
      } else {
        const newTransfer: IncomingTransfer = {
          id: Math.random().toString(36).substring(7),
          senderId: sender,
          files: payload.files,
          totalSize: payload.files.reduce((acc, f) => acc + f.size, 0),
          progress: 0,
          status: "pending",
        };
        return [...prev, newTransfer];
      }
    });
  }, [users]);

  const processTasks = useCallback(async (sender: string, tasks: TransferTask[]) => {
    tasks.forEach((task) => {
      scheduler.addTask(
        sender,
        {
          file: task.file,
          fileId: task.fileId,
          size: task.file.size,
        },
        async () => {
          try {
            await webrtc.sendFile(sender, task.file, task.fileId);
            setTransfers((prev) => prev.map((t) => {
              if (t.fileId === task.fileId) {
                return { ...t, status: "completed" as const };
              }
              return t;
            }));
          } catch (error) {
            console.error("Transfer failed", error);
            setTransfers((prev) => prev.map((t) => {
              if (t.fileId === task.fileId) {
                return { ...t, status: "error" as const };
              }
              return t;
            }));
          }
        },
      );
    });
  }, [webrtc]);

  const handleOfferAccept = useCallback(async (message: { sender: string; payload: any }) => {
    setTransfers((prev) => {
      const tasks: TransferTask[] = [];
      const updated = prev.map((t) => {
        if (t.targetUserId === message.sender && t.status === "pending") {
          const updatedTask = { ...t, status: "transferring" as const };
          tasks.push(updatedTask);
          return updatedTask;
        }
        return t;
      });
      
      webrtc.createConnection(message.sender);
      processTasks(message.sender, tasks);
      
      return updated;
    });
  }, [webrtc, processTasks]);

  const handleOfferReject = useCallback((message: { sender: string; payload: any }) => {
    setTransfers((prev) => prev.map((t) => {
      if (t.targetUserId === message.sender && t.status === "pending") {
        return { ...t, status: "rejected" as const };
      }
      return t;
    }));
  }, []);

  const toggleUserSelection = useCallback((id: string) => {
    setSelectedUserIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const addFiles = useCallback((newFiles: File[]) => {
    const newItems: FileItem[] = newFiles.map((f) => ({
      id: randomIdByChar(f.name.charAt(0)),
      file: f,
      size: f.size,
      name: f.name,
      type: f.type,
      status: "queued",
    }));
    setFiles((prev) => [...prev, ...newItems]);
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const startTransfer = useCallback(async () => {
    if (!canSend) return;
    setIsTransferring(true);
    
    const newTasks: TransferTask[] = [];
    
    for (const userId of selectedUserIds) {
      const fileMetadata: FileInfo[] = files.map((f) => ({
        id: f.id,
        name: f.name,
        size: f.size,
        type: f.type,
      }));

      sendSignal(userId, "invite", {
        files: fileMetadata,
      });

      for (const file of files) {
        newTasks.push({
          fileId: file.id,
          name: file.name,
          targetUserId: userId,
          progress: 0,
          status: "pending",
          file: file.file,
        });
      }
    }
    
    setTransfers((prev) => [...prev, ...newTasks]);
    setFiles([]);
    setIsTransferring(false);
  }, [canSend, selectedUserIds, files, sendSignal]);

  const acceptTransfer = useCallback(async (id: string) => {
    setIncomingTransfers((prev) => {
      const transfer = prev.find((t) => t.id === id);
      if (!transfer) return prev;
      
      sendSignal(transfer.senderId, "accept", {});
      
      return prev.map((t) => {
        if (t.id === id) {
          return { ...t, status: "receiving" as const };
        }
        return t;
      });
    });
  }, [sendSignal]);

  const declineTransfer = useCallback((id: string) => {
    setIncomingTransfers((prev) => {
      const transfer = prev.find((t) => t.id === id);
      if (!transfer) return prev;
      
      if (transfer.status === "declined" || transfer.status === "completed") {
        return prev.filter((t) => t.id !== id);
      }
      
      sendSignal(transfer.senderId, "reject", {});
      return prev.filter((t) => t.id !== id);
    });
  }, [sendSignal]);

  return {
    isConnected,
    currentUser,
    users,
    selectedUserIds,
    selectedUsers,
    files,
    transfers,
    incomingTransfers,
    isDragging,
    isTransferring,
    totalSize,
    formattedTotalSize,
    canSend,
    toggleUserSelection,
    addFiles,
    removeFile,
    startTransfer,
    acceptTransfer,
    declineTransfer,
    setIsDragging,
  };
}
