'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { env } from '@/config/env';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  FileSearch,
  Copy,
  Check,
  X,
  XCircle,
  Loader2,
} from 'lucide-react';

interface UploadResult {
  shareUrl: string;
  adminUrl: string;
  token: string;
  adminToken: string;
  fileId: string;
}

interface FileUploadItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  result?: UploadResult;
  error?: string;
}

export default function FileUpload() {
  const router = useRouter();
  const [files, setFiles] = useState<FileUploadItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState('');
  const [expiresInDays, setExpiresInDays] = useState<string>(''); // 过期天数
  const [sharePassword, setSharePassword] = useState(''); // 分享密码
  const [maxDownloads, setMaxDownloads] = useState<string>(''); // 最大下载次数
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file: File): string | null => {
    const maxSize = env.MAX_FILE_SIZE_MB * 1024 * 1024;
    if (file.size > maxSize) {
      return `文件 ${file.name} 大小超过 ${env.MAX_FILE_SIZE_MB}MB 限制`;
    }
    return null;
  };

  const addFiles = useCallback((fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const newFiles: FileUploadItem[] = [];
    const errors: string[] = [];

    Array.from(fileList).forEach((file) => {
      const error = validateFile(file);
      if (error) {
        errors.push(error);
        return;
      }

      // 检查是否已存在相同文件
      const exists = files.some((f) => f.file.name === file.name && f.file.size === file.size);
      if (exists) {
        errors.push(`文件 ${file.name} 已存在`);
        return;
      }

      newFiles.push({
        id: `${Date.now()}-${Math.random()}`,
        file,
        status: 'pending',
        progress: 0,
      });
    });

    if (errors.length > 0) {
      setError(errors.join('; '));
    }

    if (newFiles.length > 0) {
      setFiles((prev) => [...prev, ...newFiles]);
      setError('');
    }
  }, [files]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    // 重置input，允许重复选择相同文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const uploadSingleFile = async (item: FileUploadItem): Promise<void> => {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('file', item.file);

      const xhr = new XMLHttpRequest();

      // 上传进度
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const progress = Math.round((e.loaded / e.total) * 100);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === item.id ? { ...f, progress, status: 'uploading' } : f
            )
          );
        }
      });

      // 上传完成
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const result = JSON.parse(xhr.responseText);
            setFiles((prev) =>
              prev.map((f) =>
                f.id === item.id
                  ? { ...f, status: 'success', progress: 100, result }
                  : f
              )
            );
            resolve();
          } catch (error) {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === item.id
                  ? { ...f, status: 'error', error: '响应解析失败' }
                  : f
              )
            );
            reject(error);
          }
        } else {
          try {
            const errorData = JSON.parse(xhr.responseText);
            setFiles((prev) =>
              prev.map((f) =>
                f.id === item.id
                  ? { ...f, status: 'error', error: errorData.error || '上传失败' }
                  : f
              )
            );
          } catch {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === item.id
                  ? { ...f, status: 'error', error: `上传失败 (${xhr.status})` }
                  : f
              )
            );
          }
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      // 上传错误
      xhr.addEventListener('error', () => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === item.id ? { ...f, status: 'error', error: '网络错误' } : f
          )
        );
        reject(new Error('Network error'));
      });

      // 开始上传
      xhr.open('POST', '/api/upload');
      xhr.send(formData);
    });
  };

  const handleUpload = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    setError('');

    // 顺序上传文件（避免服务器压力过大）
    for (const fileItem of pendingFiles) {
      try {
        await uploadSingleFile(fileItem);
        // 每个文件上传间隔100ms
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.error(`文件 ${fileItem.file.name} 上传失败:`, error);
      }
    }

    setIsUploading(false);
  };

  const handleReset = () => {
    setFiles([]);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCopyLink = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('复制失败:', error);
    }
  };

  const handleViewAudit = (adminToken: string) => {
    router.push(`/audit/${adminToken}`);
  };

  const handleViewMyFiles = () => {
    router.push('/my-files');
  };

  // 拖拽处理
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  const successCount = files.filter((f) => f.status === 'success').length;
  const errorCount = files.filter((f) => f.status === 'error').length;
  const uploadingCount = files.filter((f) => f.status === 'uploading').length;
  const pendingCount = files.filter((f) => f.status === 'pending').length;

  return (
    <div className="space-y-6">
      {/* 文件选择区域 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            选择文件
          </CardTitle>
          <CardDescription>
            支持最大 {env.MAX_FILE_SIZE_MB}MB 的文件，可同时选择多个文件。支持拖拽上传。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 拖拽区域 */}
          <div
            ref={dropZoneRef}
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center transition-colors
              ${isDragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'}
              cursor-pointer hover:border-primary/50
            `}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-sm font-medium mb-2">
              点击选择文件或拖拽文件到此处
            </p>
            <p className="text-xs text-muted-foreground">
              支持多文件选择，每个文件最大 {env.MAX_FILE_SIZE_MB}MB
            </p>
          </div>

          <Input
            ref={fileInputRef}
            id="file-upload"
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* 文件列表 */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>已选择 {files.length} 个文件</Label>
                <div className="flex gap-2 text-xs text-muted-foreground">
                  {successCount > 0 && (
                    <span className="text-green-600">成功: {successCount}</span>
                  )}
                  {errorCount > 0 && (
                    <span className="text-destructive">失败: {errorCount}</span>
                  )}
                  {uploadingCount > 0 && (
                    <span className="text-primary">上传中: {uploadingCount}</span>
                  )}
                  {pendingCount > 0 && (
                    <span>待上传: {pendingCount}</span>
                  )}
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto space-y-2 border rounded-lg p-2">
                {files.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-2 rounded-md bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium truncate">{item.file.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {formatFileSize(item.file.size)}
                        </Badge>
                        {item.status === 'success' && (
                          <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        )}
                        {item.status === 'error' && (
                          <XCircle className="h-4 w-4 text-destructive flex-shrink-0" />
                        )}
                        {item.status === 'uploading' && (
                          <Loader2 className="h-4 w-4 text-primary animate-spin flex-shrink-0" />
                        )}
                      </div>
                      {item.status === 'uploading' && (
                        <Progress value={item.progress} className="mt-1 h-1" />
                      )}
                      {item.status === 'error' && item.error && (
                        <p className="text-xs text-destructive mt-1">{item.error}</p>
                      )}
                    </div>
                    {item.status !== 'uploading' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 flex-shrink-0"
                        onClick={() => removeFile(item.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 过期时间设置 */}
          <div className="space-y-2">
            <Label htmlFor="expires-in">文件过期时间（可选）</Label>
            <div className="flex gap-2">
              <Input
                id="expires-in"
                type="number"
                min="1"
                placeholder="天数（留空表示永不过期）"
                value={expiresInDays}
                onChange={(e) => setExpiresInDays(e.target.value)}
                disabled={isUploading}
                className="flex-1"
              />
              <select
                value={expiresInDays || ''}
                onChange={(e) => setExpiresInDays(e.target.value)}
                disabled={isUploading}
                className="px-3 py-2 border rounded-md bg-background"
              >
                <option value="">永不过期</option>
                <option value="1">1天</option>
                <option value="7">7天</option>
                <option value="30">30天</option>
                <option value="90">90天</option>
              </select>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 设置过期时间后，文件将在指定天数后自动删除
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <Button
              onClick={handleUpload}
              disabled={pendingCount === 0 || isUploading}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  上传中...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  上传 {pendingCount > 0 ? `${pendingCount} 个` : ''}文件
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={isUploading}>
              清空
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 错误信息 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 上传结果 */}
      {successCount > 0 && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              上传成功 {successCount} 个文件
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {files
                .filter((f) => f.status === 'success' && f.result)
                .map((item) => (
                  <div key={item.id} className="p-3 bg-background rounded-md border">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{item.file.name}</span>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleCopyLink(item.result!.shareUrl)}
                          title="复制分享链接"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleViewAudit(item.result!.adminToken)}
                          title="查看审计"
                        >
                          <FileSearch className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-2 bg-muted rounded text-xs font-mono break-all">
                      {item.result!.shareUrl}
                    </div>
                  </div>
                ))}
            </div>

            <Separator />

            <div className="flex gap-2">
              <Button
                onClick={handleViewMyFiles}
                variant="default"
                className="flex-1"
              >
                <FileText className="mr-2 h-4 w-4" />
                查看我的文件
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              💡 所有文件已保存，可在"我的文件"页面统一管理
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
