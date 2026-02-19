import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(req: NextRequest) {
    // Check if Basic Auth is enabled via environment variables
    const basicAuthUser = process.env.BASIC_AUTH_USER;
    const basicAuthPassword = process.env.BASIC_AUTH_PASSWORD;

    if (!basicAuthUser || !basicAuthPassword) {
        return NextResponse.next();
    }

    const authorizationHeader = req.headers.get('authorization');

    if (authorizationHeader) {
        const basicAuth = authorizationHeader.split(' ')[1];
        const [user, password] = atob(basicAuth).split(':');

        if (user === basicAuthUser && password === basicAuthPassword) {
            return NextResponse.next();
        }
    }

    return new NextResponse('Authentication required', {
        status: 401,
        headers: {
            'WWW-Authenticate': 'Basic realm="Secure Area"',
        },
    });
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         */
        '/((?!api|_next/static|_next/image|favicon.ico).*)',
    ],
}
