/**
 * API速率限制工具
 * 支持内存和Redis两种模式
 */

// 速率限制配置
interface RateLimitConfig {
  limit: number; // 请求次数
  window: number; // 时间窗口（秒）
}

// 预定义的速率限制策略
export const RATE_LIMIT_STRATEGIES = {
  // 上传：10次/分钟
  upload: { limit: 10, window: 60 } as RateLimitConfig,
  // 下载：30次/分钟
  download: { limit: 30, window: 60 } as RateLimitConfig,
  // 注册：5次/小时
  register: { limit: 5, window: 3600 } as RateLimitConfig,
  // 登录：10次/分钟
  login: { limit: 10, window: 60 } as RateLimitConfig,
  // 审计查询：20次/分钟
  audit: { limit: 20, window: 60 } as RateLimitConfig,
  // 通用API：60次/分钟
  api: { limit: 60, window: 60 } as RateLimitConfig,
} as const;

// 内存存储（用于开发环境或没有Redis时）
class MemoryStore {
  private store: Map<string, { count: number; resetAt: number }> = new Map();

  async increment(key: string, window: number): Promise<{ count: number; resetAt: number }> {
    const entry = this.store.get(key);
    const now = Date.now();
    
    if (!entry || now > entry.resetAt) {
      // 创建新条目或重置过期条目
      const resetAt = now + window * 1000;
      this.store.set(key, { count: 1, resetAt });
      
      // 清理过期条目
      setTimeout(() => {
        this.store.delete(key);
      }, window * 1000);
      
      return { count: 1, resetAt };
    }
    
    // 增加计数
    entry.count++;
    return { count: entry.count, resetAt: entry.resetAt };
  }

  async get(key: string): Promise<{ count: number; resetAt: number } | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    
    // 如果已过期，删除并返回null
    if (Date.now() > entry.resetAt) {
      this.store.delete(key);
      return null;
    }
    
    return entry;
  }
}

// 全局内存存储实例
let memoryStore: MemoryStore | null = null;

// Upstash Redis支持（可选）
let upstashRedis: any = null;

async function initUpstashRedis() {
  if (upstashRedis) {
    return upstashRedis;
  }

  const upstashRedisUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashRedisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashRedisUrl && upstashRedisToken) {
    try {
      const { Redis } = await import('@upstash/redis');
      upstashRedis = new Redis({
        url: upstashRedisUrl,
        token: upstashRedisToken,
      });
      return upstashRedis;
    } catch (error) {
      console.warn('Failed to initialize Upstash Redis, falling back to memory store:', error);
    }
  }

  return null;
}

/**
 * 检查速率限制
 * @param identifier 标识符（IP地址或用户ID）
 * @param strategy 速率限制策略
 * @returns 是否允许请求
 */
export async function checkRateLimit(
  identifier: string,
  strategy: keyof typeof RATE_LIMIT_STRATEGIES
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  const config = RATE_LIMIT_STRATEGIES[strategy];
  const key = `ratelimit:${strategy}:${identifier}`;
  
  // 尝试使用Upstash Redis
  const redis = await initUpstashRedis();
  
  if (redis) {
    try {
      // 使用滑动窗口算法
      const now = Date.now();
      const windowStart = now - config.window * 1000;
      
      // 获取当前计数
      const count = await redis.zcount(key, windowStart, now);
      
      if (count >= config.limit) {
        // 获取最早的条目以计算重置时间
        const oldest = await redis.zrange(key, 0, 0, { withScores: true });
        const reset = oldest.length > 0 ? oldest[0].score + config.window * 1000 : now + config.window * 1000;
        
        return {
          allowed: false,
          remaining: 0,
          reset: Math.ceil(reset),
        };
      }
      
      // 添加当前请求
      await redis.zadd(key, { score: now, member: `${now}-${Math.random()}` });
      // 设置过期时间
      await redis.expire(key, config.window);
      
      return {
        allowed: true,
        remaining: config.limit - count - 1,
        reset: now + config.window * 1000,
      };
    } catch (error) {
      console.error('Redis rate limit error, falling back to memory:', error);
      // 回退到内存存储
    }
  }
  
  // 使用内存存储
  if (!memoryStore) {
    memoryStore = new MemoryStore();
  }
  
  const result = await memoryStore.increment(key, config.window);
  const remaining = Math.max(0, config.limit - result.count);
  
  return {
    allowed: result.count <= config.limit,
    remaining,
    reset: result.resetAt,
  };
}

/**
 * 从请求中获取标识符（优先使用用户ID，否则使用IP）
 */
export function getRateLimitIdentifier(request: Request): string {
  // 尝试从请求头获取用户ID（如果已认证）
  const userId = request.headers.get('x-user-id');
  if (userId) {
    return `user:${userId}`;
  }
  
  // 使用IP地址
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  return `ip:${ip}`;
}
