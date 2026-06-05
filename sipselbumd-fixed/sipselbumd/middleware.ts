// ============================================================
// SIPSELBUMD — Middleware (RBAC + Auth)
// ============================================================

import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Role → allowed path prefixes
const ROLE_PATHS: Record<string, string[]> = {
  peserta: ['/peserta'],
  panitia: ['/panitia'],
  ukk:     ['/ukk'],
  admin:   ['/admin', '/panitia', '/ukk'],   // admin can access all panels
}

// Paths that don't need authentication
const PUBLIC_PATHS = [
  '/', '/login', '/daftar', '/lupa-sandi',
  '/pengumuman', '/jadwal', '/tahapan', '/persyaratan',
  '/tentang', '/dasar-hukum', '/faq', '/kontak',
  '/callback', '/verifikasi',
  '/api/',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow public paths and static assets
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p)) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')

  const response = NextResponse.next({
    request: { headers: request.headers },
  })

  // Build Supabase SSR client
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Get session
  const { data: { session } } = await supabase.auth.getSession()

  // No session + protected path → redirect to login
  if (!session && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirect', pathname)
    return NextResponse.redirect(url)
  }

  // Has session — check role authorization
  if (session) {
    const { data: user } = await supabase
      .from('users')
      .select('role, is_active')
      .eq('id', session.user.id)
      .single()

    // Inactive account → logout redirect
    if (user && !user.is_active) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('error', 'inactive')
      return NextResponse.redirect(url)
    }

    const role = user?.role as string | undefined

    // Check if trying to access a role-restricted path
    if (role && !isPublic) {
      const allowedPaths = ROLE_PATHS[role] ?? []
      const isProtectedPath = Object.values(ROLE_PATHS).flat().some(p => pathname.startsWith(p))

      if (isProtectedPath) {
        const isAllowed = allowedPaths.some(p => pathname.startsWith(p))
        if (!isAllowed) {
          // Redirect to own dashboard
          const url = request.nextUrl.clone()
          url.pathname = `/${role}/dashboard`
          return NextResponse.redirect(url)
        }
      }
    }

    // Redirect authenticated user away from auth pages
    if (session && (pathname === '/login' || pathname === '/daftar')) {
      const url = request.nextUrl.clone()
      url.pathname = `/${role ?? 'peserta'}/dashboard`
      return NextResponse.redirect(url)
    }
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
