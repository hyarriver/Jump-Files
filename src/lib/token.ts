import { randomBytes } from 'crypto';

/**
 * 生成一次性下載token
 * 使用高熵隨機字符串以避免碰撞
 */
export function generateDownloadToken(): string {
  // 生成32字節的隨機數據，轉換為64字符的十六進制字符串
  return randomBytes(32).toString('hex');
}

/**
 * 驗證token格式（基本的長度檢查）
 */
export function isValidTokenFormat(token: string): boolean {
  // 檢查是否為64字符的十六進制字符串
  return /^[a-f0-9]{64}$/.test(token);
}