import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidTokenFormat } from '@/lib/token';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<NextResponse> {
  try {
    const { token } = await params;

    // 基本格式驗證
    if (!isValidTokenFormat(token)) {
      return NextResponse.json(
        { error: '無效的管理token格式' },
        { status: 400 }
      );
    }

    // 查詢文件及其下載記錄
    const file = await prisma.file.findUnique({
      where: { adminToken: token as string },
      include: {
        tokens: {
          where: { status: 'used' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
          orderBy: { usedAt: 'desc' },
        },
      },
    });

    if (!file) {
      return NextResponse.json(
        { error: '管理鏈接不存在或已失效' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      file: {
        id: file.id,
        objectKey: file.objectKey,
        size: file.size,
        createdAt: file.createdAt,
      },
      downloads: file.tokens.map((downloadToken) => ({
        id: downloadToken.id,
        usedBy: downloadToken.usedBy,
        usedAt: downloadToken.usedAt,
        user: downloadToken.user,
      })),
    });
  } catch (error) {
    console.error('獲取審計數據錯誤:', error);
    return NextResponse.json(
      { error: '獲取審計數據失敗，請稍後再試' },
      { status: 500 }
    );
  }
}