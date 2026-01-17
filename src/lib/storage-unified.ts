/**
 * 統一的存儲接口，支持多種存儲後端（R2、MinIO、本地）
 */
import { env } from '@/config/env';
import * as R2Storage from './storage-r2';
import { minioClient, ensureBucketExists, generateObjectKey as minioGenerateKey } from './storage';
import { saveFileToLocal, readFileFromLocal, fileExistsLocal } from './storage-dev';

export interface StorageAdapter {
  upload(objectKey: string, buffer: Buffer, contentType: string, originalFileName: string): Promise<void>;
  get(objectKey: string): Promise<Buffer | null>;
  exists(objectKey: string): Promise<boolean>;
  delete(objectKey: string): Promise<void>;
  getUrl(objectKey: string): string;
}

class R2StorageAdapter implements StorageAdapter {
  async upload(objectKey: string, buffer: Buffer, contentType: string, originalFileName: string): Promise<void> {
    await R2Storage.ensureR2BucketExists();
    await R2Storage.uploadToR2(objectKey, buffer, contentType, originalFileName);
  }

  async get(objectKey: string): Promise<Buffer | null> {
    const obj = await R2Storage.getFromR2(objectKey);
    if (!obj) return null;
    const arrayBuffer = await obj.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  async exists(objectKey: string): Promise<boolean> {
    return await R2Storage.existsInR2(objectKey);
  }

  async delete(objectKey: string): Promise<void> {
    await R2Storage.deleteFromR2(objectKey);
  }

  getUrl(objectKey: string): string {
    return R2Storage.getR2FileUrl(objectKey, env.NEXTAUTH_URL);
  }
}

class MinIOStorageAdapter implements StorageAdapter {
  async upload(objectKey: string, buffer: Buffer, contentType: string, originalFileName: string): Promise<void> {
    await ensureBucketExists();
    await minioClient.putObject(
      env.MINIO_BUCKET_NAME,
      objectKey,
      buffer,
      buffer.length,
      {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${originalFileName}"`,
      }
    );
  }

  async get(objectKey: string): Promise<Buffer | null> {
    try {
      const stream = await minioClient.getObject(env.MINIO_BUCKET_NAME, objectKey);
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      if ((error as any)?.code === 'NoSuchKey') {
        return null;
      }
      throw error;
    }
  }

  async exists(objectKey: string): Promise<boolean> {
    try {
      await minioClient.statObject(env.MINIO_BUCKET_NAME, objectKey);
      return true;
    } catch {
      return false;
    }
  }

  async delete(objectKey: string): Promise<void> {
    await minioClient.removeObject(env.MINIO_BUCKET_NAME, objectKey);
  }

  getUrl(objectKey: string): string {
    const { host, port } = parseMinIOEndpoint(env.MINIO_ENDPOINT);
    const protocol = host === 'localhost' || host === '127.0.0.1' ? 'http' : 'https';
    const portStr = port === 9000 && host === 'localhost' ? ':9000' : (port !== 80 && port !== 443 ? `:${port}` : '');
    return `${protocol}://${host}${portStr}/${env.MINIO_BUCKET_NAME}/${objectKey}`;
  }
}

function parseMinIOEndpoint(endpoint: string): { host: string; port: number } {
  if (endpoint.includes(':')) {
    const [host, portStr] = endpoint.split(':');
    const port = parseInt(portStr, 10);
    return { host, port: isNaN(port) ? 9000 : port };
  }
  return { host: endpoint, port: 9000 };
}

class LocalStorageAdapter implements StorageAdapter {
  async upload(objectKey: string, buffer: Buffer, contentType: string, originalFileName: string): Promise<void> {
    await saveFileToLocal(buffer, objectKey);
  }

  async get(objectKey: string): Promise<Buffer | null> {
    try {
      return await readFileFromLocal(objectKey);
    } catch {
      return null;
    }
  }

  async exists(objectKey: string): Promise<boolean> {
    return await fileExistsLocal(objectKey);
  }

  async delete(objectKey: string): Promise<void> {
    // 本地存儲刪除實現（可選）
    throw new Error('本地存儲不支持刪除操作');
  }

  getUrl(objectKey: string): string {
    return `${env.NEXTAUTH_URL}/api/files/${objectKey}`;
  }
}

// 根據環境變數選擇存儲適配器
function getStorageAdapter(): StorageAdapter {
  const storageType = env.STORAGE_TYPE;

  if (storageType === 'r2') {
    return new R2StorageAdapter();
  } else if (storageType === 'minio') {
    return new MinIOStorageAdapter();
  } else {
    return new LocalStorageAdapter();
  }
}

// 導出單例存儲適配器
export const storage = getStorageAdapter();

// 生成對象鍵
export function generateObjectKey(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  return `${timestamp}-${random}.${extension}`;
}
