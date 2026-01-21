import { NextRequest, NextResponse } from 'next/server';
import { storage } from '@/lib/storage-unified';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ objectKey: string }> }
) {
  try {
    const { objectKey } = await params;
    
    // 安全检查：防止路径遍历攻击
    if (objectKey.includes('..') || objectKey.includes('/') || objectKey.includes('\\')) {
      return NextResponse.json(
        { error: '无效的文件路径' },
        { status: 400 }
      );
    }

    // 使用統一的存儲接口讀取文件
    const fileBuffer = await storage.get(objectKey);
    
    if (!fileBuffer) {
      return NextResponse.json(
        { error: '文件不存在' },
        { status: 404 }
      );
    }
    
    // 根据文件扩展名设置Content-Type
    const ext = objectKey.split('.').pop()?.toLowerCase();
    const contentTypeMap: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'pdf': 'application/pdf',
      'txt': 'text/plain',
      'dwg': 'application/acad',
      'zip': 'application/zip',
    };
    const contentType = contentTypeMap[ext || ''] || 'application/octet-stream';

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${objectKey}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('文件读取错误:', error);
    return NextResponse.json(
      { error: '文件不存在或无法读取' },
      { status: 404 }
    );
  }
}