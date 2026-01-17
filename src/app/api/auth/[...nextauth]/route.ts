import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth';

// NextAuth in Next.js 16 App Router requires type assertion
const handler = (NextAuth as any)(authOptions);

export { handler as GET, handler as POST };