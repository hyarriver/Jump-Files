import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/get-session';
import { rateLimitMiddleware } from '@/lib/middleware/rate-limit-middleware';

/**
 * 获取当前用户上传的文件列表
 */
export async function GET(request: NextRequest) {
  // 速率限制检查
  const rateLimitResponse = await rateLimitMiddleware(request, { strategy: 'api' });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // 获取当前用户
    console.log('开始获取用户session...');
    const user = await getCurrentUser();
    console.log('获取到的用户:', user ? { id: user.id, email: user.email } : 'null');
    
    if (!user) {
      console.error('未找到用户session，返回401');
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    console.log('开始查询文件列表，用户ID:', user.id);
    
    // 获取查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);
    const skip = (page - 1) * limit;
    const search = searchParams.get('search') || '';
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // 构建查询条件
    const where: any = {
      uploadedBy: user.id, // 只查询当前用户上传的文件
    };

    // 搜索条件
    if (search) {
      where.AND = [
        { uploadedBy: user.id },
        {
          OR: [
            { originalName: { contains: search } },
            { objectKey: { contains: search } },
          ],
        },
      ];
      // 移除顶层的 uploadedBy，因为已经在 AND 中
      delete where.uploadedBy;
    }

    // 获取文件列表和总数
    console.log('查询条件:', JSON.stringify(where, null, 2));
    
    const [files, total] = await Promise.all([
      prisma.file.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          [sortBy]: sortOrder,
        },
        include: {
          tokens: {
            select: {
              id: true,
              status: true,
              usedAt: true,
            },
          },
        },
      }),
      prisma.file.count({ where }),
    ]);
    
    console.log(`查询结果: 找到 ${files.length} 个文件，总计 ${total} 个`);

    // 格式化文件数据
    const formattedFiles = files.map((file) => {
      const totalTokens = file.tokens.length;
      const usedTokens = file.tokens.filter((t) => t.status === 'used').length;
      const activeTokens = file.tokens.filter((t) => t.status === 'unused').length;

      return {
        id: file.id,
        objectKey: file.objectKey,
        originalName: file.originalName || file.objectKey.split('/').pop() || '未知文件',
        size: file.size,
        adminToken: file.adminToken,
        createdAt: file.createdAt,
        expiresAt: file.expiresAt,
        downloadCount: usedTokens,
        totalShares: totalTokens,
        activeShares: activeTokens,
        hasActiveShare: activeTokens > 0,
      };
    });

    return NextResponse.json({
      files: formattedFiles,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('获取文件列表错误:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    const errorStack = error instanceof Error ? error.stack : undefined;
    console.error('错误详情:', errorMessage);
    if (errorStack) {
      console.error('错误堆栈:', errorStack);
    }
    
    // 检查是否是 Prisma 错误
    if (error && typeof error === 'object' && 'code' in error) {
      console.error('Prisma 错误代码:', (error as any).code);
    }
    
    return NextResponse.json(
      { 
        error: '获取文件列表失败，请稍后重试', 
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined 
      },
      { status: 500 }
    );
  }
}
