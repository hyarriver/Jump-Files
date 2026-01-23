"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { formatBytes } from "@/lib/utils";
import type { IncomingTransfer } from "@/types/lan-transfer";

interface IncomingRequestProps {
  transfer: IncomingTransfer;
  onAccept: () => void;
  onDecline: () => void;
}

export function IncomingRequest({
  transfer,
  onAccept,
  onDecline,
}: IncomingRequestProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>接收文件请求</CardTitle>
        <CardDescription>
          来自用户 {transfer.senderId} 的文件传输请求
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-sm font-medium">文件列表:</p>
          <ul className="list-disc list-inside space-y-1 text-sm text-neutral-600">
            {transfer.files.map((file, index) => (
              <li key={index}>
                {file.name} ({formatBytes(file.size)})
              </li>
            ))}
          </ul>
          <p className="text-sm text-neutral-500">
            总大小: {formatBytes(transfer.totalSize)}
          </p>
        </div>

        {transfer.status === "receiving" && (
          <div className="space-y-2">
            <Progress value={transfer.progress} className="h-2" />
            <p className="text-xs text-neutral-500 text-center">
              {transfer.progress.toFixed(1)}%
            </p>
          </div>
        )}

        {transfer.status === "pending" && (
          <div className="flex gap-2">
            <Button onClick={onAccept} className="flex-1">
              接受
            </Button>
            <Button variant="outline" onClick={onDecline} className="flex-1">
              拒绝
            </Button>
          </div>
        )}

        {transfer.status === "completed" && (
          <p className="text-sm text-green-600 text-center">传输完成</p>
        )}

        {transfer.status === "declined" && (
          <p className="text-sm text-red-600 text-center">已拒绝</p>
        )}
      </CardContent>
    </Card>
  );
}
