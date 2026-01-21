import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { storage } from '@/lib/storage-unified';

/**
 * 清理过期文件
 * 可以手动调用或通过定时任务调用
 */
export async function POST(request: NextRequest) {
  try {
    // 可选：添加管理员验证
    const authHeader = request.headers.get('authorization');
    const adminToken = process.env.ADMIN_CLEANUP_TOKEN;
    
    if (adminToken && authHeader !== `Bearer ${adminToken}`) {
      return NextResponse.json(
        { error: '未授权' },
        { status: 401 }
      );
    }

    const now = new Date();
    
    // 查找所有过期文件
    const expiredFiles = await prisma.file.findMany({
      where: {
        expiresAt: {
          not: null,
          lte: now, // 过期时间小于等于当前时间
        },
      },
      include: {
        tokens: true,
      },
    });

    let deletedCount = 0;
    let errorCount = 0;

    // 删除过期文件
    for (const file of expiredFiles) {
      try {
        // 使用事务确保数据一致性
        await prisma.$transaction(async (tx) => {
          // 删除数据库记录（会级联删除tokens）
          await tx.file.delete({
            where: { id: file.id },
          });

          // 删除存储中的文件
          try {
            await storage.delete(file.objectKey);
          } catch (storageError) {
            console.error(`删除存储文件失败 ${file.objectKey}:`, storageError);
            // 即使存储删除失败，也继续（数据库记录已删除）
          }
        });

        deletedCount++;
      } catch (error) {
        console.error(`删除文件失败 ${file.id}:`, error);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      deletedCount,
      errorCount,
      totalExpired: expiredFiles.length,
      message: `成功删除 ${deletedCount} 个过期文件${errorCount > 0 ? `，${errorCount} 个失败` : ''}`,
    });
  } catch (error) {
    console.error('清理过期文件错误:', error);
    return NextResponse.json(
      { error: '清理失败，请稍后重试' },
      { status: 500 }
    );
  }
}

/**
 * 获取过期文件统计
 */
export async function GET() {
  try {
    const now = new Date();
    
    // 统计即将过期的文件（24小时内）
    const expiringSoon = await prisma.file.count({
      where: {
        expiresAt: {
          not: null,
          gte: now,
          lte: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24小时后
        },
      },
    });

    // 统计已过期文件
    const expired = await prisma.file.count({
      where: {
        expiresAt: {
          not: null,
          lte: now,
        },
      },
    });

    // 统计总文件数
    const total = await prisma.file.count();

    return NextResponse.json({
      expiringSoon,
      expired,
      total,
    });
  } catch (error) {
    console.error('获取过期文件统计错误:', error);
    return NextResponse.json(
      { error: '获取统计失败' },
      { status: 500 }
    );
  }
}
