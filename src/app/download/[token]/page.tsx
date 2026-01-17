'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Download, FileText, AlertTriangle, Shield, LogIn, UserPlus } from 'lucide-react';

interface DownloadToken {
  id: string;
  token: string;
  status: string;
  file: {
    id: string;
    objectKey: string;
    size: number;
    createdAt: string;
  };
}

export default function DownloadPage() {
  const { token } = useParams() as { token: string };
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [tokenData, setTokenData] = useState<DownloadToken | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState('');

  // 驗證token
  useEffect(() => {
    const validateToken = async () => {
    try {
      const response = await fetch(`/api/download/validate/${token}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '无效的链接');
      }
      const data = await response.json();
      setTokenData(data.token);
    } catch (error) {
      setError(error instanceof Error ? error.message : '验证链接失败');
    } finally {
      setIsLoading(false);
    }
    };

    if (token) {
      validateToken();
    }
  }, [token]);

  const handleDownload = async () => {
    if (!session?.user?.id) {
      setError('请先登录');
      return;
    }

    setIsDownloading(true);
    setError('');

    try {
      const response = await fetch(`/api/download/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user?.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '下载失败');
      }

      // 创建下载链接并触发下载
      const downloadUrl = await response.text();
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = tokenData?.file.objectKey.split('/').pop() || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // 下载完成后跳转到成功页面
      router.push('/download/success');
    } catch (error) {
      setError(error instanceof Error ? error.message : '下载过程中发生错误');
    } finally {
      setIsDownloading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">验证链接中...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error && !tokenData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>无效的分享链接</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href="/">返回首页</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (sessionStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-4 text-muted-foreground">检查登录状态...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <CardTitle>需要登录才能下载</CardTitle>
            <CardDescription>
              此分享链接要求下载者必须登录账户。下载行为将被记录以确保安全性和可审计性。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/auth/signin">
                <LogIn className="mr-2 h-4 w-4" />
                登录并下载
              </Link>
            </Button>
            <Button variant="outline" asChild className="w-full">
              <Link href="/auth/signup">
                <UserPlus className="mr-2 h-4 w-4" />
                注册新账户
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto h-12 w-12 bg-green-100 rounded-full flex items-center justify-center">
            <Download className="h-6 w-6 text-green-600" />
          </div>
          <CardTitle>准备下载文件</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {tokenData && (
            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  文件大小:
                </span>
                <span>{formatFileSize(tokenData.file.size)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>上传时间:</span>
                <span>{new Date(tokenData.file.createdAt).toLocaleString('zh-CN')}</span>
              </div>
            </div>
          )}

          <CardDescription>
            点击下载按钮后，文件将开始下载。此链接将在下载后失效。
          </CardDescription>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="w-full"
          >
            {isDownloading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDownloading ? '下载中...' : '下载文件'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}