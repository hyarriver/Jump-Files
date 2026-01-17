import { NextResponse } from 'next/server';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export function successResponse<T>(data: T, message?: string): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    message,
  });
}

export function errorResponse(error: string, status: number = 400): NextResponse<ApiResponse> {
  return NextResponse.json({
    success: false,
    error,
  }, { status });
}

export function handleApiError(error: unknown): NextResponse<ApiResponse> {
  console.error('API Error:', error);

  if (error instanceof Error) {
    // 數據庫錯誤
    if (error.message.includes('UNIQUE constraint failed')) {
      return errorResponse('數據重複，請檢查輸入', 409);
    }

    // 外鍵約束錯誤
    if (error.message.includes('FOREIGN KEY constraint failed')) {
      return errorResponse('關聯數據不存在', 400);
    }

    // 其他已知錯誤
    return errorResponse(error.message, 400);
  }

  return errorResponse('服務器內部錯誤', 500);
}