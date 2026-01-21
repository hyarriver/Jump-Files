import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { storage } from '@/lib/storage-unified';
import { isValidTokenFormat } from '@/lib/token';
import { env } from '@/config/env';
import { rateLimitMiddleware } from '@/lib/middleware/rate-limit-middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  // 速率限制检查
  const rateLimitResponse = await rateLimitMiddleware(request, { strategy: 'download' });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    const { token } = await params;
    const { userId, password } = await request.json();

    // 驗證輸入
    if (!userId) {
      return NextResponse.json(
        { error: '用戶ID為必填項' },
        { status: 400 }
      );
    }

    // 基本格式驗證
    if (!isValidTokenFormat(token)) {
      return NextResponse.json(
        { error: '無效的token格式' },
        { status: 400 }
      );
    }

    // 使用事務確保數據一致性
    const result = await prisma.$transaction(async (tx) => {
      // 查詢並鎖定token記錄
      const tokenRecord = await tx.downloadToken.findUnique({
        where: { token },
        include: {
          file: true,
        },
      });

      if (!tokenRecord) {
        throw new Error('鏈接不存在或已失效');
      }

      // 驗證密碼（如果設置了密碼）
      if (tokenRecord.password) {
        if (!password || tokenRecord.password !== password) {
          throw new Error('密碼錯誤');
        }
      }

      // 檢查訪問次數限制
      if (tokenRecord.maxDownloads !== null) {
        if (tokenRecord.downloadCount >= tokenRecord.maxDownloads) {
          throw new Error('已達到最大下載次數限制');
        }
      }

      // 檢查是否已使用（一次性鏈接）
      if (tokenRecord.status === 'used' && tokenRecord.maxDownloads === null) {
        throw new Error('此鏈接已被使用，無法再次下載');
      }

      // 更新下載計數和狀態
      const newDownloadCount = (tokenRecord.downloadCount || 0) + 1;
      const shouldMarkAsUsed = tokenRecord.maxDownloads === null || newDownloadCount >= (tokenRecord.maxDownloads || 0);

      await tx.downloadToken.update({
        where: { token },
        data: {
          status: shouldMarkAsUsed ? 'used' : tokenRecord.status,
          downloadCount: newDownloadCount,
          usedBy: userId,
          usedAt: new Date(),
        },
      });

      return tokenRecord.file;
    });

    // 使用統一的存儲接口生成文件下載URL
    const downloadUrl = storage.getUrl(result.objectKey);
    
    // 如果 URL 是相對路徑，轉換為絕對路徑 - 從請求頭動態獲取域名
    let fullUrl = downloadUrl;
    if (!downloadUrl.startsWith('http')) {
      const host = request.headers.get('host') || '';
      const protocol = request.headers.get('x-forwarded-proto') || 
                       (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https');
      const baseUrl = env.NEXTAUTH_URL || `${protocol}://${host}`;
      fullUrl = `${baseUrl}${downloadUrl}`;
    }

    // 返回下載URL（前端將使用此URL觸發下載）
    return new Response(fullUrl, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    console.error('下載錯誤:', error);
    const message = error instanceof Error ? error.message : '下載失敗，請稍後再試';
    return NextResponse.json(
      { error: message },
      { status: 400 }
    );
  }
}