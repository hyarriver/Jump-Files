import { NextResponse } from 'next/server';
import { checkEnvironment } from '@/lib/env-check';

export async function GET() {
  // 只在開發環境提供此API
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ isValid: true, errors: [] });
  }

  const status = checkEnvironment();
  return NextResponse.json(status);
}