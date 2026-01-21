import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidTokenFormat } from '@/lib/token';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    // 基本格式驗證
    if (!isValidTokenFormat(token)) {
      return NextResponse.json(
        { error: '無效的token格式' },
        { status: 400 }
      );
    }

    // 查詢token
    const tokenRecord = await prisma.downloadToken.findUnique({
      where: { token },
      include: {
        file: true,
      },
    });

    if (!tokenRecord) {
      return NextResponse.json(
        { error: '鏈接不存在或已失效' },
        { status: 404 }
      );
    }

    if (tokenRecord.status === 'used') {
      return NextResponse.json(
        { error: '此鏈接已被使用，無法再次下載' },
        { status: 410 } // Gone
      );
    }

    return NextResponse.json({
      token: {
        id: tokenRecord.id,
        token: tokenRecord.token,
        status: tokenRecord.status,
        file: {
          id: tokenRecord.file.id,
          objectKey: tokenRecord.file.objectKey,
          size: tokenRecord.file.size,
          createdAt: tokenRecord.file.createdAt,
        },
      },
    });
  } catch (error) {
    console.error('驗證token錯誤:', error);
    return NextResponse.json(
      { error: '驗證失敗，請稍後再試' },
      { status: 500 }
    );
  }
}