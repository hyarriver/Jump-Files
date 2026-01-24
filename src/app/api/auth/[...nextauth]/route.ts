import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';
import { env } from '@/config/env';

// 確保 NextAuth 能讀取到 NEXTAUTH_URL，避免 [NEXTAUTH_URL] 警告
if (!process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = env.NEXTAUTH_URL;
}

// NextAuth in Next.js 16 App Router requires type assertion
const handler = (NextAuth as any)(authOptions);

export { handler as GET, handler as POST };