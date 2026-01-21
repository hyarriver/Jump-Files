import * as fs from 'fs/promises';
import * as path from 'path';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

/**
 * 确保上传目录存在
 */
async function ensureUploadDir(): Promise<void> {
  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
  } catch (error) {
    console.error('创建上传目录失败:', error);
    throw new Error('无法创建上传目录');
  }
}

/**
 * 保存文件到本地文件系统（开发模式）
 */
export async function saveFileToLocal(buffer: Buffer, objectKey: string): Promise<void> {
  await ensureUploadDir();
  const filePath = path.join(UPLOAD_DIR, objectKey);
  await fs.writeFile(filePath, buffer);
}

/**
 * 从本地文件系统读取文件（开发模式）
 */
export async function readFileFromLocal(objectKey: string): Promise<Buffer> {
  const filePath = path.join(UPLOAD_DIR, objectKey);
  return await fs.readFile(filePath);
}

/**
 * 检查文件是否存在（开发模式）
 */
export async function fileExistsLocal(objectKey: string): Promise<boolean> {
  try {
    const filePath = path.join(UPLOAD_DIR, objectKey);
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * 获取本地文件URL（开发模式）
 */
export function getLocalFileUrl(objectKey: string): string {
  return `/api/files/${objectKey}`;
}