import { Client } from 'minio';
import { env } from '@/config/env';

// 解析MinIO端点，分离主机和端口
function parseMinIOEndpoint(endpoint: string): { host: string; port: number } {
  if (endpoint.includes(':')) {
    const [host, portStr] = endpoint.split(':');
    const port = parseInt(portStr, 10);
    return { host, port: isNaN(port) ? 9000 : port };
  }
  return { host: endpoint, port: 9000 };
}

const { host, port } = parseMinIOEndpoint(env.MINIO_ENDPOINT);

export const minioClient = new Client({
  endPoint: host,
  port: port,
  useSSL: false,
  accessKey: env.MINIO_ACCESS_KEY,
  secretKey: env.MINIO_SECRET_KEY,
});

/**
 * 確保存儲桶存在
 */
export async function ensureBucketExists(): Promise<void> {
  try {
    const bucketExists = await minioClient.bucketExists(env.MINIO_BUCKET_NAME);
    if (!bucketExists) {
      await minioClient.makeBucket(env.MINIO_BUCKET_NAME, 'us-east-1');
    }
  } catch (error) {
    console.error('MinIO bucket检查/创建失败:', error);
    throw new Error(`存储服务连接失败: ${error instanceof Error ? error.message : '未知错误'}`);
  }
}

/**
 * 生成唯一的對象鍵
 */
export function generateObjectKey(originalName: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop();
  return `${timestamp}-${random}.${extension}`;
}

/**
 * 獲取文件的下載URL
 */
export function getFileUrl(objectKey: string): string {
  const { host, port: minioPort } = parseMinIOEndpoint(env.MINIO_ENDPOINT);
  const protocol = host === 'localhost' || host === '127.0.0.1' ? 'http' : 'https';
  const portStr = minioPort === 9000 && host === 'localhost' ? ':9000' : (minioPort !== 80 && minioPort !== 443 ? `:${minioPort}` : '');
  return `${protocol}://${host}${portStr}/${env.MINIO_BUCKET_NAME}/${objectKey}`;
}