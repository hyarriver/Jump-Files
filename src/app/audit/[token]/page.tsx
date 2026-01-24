'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, FileText, Download, AlertTriangle, ArrowLeft, User, Calendar } from 'lucide-react';

interface AuditData {
  file: {
    id: string;
    objectKey: string;
    size: number;
    createdAt: string;
  };
  downloads: Array<{
    id: string;
    usedBy: string;
    usedAt: string;
    user?: {
      id: string;
      email: string;
      name: string | null;
    };
  }>;
}

export default function AuditPage() {
  const { token } = useParams() as { token: string };
  const [auditData, setAuditData] = useState<AuditData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAuditData = async () => {
      try {
        const response = await fetch(`/api/audit/${token}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || '获取审计数据失败');
        }
        const data = await response.json();
        setAuditData(data);
      } catch (error) {
        setError(error instanceof Error ? error.message : '加载审计数据时发生错误');
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchAuditData();
    }
  }, [token]);

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
            <p className="mt-4 text-muted-foreground">加载审计数据中...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto h-12 w-12 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>无法访问审计数据</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button asChild>
              <Link href="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                返回首页
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 导航栏 */}
      <nav className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold">Jump Files - 下载审计</h1>
            </div>
            <div className="flex items-center">
              <Button variant="ghost" asChild>
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  返回首页
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <Card>
            {/* 文件信息 */}
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                文件信息
              </CardTitle>
            </CardHeader>
            {auditData?.file && (
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">文件名称</div>
                      <div className="font-medium">{auditData.file.objectKey.split('/').pop()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">文件大小</div>
                      <div className="font-medium">{formatFileSize(auditData.file.size)}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <div className="text-sm text-muted-foreground">上传时间</div>
                      <div className="font-medium">{new Date(auditData.file.createdAt).toLocaleString('zh-CN')}</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {/* 下载记录 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                下载记录
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auditData?.downloads && auditData.downloads.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>下载用户</TableHead>
                        <TableHead>下载时间</TableHead>
                        <TableHead>状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditData.downloads.map((download) => (
                        <TableRow key={download.id}>
                          <TableCell>
                            {download.user ? (
                              <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                <div>
                                  <div className="font-medium">{download.user.name || '未命名'}</div>
                                  <div className="text-sm text-muted-foreground">{download.user.email}</div>
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">用户信息不可用</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {new Date(download.usedAt).toLocaleString('zh-CN')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">已下载</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium">尚未有下载记录</h3>
                  <p className="mt-1 text-sm text-muted-foreground">当有人下载此文件时，下载记录将会显示在这里。</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}