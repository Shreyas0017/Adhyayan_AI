import { NextRequest, NextResponse } from 'next/server';

// API route handler that redirects to Civic Auth
export async function GET(request: NextRequest) {
  try {
    // Get client ID from environment variables
    const clientId = process.env.NEXT_PUBLIC_CIVIC_CLIENT_ID || '937a64d7-2299-4dac-9620-5e2614ad615b';
    
    // Get the base URL from environment to ensure consistency
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
    
    // Get the redirect URI from query params or default to the confirmation page
    const { searchParams } = new URL(request.url);
    const redirectUri = searchParams.get('redirect_uri') || `${baseUrl}/confirm`;
    
    // Construct the callback URL - must match exactly what's in Civic dashboard
    const callbackUrl = `${baseUrl}/api/auth/civicauth/callback`;
    
    // Build the Civic Auth URL
    const civicLoginUrl = `https://auth.civic.com/login?client_id=${clientId}&redirect_uri=${encodeURIComponent(callbackUrl)}`;
    
    console.log(`🔐 Civic Auth Details:`);
    console.log(`   Client ID: ${clientId}`);
    console.log(`   Base URL: ${baseUrl}`);
    console.log(`   Callback URL: ${callbackUrl}`);
    console.log(`   Full Civic URL: ${civicLoginUrl}`);
    
    // Return a redirect response
    return NextResponse.redirect(civicLoginUrl);
  } catch (error) {
    console.error('Error initiating Civic Auth:', error);
    
    // Redirect to error page on failure
    return NextResponse.redirect(`${new URL(request.url).origin}/confirm?error=auth_failed`);
  }
}
