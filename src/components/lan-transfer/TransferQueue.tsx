"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes } from "@/lib/utils";
import type { FileItem, TransferTask } from "@/types/lan-transfer";

interface TransferQueueProps {
  files?: FileItem[];
  transfers?: TransferTask[];
  onRemove?: (id: string) => void;
}

export function TransferQueue({ files, transfers, onRemove }: TransferQueueProps) {
  if (files && files.length > 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>待发送文件</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center justify-between p-3 bg-neutral-50 rounded-lg"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-900 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-neutral-500">
                  {formatBytes(file.size)}
                </p>
              </div>
              {onRemove && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemove(file.id)}
                  className="ml-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (transfers && transfers.length > 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>传输中</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {transfers.map((transfer) => (
            <div key={`${transfer.targetUserId}-${transfer.fileId}`} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-900 truncate">
                    {transfer.name}
                  </p>
                  <p className="text-xs text-neutral-500">
                    发送给: {transfer.targetUserId}
                  </p>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    transfer.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : transfer.status === "error"
                      ? "bg-red-100 text-red-700"
                      : transfer.status === "rejected"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {transfer.status === "completed"
                    ? "已完成"
                    : transfer.status === "error"
                    ? "错误"
                    : transfer.status === "rejected"
                    ? "已拒绝"
                    : transfer.status === "transferring"
                    ? "传输中"
                    : "等待中"}
                </span>
              </div>
              {transfer.status === "transferring" && (
                <Progress value={transfer.progress} className="h-2" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return null;
}
