/**
 * Cloudflare R2 存儲實現
 * R2 與 S3 API 兼容，但我們需要在 Cloudflare Workers 環境中使用綁定
 */

// 在 Cloudflare Workers 環境中，R2Bucket 類型通過綁定提供
export interface R2Bucket {
  get(key: string): Promise<R2ObjectBody | null>;
  put(key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob, options?: R2PutOptions): Promise<R2Object>;
  delete(key: string): Promise<void>;
  head(key: string): Promise<R2Object | null>;
}

export interface R2Object {
  key: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: Date;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

export interface R2ObjectBody extends R2Object {
  body: ReadableStream;
  bodyUsed: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
}

export interface R2PutOptions {
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
  onlyIf?: R2Conditional;
}

export interface R2HTTPMetadata {
  contentType?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  contentLanguage?: string;
  cacheControl?: string;
  cacheExpiry?: Date;
}

export interface R2Conditional {
  etagMatches?: string;
  etagDoesNotMatch?: string;
  uploadedBefore?: Date;
  uploadedAfter?: Date;
}

/**
 * 獲取 R2 Bucket（在 Cloudflare Workers 環境中）
 * 這應該通過 Cloudflare Workers 綁定提供
 * 
 * 在 Cloudflare Pages 中，R2 綁定通過環境變數傳遞
 * 需要使用 @cloudflare/next-on-pages 提供的工具來訪問
 */
export function getR2Bucket(): R2Bucket | null {
  // 在 Cloudflare Workers/Pages 環境中，R2 綁定通過環境變數或全局對象提供
  // 首先嘗試從環境變數獲取（通過 @cloudflare/next-on-pages）
  try {
    // @ts-ignore - process.env 在 Cloudflare Workers 中可能不可用
    if (typeof process !== 'undefined' && process.env?.R2_STORAGE) {
      // @ts-ignore
      return process.env.R2_STORAGE as R2Bucket;
    }
  } catch {}

  // 嘗試從全局對象獲取（Cloudflare Workers 環境）
  // @ts-ignore - R2_STORAGE 是 Cloudflare Workers 綁定
  if (typeof globalThis !== 'undefined') {
    // @ts-ignore
    const env = (globalThis as any).__env__ || (globalThis as any);
    if (env?.R2_STORAGE) {
      // @ts-ignore
      return env.R2_STORAGE as R2Bucket;
    }
    // 直接從 globalThis 訪問（某些環境）
    if ((globalThis as any).R2_STORAGE) {
      // @ts-ignore
      return (globalThis as any).R2_STORAGE as R2Bucket;
    }
  }
  
  return null;
}

/**
 * 確保 R2 存儲桶可用
 */
export async function ensureR2BucketExists(): Promise<void> {
  const bucket = getR2Bucket();
  if (!bucket) {
    throw new Error('R2 存儲桶不可用，請檢查 Cloudflare Workers 綁定配置');
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
 * 上傳文件到 R2
 */
export async function uploadToR2(
  objectKey: string,
  data: ArrayBuffer | Buffer | Uint8Array,
  contentType?: string,
  originalFileName?: string
): Promise<void> {
  const bucket = getR2Bucket();
  if (!bucket) {
    throw new Error('R2 存儲桶不可用');
  }

  // Convert to Uint8Array for Blob compatibility
  let uint8Array: Uint8Array;
  if (data instanceof Buffer) {
    uint8Array = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  } else if (data instanceof ArrayBuffer) {
    uint8Array = new Uint8Array(data);
  } else {
    uint8Array = data;
  }

  const blob = new Blob([uint8Array as BlobPart], { type: contentType || 'application/octet-stream' });

  await bucket.put(objectKey, blob, {
    httpMetadata: {
      contentType: contentType || 'application/octet-stream',
      contentDisposition: originalFileName
        ? `attachment; filename="${originalFileName}"`
        : undefined,
    },
  });
}

/**
 * 從 R2 獲取文件
 */
export async function getFromR2(objectKey: string): Promise<R2ObjectBody | null> {
  const bucket = getR2Bucket();
  if (!bucket) {
    throw new Error('R2 存儲桶不可用');
  }

  return await bucket.get(objectKey);
}

/**
 * 檢查文件是否存在於 R2
 */
export async function existsInR2(objectKey: string): Promise<boolean> {
  const bucket = getR2Bucket();
  if (!bucket) {
    return false;
  }

  const obj = await bucket.head(objectKey);
  return obj !== null;
}

/**
 * 從 R2 刪除文件
 */
export async function deleteFromR2(objectKey: string): Promise<void> {
  const bucket = getR2Bucket();
  if (!bucket) {
    throw new Error('R2 存儲桶不可用');
  }

  await bucket.delete(objectKey);
}

/**
 * 獲取文件 URL（R2 公開 URL，如果配置了公開訪問）
 * 注意：在 Cloudflare Pages 中，通常通過 Workers 綁定訪問 R2
 * 如果需要公開 URL，需要配置 R2 公開訪問或使用 Workers 代理
 */
export function getR2FileUrl(objectKey: string, baseUrl?: string): string {
  // 如果有自定義基 URL（例如通過 Workers 路由）
  if (baseUrl) {
    return `${baseUrl}/${objectKey}`;
  }
  
  // 在 Cloudflare Pages 中，通常通過 API 路由提供文件
  // 返回相對路徑，由 API 路由處理
  return `/api/files/${objectKey}`;
}
