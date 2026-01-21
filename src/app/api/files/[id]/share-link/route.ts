import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { env } from '@/config/env';
import { getCurrentUser } from '@/lib/get-session';
import { rateLimitMiddleware } from '@/lib/middleware/rate-limit-middleware';

/**
 * 获取文件的分享链接
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // 速率限制检查
  const rateLimitResponse = await rateLimitMiddleware(request, { strategy: 'api' });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const { id } = await params;

    // 获取当前用户
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    // 查找文件
    const file = await prisma.file.findUnique({
      where: { id },
      include: {
        tokens: {
          where: { status: 'unused' },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!file) {
      return NextResponse.json(
        { error: '文件不存在' },
        { status: 404 }
      );
    }

    // 检查权限：只有上传者可以获取分享链接
    if (file.uploadedBy !== user.id) {
      return NextResponse.json(
        { error: '无权访问此文件' },
        { status: 403 }
      );
    }

    // 获取基础URL
    const host = request.headers.get('host') || '';
    const protocol = request.headers.get('x-forwarded-proto') || 
                     (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https');
    const baseUrl = env.NEXTAUTH_URL || `${protocol}://${host}`;

    // 如果有未使用的token，返回分享链接
    if (file.tokens.length > 0) {
      const shareUrl = `${baseUrl}/download/${file.tokens[0].token}`;
      return NextResponse.json({
        shareUrl,
        hasActiveShare: true,
      });
    }

    // 如果没有未使用的token，返回null（需要重新生成）
    return NextResponse.json({
      shareUrl: null,
      hasActiveShare: false,
      message: '所有分享链接已使用，需要重新生成',
    });
  } catch (error) {
    console.error('获取分享链接错误:', error);
    return NextResponse.json(
      { error: '获取分享链接失败，请稍后重试' },
      { status: 500 }
    );
  }
}
