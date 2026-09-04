import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string
  ) {
    super(message);
  }
}

export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return;
  const expected = new URL(request.url).origin;
  if (origin !== expected) throw new AppError(403, 'INVALID_ORIGIN', 'Request origin is not allowed');
}

export function jsonError(error: unknown) {
  if (error instanceof AppError) {
    return NextResponse.json({ error: error.code, message: error.message }, { status: error.status });
  }
  if (error instanceof ZodError) {
    return NextResponse.json({ error: 'INVALID_REQUEST', issues: error.issues }, { status: 400 });
  }
  console.error(error);
  return NextResponse.json({ error: 'INTERNAL_ERROR', message: 'Something went wrong' }, { status: 500 });
}
