import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey  = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Jika env vars belum diset, bypass middleware — jangan crash
  if (!supabaseUrl || !supabaseKey) {
    console.error('SIMBUBALADA: NEXT_PUBLIC_SUPABASE_URL atau NEXT_PUBLIC_SUPABASE_ANON_KEY belum diset')
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() { return request.cookies.getAll() },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  // Wrap in try/catch — jangan biarkan error Supabase crash seluruh app
  try {
    const { data: { user } } = await supabase.auth.getUser()

    const path = request.nextUrl.pathname
    const isAuthRoute   = path.startsWith('/login')
    const isApiRoute    = path.startsWith('/api')
    const isPublicAsset = path.startsWith('/_next') || path.includes('.')

    if (!user && !isAuthRoute && !isApiRoute && !isPublicAsset) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (user && isAuthRoute) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }
  } catch (error) {
    console.error('SIMBUBALADA Middleware error:', error)
    // Jika gagal, tetap lanjutkan request — jangan 500
  }

  return supabaseResponse
}
