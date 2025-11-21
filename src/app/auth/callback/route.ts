import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  console.log('[Auth Callback] Received request:', requestUrl.href);
  console.log('[Auth Callback] Code:', code);
  console.log('[Auth Callback] Error:', error);
  console.log('[Auth Callback] Error Description:', errorDescription);

  // Handle OAuth errors
  if (error) {
    console.error('[Auth Callback] OAuth error:', error, errorDescription);
    return NextResponse.redirect(
      new URL(`/login?error=auth_failed&message=${encodeURIComponent(errorDescription || error)}`, requestUrl.origin)
    );
  }

  if (!code) {
    console.warn('[Auth Callback] No code parameter found');
    return NextResponse.redirect(new URL('/login?error=no_code', requestUrl.origin));
  }

  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch (err) {
              console.error('[Auth Callback] Error setting cookies:', err);
              // The `setAll` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
            }
          },
        },
      }
    );
    
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (exchangeError) {
      console.error('[Auth Callback] Error exchanging code:', exchangeError);
      return NextResponse.redirect(
        new URL(`/login?error=auth_failed&message=${encodeURIComponent(exchangeError.message)}`, requestUrl.origin)
      );
    }
    
    if (!data.session) {
      console.error('[Auth Callback] No session created');
      return NextResponse.redirect(new URL('/login?error=no_session', requestUrl.origin));
    }
    
    console.log('[Auth Callback] Session created successfully:', data.session.user?.email);
    
    // Redirect to home page
    const response = NextResponse.redirect(new URL('/', requestUrl.origin));
    return response;
  } catch (error: any) {
    console.error('[Auth Callback] Exception:', error);
    return NextResponse.redirect(
      new URL(`/login?error=exception&message=${encodeURIComponent(error.message || 'Unknown error')}`, requestUrl.origin)
    );
  }
}

