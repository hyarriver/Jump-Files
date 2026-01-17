'use client';

import { useSession, signOut } from 'next-auth/react';
import FileUpload from '@/components/FileUpload';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Upload, Shield, FileCheck, Users, Zap, Lock, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 导航栏 */}
      <nav className="bg-card/50 backdrop-blur-sm border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                  <Upload className="h-4 w-4 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-bold">Jump Files</h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              {session ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">欢迎, {session.user?.name || session.user?.email}</span>
                  </div>
                  <Separator orientation="vertical" className="h-6" />
                  <Button variant="outline" size="sm" onClick={() => signOut()}>
                    <Lock className="mr-2 h-4 w-4" />
                    登出
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" asChild>
                    <Link href="/auth/signin">登录</Link>
                  </Button>
                  <Button size="sm" asChild>
                    <Link href="/auth/signup">注册</Link>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* 主內容 */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* 欢迎区域 */}
          <div className="text-center mb-12">
            <div className="mb-6">
              <Badge variant="secondary" className="mb-4">
                <Zap className="mr-1 h-3 w-3" />
                安全 · 便捷 · 可审计
              </Badge>
            </div>
            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              安全文件分享平台
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-6">
              匿名上传文件，生成一次性分享链接。下载者必须登录，确保每一次下载都被记录和审计。
            </p>
            <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>匿名上传</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>安全分享</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>下载审计</span>
              </div>
            </div>
          </div>

          {/* 上传区域 */}
          <Card className="p-6">
            <div className="mb-4">
              <CardTitle className="mb-2">上传文件</CardTitle>
              <CardDescription>
                支持最大 100MB 的文件。上传后将生成一次性分享链接。
              </CardDescription>
            </div>
            <FileUpload />
          </Card>

          {/* 功能说明 */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="group hover:shadow-lg transition-all duration-300 border-primary/20 hover:border-primary/40">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto h-16 w-16 bg-primary/10 rounded-xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <Upload className="h-8 w-8 text-primary" />
                </div>
                <CardTitle className="text-xl">匿名上传</CardTitle>
              </CardHeader>
              <CardContent className="text-center pt-0">
                <CardDescription className="text-base">
                  不需要注册即可上传文件，保护您的隐私。支持最大 100MB 的文件上传。
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 border-green-500/20 hover:border-green-500/40">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto h-16 w-16 bg-green-100 rounded-xl flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <Shield className="h-8 w-8 text-green-600" />
                </div>
                <CardTitle className="text-xl">安全分享</CardTitle>
              </CardHeader>
              <CardContent className="text-center pt-0">
                <CardDescription className="text-base">
                  生成一次性链接，链接即权限，防止未授权访问。下载后链接自动失效。
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300 border-blue-500/20 hover:border-blue-500/40">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto h-16 w-16 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                  <FileCheck className="h-8 w-8 text-blue-600" />
                </div>
                <CardTitle className="text-xl">下载审计</CardTitle>
              </CardHeader>
              <CardContent className="text-center pt-0">
                <CardDescription className="text-base">
                  记录每一次下载行为，包含下载者和时间。确保文件分发的可追溯性。
                </CardDescription>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
