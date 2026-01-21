'use client';

import { useState, useRef } from 'react';
import { env } from '@/config/env';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';

interface UploadResult {
  shareUrl: string;
  adminUrl: string;
  token: string;
  adminToken: string;
}

export default function FileUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // 检查文件大小（100MB限制）
    const maxSize = env.MAX_FILE_SIZE_MB * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      setError(`文件大小不能超过 ${env.MAX_FILE_SIZE_MB}MB`);
      return;
    }

    setFile(selectedFile);
    setError('');
    setUploadResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);
    setError('');

    try {
      // 创建FormData
      const formData = new FormData();
      formData.append('file', file);

      // 模拟上传进度（实际实现中可以使用XMLHttpRequest来获取真实进度）
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // 上传文件
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        // 检查响应类型
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          try {
            const errorData = await response.json();
            throw new Error(errorData.error || '上传失败');
          } catch {
            throw new Error(`上传失败 (状态码: ${response.status})`);
          }
        } else {
          // 如果不是JSON，可能是HTML错误页面
          throw new Error(`服务器错误 (状态码: ${response.status})。请检查服务器日志或联系管理员。`);
        }
      }

      // 确保响应是JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('服务器返回了非JSON响应');
      }

      const result = await response.json();
      setUploadResult(result);
    } catch (error) {
      setError(error instanceof Error ? error.message : '上传过程中发生错误');
      setUploadProgress(0);
    } finally {
      setIsUploading(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setUploadResult(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* 文件选择 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            选择文件
          </CardTitle>
          <CardDescription>
            支持最大 {env.MAX_FILE_SIZE_MB}MB 的文件。上传后将生成一次性分享链接。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file-upload">文件</Label>
            <Input
              ref={fileInputRef}
              id="file-upload"
              type="file"
              onChange={handleFileSelect}
              className="cursor-pointer"
            />
            {file && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                选择的文件: {file.name} ({formatFileSize(file.size)})
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-3">
            <Button
              onClick={handleUpload}
              disabled={!file || isUploading}
              className="flex-1"
            >
              {isUploading ? '上传中...' : '上传文件'}
            </Button>
            <Button variant="outline" onClick={handleReset}>
              重置
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
      {uploadResult && (
        <Card className="border-green-200 bg-green-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-800">
              <CheckCircle className="h-5 w-5" />
              上传成功！
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <Label className="font-medium">分享链接：</Label>
                <p className="text-xs text-muted-foreground mb-2">请复制并分享给需要下载的人</p>
                <div className="p-3 bg-background rounded-md border font-mono text-sm break-all">
                  {uploadResult.shareUrl}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  ⚠️ 此链接仅可使用一次，下载后将失效。接收者需要先登录才能下载文件。
                </p>
              </div>

              <div>
                <Label className="font-medium">管理链接：</Label>
                <p className="text-xs text-muted-foreground mb-2">用于查看下载审计记录</p>
                <div className="p-3 bg-background rounded-md border font-mono text-sm break-all">
                  {uploadResult.adminUrl}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  💡 保存此链接以后查看谁下载了您的文件。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 上传进度指示器 */}
      {isUploading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>上传进度</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}