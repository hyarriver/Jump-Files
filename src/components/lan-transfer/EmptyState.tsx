"use client";

import { Upload, Users } from "lucide-react";

interface EmptyStateProps {
  hasUsers: boolean;
  hasFiles: boolean;
}

export function EmptyState({ hasUsers, hasFiles }: EmptyStateProps) {
  if (!hasUsers) {
    return (
      <div className="text-center py-12">
        <Users className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
        <p className="text-neutral-600 font-medium">等待其他用户加入...</p>
        <p className="text-sm text-neutral-500 mt-2">
          确保其他设备也在同一局域网并访问此页面
        </p>
      </div>
    );
  }

  if (!hasFiles) {
    return (
      <div className="text-center py-12">
        <Upload className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
        <p className="text-neutral-600 font-medium">选择要传输的文件</p>
        <p className="text-sm text-neutral-500 mt-2">
          拖放文件到上方区域或点击选择文件
        </p>
      </div>
    );
  }

  return null;
}
