import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { storage } from '@/lib/storage-unified';
import { isValidTokenFormat } from '@/lib/token';
import { getFileCategory, isPreviewable } from '@/lib/file-validation';

/**
 * 文件预览API
 * 支持图片、PDF、文本文件预览
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ objectKey: string }> }
) {
  try {
    const { objectKey } = await params;
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    // 如果提供了token，验证token有效性
    if (token) {
      if (!isValidTokenFormat(token)) {
        return NextResponse.json(
          { error: '无效的token格式' },
          { status: 400 }
        );
      }

      const tokenRecord = await prisma.downloadToken.findUnique({
        where: { token },
        include: { file: true },
      });

      if (!tokenRecord || tokenRecord.file.objectKey !== objectKey) {
        return NextResponse.json(
          { error: '无效的token或文件不匹配' },
          { status: 403 }
        );
      }
    }

    // 查找文件
    const file = await prisma.file.findUnique({
      where: { objectKey },
    });

    if (!file) {
      return NextResponse.json(
        { error: '文件不存在' },
        { status: 404 }
      );
    }

    // 检查文件是否可预览
    const extension = objectKey.split('.').pop()?.toLowerCase() || '';
    if (!isPreviewable(`.${extension}`)) {
      return NextResponse.json(
        { error: '此文件类型不支持预览' },
        { status: 400 }
      );
    }

    // 获取文件内容
    const fileBuffer = await storage.get(objectKey);
    if (!fileBuffer) {
      return NextResponse.json(
        { error: '文件不存在' },
        { status: 404 }
      );
    }

    // 根据文件类型返回不同的响应
    const category = getFileCategory(`.${extension}`);
    
    if (category === 'images') {
      // 图片文件：直接返回图片
      const contentType = getImageContentType(extension);
      return new NextResponse(new Uint8Array(fileBuffer), {
        headers: {
          'Content-Type': contentType,
          'Content-Length': fileBuffer.length.toString(),
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } else if (category === 'documents' && extension === 'pdf') {
      // PDF文件：返回PDF
      return new NextResponse(new Uint8Array(fileBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Length': fileBuffer.length.toString(),
          'Content-Disposition': `inline; filename="${objectKey.split('/').pop()}"`,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    } else if (category === 'code' || category === 'documents') {
      // 文本文件：返回文本内容
      const text = fileBuffer.toString('utf-8');
      return NextResponse.json({
        content: text,
        type: 'text',
        filename: objectKey.split('/').pop(),
      });
    }

    return NextResponse.json(
      { error: '不支持的文件类型' },
      { status: 400 }
    );
  } catch (error) {
    console.error('文件预览错误:', error);
    return NextResponse.json(
      { error: '预览文件失败，请稍后重试' },
      { status: 500 }
    );
  }
}

function getImageContentType(extension: string): string {
  const contentTypes: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
  };
  return contentTypes[extension.toLowerCase()] || 'application/octet-stream';
}
