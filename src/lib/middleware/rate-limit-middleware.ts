/**
 * 速率限制中间件
 */
import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getRateLimitIdentifier } from '@/lib/rate-limit';

export interface RateLimitOptions {
  strategy: 'upload' | 'download' | 'register' | 'login' | 'audit' | 'api';
}

/**
 * 速率限制中间件
 */
export async function rateLimitMiddleware(
  request: NextRequest,
  options: RateLimitOptions
): Promise<NextResponse | null> {
  const identifier = getRateLimitIdentifier(request);
  const result = await checkRateLimit(identifier, options.strategy);

  if (!result.allowed) {
    const resetDate = new Date(result.reset);
    const retryAfter = Math.ceil((result.reset - Date.now()) / 1000);

    return NextResponse.json(
      {
        error: '请求过于频繁，请稍后再试',
        retryAfter,
        resetAt: resetDate.toISOString(),
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': '60',
          'X-RateLimit-Remaining': result.remaining.toString(),
          'X-RateLimit-Reset': result.reset.toString(),
        },
      }
    );
  }

  // 返回null表示通过，继续处理请求
  return null;
}
