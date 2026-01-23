// LAN Transfer 类型定义

export interface User {
  id: string;
  name: string;
  deviceName: string;
  avatar: string;
  ip?: string;
  joinedAt?: number;
}

export interface FileItem {
  id: string;
  file: File;
  size: number;
  name: string;
  type: string;
  status?: "queued" | "transferring" | "completed" | "error";
}

export interface TransferTask {
  name: string;
  fileId: string;
  targetUserId: string;
  progress: number;
  status: "pending" | "transferring" | "completed" | "error" | "rejected";
  speed?: string;
  file: File;
}

export interface IncomingTransfer {
  id: string;
  senderId: string;
  files: { id: string; name: string; size: number; type: string }[];
  totalSize: number;
  progress: number;
  status: "pending" | "receiving" | "completed" | "declined";
}

export interface FileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
}

export type ServerMessage =
  | { type: "user-info"; data: User }
  | { type: "user-list"; data: User[] }
  | { type: "invite"; sender: string; payload: { files: FileInfo[] } }
  | { type: "accept"; sender: string; payload: any }
  | { type: "reject"; sender: string; payload: any }
  | { type: "offer"; sender: string; payload: RTCSessionDescriptionInit }
  | { type: "answer"; sender: string; payload: RTCSessionDescriptionInit }
  | { type: "ice-candidate"; sender: string; payload: RTCIceCandidateInit };

export interface ClientMessage {
  type: string;
  target: string;
  payload: any;
}

export interface Message {
  type: string;
  target: string;
  payload: any;
}
