import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { storage, generateObjectKey } from '@/lib/storage-unified';
import { generateDownloadToken } from '@/lib/token';
import { env } from '@/config/env';
import { rateLimitMiddleware } from '@/lib/middleware/rate-limit-middleware';
import { validateFileType } from '@/lib/file-validation';
import { getCurrentUser } from '@/lib/get-session';

export async function POST(request: NextRequest) {
  // 速率限制检查
  const rateLimitResponse = await rateLimitMiddleware(request, { strategy: 'upload' });
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // 检查请求体大小
    const contentLength = request.headers.get('content-length');
    if (contentLength) {
      const sizeInMB = parseInt(contentLength, 10) / (1024 * 1024);
      if (sizeInMB > env.MAX_FILE_SIZE_MB) {
        return NextResponse.json(
          { error: `文件大小不能超过 ${env.MAX_FILE_SIZE_MB}MB` },
          { status: 413 }
        );
      }
    }

    // 解析multipart/form-data
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (parseError) {
      console.error('FormData解析错误:', parseError);
      return NextResponse.json(
        { error: '文件上传失败：请求体解析错误。请检查文件大小是否超过限制（默认10MB）。如需上传更大文件，请配置Next.js的body大小限制。' },
        { status: 413 }
      );
    }
    
    const file = formData.get('file') as File;
    const expiresInDays = formData.get('expiresInDays'); // 过期天数（可选）
    const password = formData.get('password') as string | null; // 访问密码（可选）
    const maxDownloads = formData.get('maxDownloads'); // 最大下载次数（可选）

    if (!file) {
      return NextResponse.json(
        { error: '请选择要上传的文件' },
        { status: 400 }
      );
    }

    // 驗證文件大小
    const maxSize = env.MAX_FILE_SIZE_MB * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `文件大小不能超过 ${env.MAX_FILE_SIZE_MB}MB` },
        { status: 400 }
      );
    }

    // 验证文件类型
    const fileValidation = await validateFileType(file);
    if (!fileValidation.valid) {
      return NextResponse.json(
        { error: fileValidation.error || '不支持的文件类型' },
        { status: 400 }
      );
    }

    // 生成對象鍵
    const objectKey = generateObjectKey(file.name);

    // 將文件轉換為buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // 使用統一的存儲接口上傳文件
    try {
      await storage.upload(
        objectKey,
        buffer,
        file.type || 'application/octet-stream',
        file.name
      );
      console.log(`文件已上傳到 ${env.STORAGE_TYPE} 存儲`);
    } catch (storageError) {
      console.error('文件存儲失敗:', storageError);
      return NextResponse.json(
        { error: '文件存儲失敗，請檢查存儲配置' },
        { status: 500 }
      );
    }

    // 获取当前用户（如果已登录）
    const user = await getCurrentUser();

    // 生成管理token（用於查看下載審計）
    const adminToken = generateDownloadToken();

    // 计算过期时间（如果指定了过期天数）
    let expiresAt: Date | null = null;
    if (expiresInDays) {
      const days = parseInt(expiresInDays.toString(), 10);
      if (!isNaN(days) && days > 0) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);
      }
    }

    // 在數據庫中創建文件記錄
    let dbFile;
    try {
      dbFile = await prisma.file.create({
        data: {
          objectKey,
          size: file.size,
          adminToken,
          uploadedBy: user?.id || null,
          originalName: file.name,
          expiresAt,
        },
      });
    } catch (dbError) {
      console.error('数据库错误:', dbError);
      // 如果数据库失败，尝试删除已上传的文件
      try {
        await storage.delete(objectKey);
      } catch (cleanupError) {
        console.error('清理文件失败:', cleanupError);
      }
      return NextResponse.json(
        { error: '数据库操作失败' },
        { status: 500 }
      );
    }

    // 生成一次性下載token
    const downloadToken = generateDownloadToken();

    // 創建token記錄
    try {
      await prisma.downloadToken.create({
        data: {
          token: downloadToken,
          fileId: dbFile.id,
          password: password || null,
          maxDownloads: maxDownloads ? parseInt(maxDownloads.toString(), 10) : null,
          downloadCount: 0,
        },
      });
    } catch (tokenError) {
      console.error('Token创建错误:', tokenError);
      return NextResponse.json(
        { error: '创建下载令牌失败' },
        { status: 500 }
      );
    }

    // 生成分享鏈接 - 從請求頭動態獲取域名，適應不同環境
    const host = request.headers.get('host') || '';
    const protocol = request.headers.get('x-forwarded-proto') || 
                     (host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https');
    const baseUrl = env.NEXTAUTH_URL || `${protocol}://${host}`;
    
    const shareUrl = `${baseUrl}/download/${downloadToken}`;
    const adminUrl = `${baseUrl}/audit/${adminToken}`;

    return NextResponse.json({
      shareUrl,
      adminUrl,
      token: downloadToken,
      adminToken,
      fileId: dbFile.id,
    });
  } catch (error) {
    console.error('上传错误:', error);
    const errorMessage = error instanceof Error ? error.message : '上传失败，请稍后重试';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// Next.js 16 API配置已移除，文件大小限制通过环境变量控制