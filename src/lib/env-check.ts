import { env } from '@/config/env';

export function checkEnvironment(): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 數據庫
  if (!env.DATABASE_URL) {
    errors.push('DATABASE_URL 環境變數未設置');
  }

  // NextAuth
  if (!env.NEXTAUTH_SECRET) {
    errors.push('NEXTAUTH_SECRET 環境變數未設置');
  }

  // MinIO
  if (!env.MINIO_ENDPOINT) {
    errors.push('MINIO_ENDPOINT 環境變數未設置');
  }
  if (!env.MINIO_ACCESS_KEY) {
    errors.push('MINIO_ACCESS_KEY 環境變數未設置');
  }
  if (!env.MINIO_SECRET_KEY) {
    errors.push('MINIO_SECRET_KEY 環境變數未設置');
  }
  if (!env.MINIO_BUCKET_NAME) {
    errors.push('MINIO_BUCKET_NAME 環境變數未設置');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}