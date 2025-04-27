import { NextResponse } from 'next/server';

export type ErrorResponse = {
  success: false;
  error: string;
  code?: string;
  details?: any;
};

export type SuccessResponse<T> = {
  success: true;
  data: T;
};

export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;

/**
 * Creates a standardized error response for API routes
 */
export function createErrorResponse(
  message: string, 
  status: number = 400, 
  code?: string,
  details?: any
): NextResponse<ErrorResponse> {
  console.error(`API Error: ${message}`, details);
  
  return NextResponse.json(
    {
      success: false,
      error: message,
      code,
      ...(details && { details: process.env.NODE_ENV === 'development' ? details : undefined })
    },
    { status }
  );
}

/**
 * Creates a standardized success response for API routes
 */
export function createSuccessResponse<T>(data: T, status: number = 200): NextResponse<SuccessResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data
    },
    { status }
  );
}

/**
 * Safely handles an API request, catching any errors
 */
export async function safelyHandleRequest<T>(
  handler: () => Promise<T>,
): Promise<NextResponse<ApiResponse<T>>> {
  try {
    const result = await handler();
    return createSuccessResponse(result);
  } catch (error: any) {
    const message = error?.message || 'An unexpected error occurred';
    const status = error?.status || 500;
    return createErrorResponse(message, status, error?.code, error);
  }
}

/**
 * Wraps an error in a consistent format for client-side error handling
 */
export class AppError extends Error {
  status: number;
  code?: string;
  
  constructor(message: string, status: number = 400, code?: string) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
  }
}

/**
 * Safely handle client-side errors - returns null if there's an error
 */
export async function safelyFetch<T>(
  url: string, 
  options?: RequestInit
): Promise<T | null> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API request failed:', {
        status: response.status,
        url,
        error: errorData
      });
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    return null;
  }
} 