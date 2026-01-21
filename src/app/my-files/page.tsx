'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  FileText,
  Search,
  Trash2,
  FileSearch,
  Copy,
  Check,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Download,
  Calendar,
  HardDrive,
} from 'lucide-react';

interface FileItem {
  id: string;
  objectKey: string;
  originalName: string;
  size: number;
  adminToken: string;
  createdAt: string;
  expiresAt: string | null;
  downloadCount: number;
  totalShares: number;
  activeShares: number;
  hasActiveShare: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function MyFilesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [files, setFiles] = useState<FileItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<FileItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // 加载文件列表
  useEffect(() => {
    if (status === 'authenticated') {
      loadFiles();
    }
  }, [status, search]);

  const loadFiles = async (page = 1) => {
    setIsLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (search) {
        params.append('search', search);
      }

      const response = await fetch(`/api/my-files?${params}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '获取文件列表失败');
      }

      const data = await response.json();
      setFiles(data.files);
      setPagination(data.pagination);
    } catch (error) {
      setError(error instanceof Error ? error.message : '加载文件列表失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!fileToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/files/${fileToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '删除失败');
      }

      // 重新加载文件列表
      await loadFiles(pagination?.page || 1);
      setDeleteDialogOpen(false);
      setFileToDelete(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : '删除失败');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopyLink = async (file: FileItem) => {
    try {
      // 获取分享链接
      const response = await fetch(`/api/files/${file.id}/share-link`);
      if (!response.ok) {
        throw new Error('获取分享链接失败');
      }
      const data = await response.json();
      
      if (data.shareUrl) {
        await navigator.clipboard.writeText(data.shareUrl);
      } else {
        // 如果没有活跃的分享链接，复制审计链接
        const baseUrl = window.location.origin;
        const auditUrl = `${baseUrl}/audit/${file.adminToken}`;
        await navigator.clipboard.writeText(auditUrl);
      }
      setCopiedId(file.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('复制失败:', error);
      // 失败时复制审计链接作为备选
      const baseUrl = window.location.origin;
      const auditUrl = `${baseUrl}/audit/${file.adminToken}`;
      await navigator.clipboard.writeText(auditUrl);
      setCopiedId(file.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getExpirationStatus = (expiresAt: string | null) => {
    if (!expiresAt) return { status: 'never', text: '永不过期', color: 'text-muted-foreground' };
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMs < 0) {
      return { status: 'expired', text: '已过期', color: 'text-destructive' };
    } else if (diffDays <= 1) {
      return { status: 'expiring', text: `剩余 ${diffDays} 天`, color: 'text-orange-600' };
    } else {
      return { status: 'active', text: `剩余 ${diffDays} 天`, color: 'text-muted-foreground' };
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

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
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
                  <FileText className="h-4 w-4 text-primary-foreground" />
                </div>
                <h1 className="text-xl font-bold">我的文件</h1>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* 主内容 */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* 搜索栏 */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索文件名..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={() => loadFiles(1)}>
                  搜索
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 错误提示 */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* 文件列表 */}
          <Card>
            <CardHeader>
              <CardTitle>文件列表</CardTitle>
              <CardDescription>
                {pagination && `共 ${pagination.total} 个文件`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
                  <h3 className="mt-2 text-sm font-medium">暂无文件</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {search ? '没有找到匹配的文件' : '上传您的第一个文件开始使用'}
                  </p>
                  {!search && (
                    <Button className="mt-4" asChild>
                      <Link href="/">上传文件</Link>
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                      <TableRow>
                        <TableHead>文件名</TableHead>
                        <TableHead>大小</TableHead>
                        <TableHead>上传时间</TableHead>
                        <TableHead>过期时间</TableHead>
                        <TableHead>下载次数</TableHead>
                        <TableHead>状态</TableHead>
                        <TableHead className="text-right">操作</TableHead>
                      </TableRow>
                      </TableHeader>
                      <TableBody>
                        {files.map((file) => (
                          <TableRow key={file.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <FileText className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{file.originalName}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <HardDrive className="h-4 w-4 text-muted-foreground" />
                                {formatFileSize(file.size)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                {new Date(file.createdAt).toLocaleString('zh-CN')}
                              </div>
                            </TableCell>
                            <TableCell>
                              {(() => {
                                const expStatus = getExpirationStatus(file.expiresAt);
                                return (
                                  <div className="flex items-center gap-2">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    <span className={expStatus.color}>
                                      {expStatus.text}
                                    </span>
                                  </div>
                                );
                              })()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Download className="h-4 w-4 text-muted-foreground" />
                                {file.downloadCount}
                              </div>
                            </TableCell>
                            <TableCell>
                              {file.hasActiveShare ? (
                                <Badge variant="default">可分享</Badge>
                              ) : (
                                <Badge variant="secondary">已使用</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(`/audit/${file.adminToken}`)}
                                  title="查看审计"
                                >
                                  <FileSearch className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleCopyLink(file)}
                                  title="复制审计链接"
                                >
                                  {copiedId === file.id ? (
                                    <Check className="h-4 w-4 text-green-600" />
                                  ) : (
                                    <Copy className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setFileToDelete(file);
                                    setDeleteDialogOpen(true);
                                  }}
                                  title="删除文件"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* 分页 */}
                  {pagination && pagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4">
                      <div className="text-sm text-muted-foreground">
                        第 {pagination.page} 页，共 {pagination.totalPages} 页
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadFiles(pagination.page - 1)}
                          disabled={pagination.page === 1}
                        >
                          上一页
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => loadFiles(pagination.page + 1)}
                          disabled={pagination.page === pagination.totalPages}
                        >
                          下一页
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      {/* 删除确认对话框 */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>确认删除</DialogTitle>
            <DialogDescription>
              确定要删除文件 "{fileToDelete?.originalName}" 吗？此操作不可恢复，所有分享链接将失效。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setFileToDelete(null);
              }}
              disabled={isDeleting}
            >
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  删除中...
                </>
              ) : (
                '确认删除'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
