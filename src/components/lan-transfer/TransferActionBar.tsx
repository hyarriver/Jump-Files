"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Send } from "lucide-react";
import type { User } from "@/types/lan-transfer";

interface TransferActionBarProps {
  selectedUsers: User[];
  totalSize: string;
  canSend: boolean;
  isTransferring: boolean;
  onSend: () => void;
}

export function TransferActionBar({
  selectedUsers,
  totalSize,
  canSend,
  isTransferring,
  onSend,
}: TransferActionBarProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-neutral-900">
              发送给 {selectedUsers.length} 个用户
            </p>
            <p className="text-xs text-neutral-500">
              总大小: {totalSize}
            </p>
          </div>
          <Button
            onClick={onSend}
            disabled={!canSend || isTransferring}
            className="ml-4"
          >
            <Send className="mr-2 h-4 w-4" />
            {isTransferring ? "发送中..." : "发送"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
