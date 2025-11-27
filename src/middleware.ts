import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    try {
        // ✅ 로그인 및 인증 페이지는 미들웨어를 건너뛰기
        if (request.nextUrl.pathname.startsWith('/login') ||
            request.nextUrl.pathname.startsWith('/auth') ||
            request.nextUrl.pathname.startsWith('/api')) {
            return NextResponse.next();
        }

        // ✅ 환경 변수 체크
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
            console.warn('[Middleware] Supabase environment variables not set');
            return NextResponse.next();
        }

        let response = NextResponse.next({
            request: {
                headers: request.headers,
            },
        });

        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return request.cookies.getAll();
                    },
                    setAll(cookiesToSet) {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            request.cookies.set(name, value)
                        );
                        response = NextResponse.next({
                            request: {
                                headers: request.headers,
                            },
                        });
                        cookiesToSet.forEach(({ name, value, options }) =>
                            response.cookies.set(name, value, options)
                        );
                    },
                },
            }
        );

        // ✅ 타임아웃 추가하여 무한 대기 방지
        let user = null;
        try {
            const getUserPromise = supabase.auth.getUser();
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Timeout')), 10000); // 10초 타임아웃으로 증가
            });

            const result = await Promise.race([getUserPromise, timeoutPromise]) as { data: { user: any } };
            user = result?.data?.user || null;
        } catch (error) {
            // 타임아웃이나 다른 에러 발생 시 로그를 남기고, 
            // 🚨 중요: 무조건 리다이렉트하지 않고, 클라이언트 측에서 다시 확인하도록 허용할 수도 있음.
            // 하지만 보안을 위해 일단은 타임아웃만 늘리고, 여전히 실패 시 리다이렉트 유지 (또는 정책 변경 가능)
            // 여기서는 "타임아웃 = 인증 실패"로 간주하되 시간을 늘림.
            console.warn('[Middleware] Auth check failed or timeout:', error instanceof Error ? error.message : 'Unknown error');
        }

        // If user is not signed in, redirect the user to /login
        if (!user) {
            return NextResponse.redirect(new URL('/login', request.url));
        }

        return response;
    } catch (error) {
        // ✅ 에러 발생 시 로그만 남기고 요청 허용
        console.error('[Middleware] Error:', error);
        return NextResponse.next();
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - api (API routes)
         * Feel free to modify this pattern to include more paths.
         */
        '/((?!_next/static|_next/image|favicon.ico|api).*)',
    ],
};
