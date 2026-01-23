"use client";

import { FileTransfer } from "@/components/lan-transfer/FileTransfer";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function LanTransferPage() {
  const { data: session } = useSession();

  return (
    <div className="min-h-screen bg-background">
      {/* 导航栏 */}
      <nav className="bg-card/50 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  返回首页
                </Link>
              </Button>
              <div className="h-6 w-px bg-border" />
              <h1 className="text-xl font-bold">局域网文件传输</h1>
            </div>
            {session && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {session.user?.name || session.user?.email}
                </span>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <main>
        <FileTransfer />
      </main>
    </div>
  );
}
