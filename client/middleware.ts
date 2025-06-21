import { NextRequest, NextResponse } from 'next/server';

// Simple middleware - no authentication blocking
// Firebase handles auth globally, Civic is only for wallet connection in confirm page
export function middleware(request: NextRequest) {
  // Let all requests through - no blocking
  return NextResponse.next();
}

export const config = {
  // Don't run middleware on any routes - let everything through
  matcher: [],
}
