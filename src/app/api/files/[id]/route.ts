import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { storage } from '@/lib/storage-unified';
import { getCurrentUser } from '@/lib/get-session';
import { rateLimitMiddleware } from '@/lib/middleware/rate-limit-middleware';

/**
 * 删除文件
 */
export async function DELETE(
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
    });

    if (!file) {
      return NextResponse.json(
        { error: '文件不存在' },
        { status: 404 }
      );
    }

    // 检查权限：只有上传者可以删除
    if (file.uploadedBy !== user.id) {
      return NextResponse.json(
        { error: '无权删除此文件' },
        { status: 403 }
      );
    }

    // 删除文件（使用事务确保数据一致性）
    await prisma.$transaction(async (tx) => {
      // 删除数据库记录（会级联删除tokens）
      await tx.file.delete({
        where: { id },
      });

      // 删除存储中的文件
      try {
        await storage.delete(file.objectKey);
      } catch (storageError) {
        console.error('删除存储文件失败:', storageError);
        // 即使存储删除失败，也继续（数据库记录已删除）
      }
    });

    return NextResponse.json({
      message: '文件已删除',
    });
  } catch (error) {
    console.error('删除文件错误:', error);
    return NextResponse.json(
      { error: '删除文件失败，请稍后重试' },
      { status: 500 }
    );
  }
}

/**
 * 获取文件详情
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
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
          orderBy: {
            usedAt: 'desc',
          },
        },
      },
    });

    if (!file) {
      return NextResponse.json(
        { error: '文件不存在' },
        { status: 404 }
      );
    }

    // 检查权限：只有上传者可以查看
    if (file.uploadedBy !== user.id) {
      return NextResponse.json(
        { error: '无权查看此文件' },
        { status: 403 }
      );
    }

    // 格式化数据
    const downloads = file.tokens
      .filter((t) => t.status === 'used')
      .map((t) => ({
        id: t.id,
        usedAt: t.usedAt,
        user: t.user,
      }));

    return NextResponse.json({
      file: {
        id: file.id,
        objectKey: file.objectKey,
        originalName: file.originalName || file.objectKey.split('/').pop() || '未知文件',
        size: file.size,
        adminToken: file.adminToken,
        createdAt: file.createdAt,
        downloadCount: downloads.length,
        totalShares: file.tokens.length,
        activeShares: file.tokens.filter((t) => t.status === 'unused').length,
      },
      downloads,
    });
  } catch (error) {
    console.error('获取文件详情错误:', error);
    return NextResponse.json(
      { error: '获取文件详情失败，请稍后重试' },
      { status: 500 }
    );
  }
}
