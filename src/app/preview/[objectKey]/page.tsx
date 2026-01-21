'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, X, Maximize2, Minimize2, Download } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// 设置PDF.js worker
if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

interface PreviewContent {
  content?: string;
  type: 'image' | 'pdf' | 'text';
  filename?: string;
}

export default function PreviewPage() {
  const { objectKey } = useParams() as { objectKey: string };
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | 'text' | null>(null);
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scale, setScale] = useState(1.0);

  useEffect(() => {
    loadPreview();
  }, [objectKey, token]);

  const loadPreview = async () => {
    setIsLoading(true);
    setError('');

    try {
      const extension = objectKey.split('.').pop()?.toLowerCase() || '';
      const category = getFileCategory(extension);

      if (category === 'images') {
        // 图片预览
        const url = `/api/preview/${encodeURIComponent(objectKey)}${token ? `?token=${token}` : ''}`;
        setPreviewType('image');
        setContent(url);
      } else if (category === 'documents' && extension === 'pdf') {
        // PDF预览
        const url = `/api/preview/${encodeURIComponent(objectKey)}${token ? `?token=${token}` : ''}`;
        setPreviewType('pdf');
        setContent(url);
      } else if (category === 'code' || (category === 'documents' && ['txt', 'md'].includes(extension))) {
        // 文本预览
        const response = await fetch(`/api/preview/${encodeURIComponent(objectKey)}${token ? `?token=${token}` : ''}`);
        if (!response.ok) {
          throw new Error('加载预览失败');
        }
        const data = await response.json();
        setPreviewType('text');
        setContent(data.content || '');
      } else {
        throw new Error('不支持的文件类型');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : '加载预览失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    const url = `/api/files/${encodeURIComponent(objectKey)}${token ? `?token=${token}` : ''}`;
    window.open(url, '_blank');
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const getLanguageFromExtension = (filename: string): string => {
    const ext = filename.split('.').pop()?.toLowerCase() || '';
    const languageMap: Record<string, string> = {
      js: 'javascript',
      ts: 'typescript',
      jsx: 'javascript',
      tsx: 'typescript',
      py: 'python',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      go: 'go',
      rs: 'rust',
      html: 'html',
      css: 'css',
      json: 'json',
      xml: 'xml',
      yaml: 'yaml',
      yml: 'yaml',
      md: 'markdown',
      txt: 'plaintext',
    };
    return languageMap[ext] || 'plaintext';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="mt-4 text-muted-foreground">加载预览中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-background ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* 工具栏 */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium truncate">{objectKey.split('/').pop()}</span>
            </div>
            <div className="flex items-center gap-2">
              {previewType === 'pdf' && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
                    disabled={pageNumber <= 1}
                  >
                    上一页
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {pageNumber} / {numPages || '?'}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPageNumber((p) => Math.min(numPages || 1, p + 1))}
                    disabled={!numPages || pageNumber >= numPages}
                  >
                    下一页
                  </Button>
                  <Separator orientation="vertical" className="h-6" />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
                  >
                    -
                  </Button>
                  <span className="text-sm w-12 text-center">{Math.round(scale * 100)}%</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setScale((s) => Math.min(2, s + 0.25))}
                  >
                    +
                  </Button>
                </>
              )}
              <Button variant="outline" size="sm" onClick={toggleFullscreen}>
                {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                下载
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* 预览内容 */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {previewType === 'image' && (
          <div className="flex justify-center">
            <img
              src={content}
              alt="预览"
              className="max-w-full h-auto rounded-lg shadow-lg"
              style={{ maxHeight: 'calc(100vh - 120px)' }}
            />
          </div>
        )}

        {previewType === 'pdf' && (
          <div className="flex justify-center">
            <Card>
              <CardContent className="p-4">
                <Document
                  file={content}
                  onLoadSuccess={({ numPages }) => setNumPages(numPages)}
                  loading={
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  }
                  error={
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>PDF加载失败</AlertDescription>
                    </Alert>
                  }
                >
                  <Page
                    pageNumber={pageNumber}
                    scale={scale}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                  />
                </Document>
              </CardContent>
            </Card>
          </div>
        )}

        {previewType === 'text' && (
          <Card>
            <CardContent className="p-0">
              <pre className="p-4 overflow-auto bg-muted/50 rounded-lg" style={{ maxHeight: 'calc(100vh - 120px)' }}>
                <code className="text-sm">{content}</code>
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function getFileCategory(extension: string): string | null {
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];
  const docExts = ['pdf', 'doc', 'docx', 'txt', 'md'];
  const codeExts = ['js', 'ts', 'jsx', 'tsx', 'json', 'css', 'html', 'xml', 'yaml', 'yml', 'py', 'java', 'cpp', 'c', 'go', 'rs'];

  if (imageExts.includes(extension)) return 'images';
  if (docExts.includes(extension)) return 'documents';
  if (codeExts.includes(extension)) return 'code';
  return null;
}

import { Separator } from '@/components/ui/separator';
