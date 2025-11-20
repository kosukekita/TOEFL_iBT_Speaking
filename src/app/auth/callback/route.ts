import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  console.log('[Auth Callback] Received request:', requestUrl.href);
  console.log('[Auth Callback] Code:', code);

  if (code) {
    try {
      const cookieStore = await cookies();
      const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      
      if (error) {
        console.error('[Auth Callback] Error exchanging code:', error);
        return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin));
      }
      
      console.log('[Auth Callback] Session created successfully:', data.session?.user?.email);
    } catch (error) {
      console.error('[Auth Callback] Exception:', error);
      return NextResponse.redirect(new URL('/login?error=exception', requestUrl.origin));
    }
  }

  console.log('[Auth Callback] Redirecting to home');
  return NextResponse.redirect(new URL('/', requestUrl.origin));
}

