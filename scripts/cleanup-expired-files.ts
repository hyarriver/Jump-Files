/**
 * 清理过期文件的脚本
 * 可以通过定时任务（cron）或手动运行
 * 
 * 使用方法：
 * 1. 手动运行：npx tsx scripts/cleanup-expired-files.ts
 * 2. 定时任务：配置cron定期运行此脚本
 */

import { PrismaClient } from '@prisma/client';
import { storage } from '../src/lib/storage-unified';

const prisma = new PrismaClient();

async function cleanupExpiredFiles() {
  console.log('开始清理过期文件...');
  const now = new Date();
  
  try {
    // 查找所有过期文件
    const expiredFiles = await prisma.file.findMany({
      where: {
        expiresAt: {
          not: null,
          lte: now,
        },
      },
      include: {
        tokens: true,
      },
    });

    console.log(`找到 ${expiredFiles.length} 个过期文件`);

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
            console.log(`已删除文件: ${file.objectKey}`);
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

    console.log(`清理完成: 成功删除 ${deletedCount} 个文件，失败 ${errorCount} 个`);
    
    return {
      success: true,
      deletedCount,
      errorCount,
      totalExpired: expiredFiles.length,
    };
  } catch (error) {
    console.error('清理过期文件错误:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  cleanupExpiredFiles()
    .then((result) => {
      console.log('清理结果:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('清理失败:', error);
      process.exit(1);
    });
}

export { cleanupExpiredFiles };
