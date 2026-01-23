"use client";

import { useFileTransfer } from "@/hooks/useFileTransfer";
import { NearbyDevices } from "./NearbyDevices";
import { FileDropZone } from "./FileDropZone";
import { TransferQueue } from "./TransferQueue";
import { IncomingRequest } from "./IncomingRequest";
import { TransferActionBar } from "./TransferActionBar";
import { EmptyState } from "./EmptyState";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function FileTransfer() {
  const {
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
  } = useFileTransfer();

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      addFiles(droppedFiles);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      addFiles(selectedFiles);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* 状态指示 */}
        <Card className="border-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full animate-pulse ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
              局域网文件传输
            </CardTitle>
            <CardDescription>
              {isConnected 
                ? `已连接到信令服务器 - ${currentUser ? `当前用户: ${currentUser.name}` : ''}` 
                : "未连接到信令服务器，请确保 WebSocket 服务器正在运行"}
            </CardDescription>
          </CardHeader>
        </Card>

        {/* 附近设备 */}
        <NearbyDevices
          currentUser={currentUser}
          users={users}
          selectedUserIds={selectedUserIds}
          onToggle={toggleUserSelection}
        />

        {/* 文件拖放区域 */}
        <FileDropZone
          isDragging={isDragging}
          hasFiles={files.length > 0}
          onDragChange={setIsDragging}
          onDrop={handleDrop}
          onFileInput={handleFileInput}
        />

        {/* 空状态提示 */}
        {files.length === 0 && users.length === 0 && (
          <EmptyState hasUsers={users.length > 0} hasFiles={files.length > 0} />
        )}

        {/* 文件队列 */}
        {files.length > 0 && (
          <TransferQueue files={files} onRemove={removeFile} />
        )}

        {/* 操作栏 */}
        {files.length > 0 && selectedUsers.length > 0 && (
          <TransferActionBar
            selectedUsers={selectedUsers}
            totalSize={formattedTotalSize}
            canSend={canSend}
            isTransferring={isTransferring}
            onSend={startTransfer}
          />
        )}

        {/* 传输队列 */}
        {transfers.length > 0 && (
          <TransferQueue transfers={transfers} />
        )}

        {/* 接收请求 */}
        {incomingTransfers.map((transfer) => (
          <IncomingRequest
            key={transfer.id}
            transfer={transfer}
            onAccept={() => acceptTransfer(transfer.id)}
            onDecline={() => declineTransfer(transfer.id)}
          />
        ))}
      </div>
    </div>
  );
}
