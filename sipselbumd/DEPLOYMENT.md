# SIPSELBUMD — Panduan Deployment Lengkap

## Prerequisites
- Node.js 18+
- Git
- Akun GitHub
- Akun Supabase (supabase.com)
- Akun Vercel (vercel.com)

---

## 1. SETUP GITHUB

```bash
# Clone atau buat repository baru
git init sipselbumd
cd sipselbumd

# Push ke GitHub
git remote add origin https://github.com/USERNAME/sipselbumd.git
git branch -M main
git push -u origin main
```

**GitHub Secrets** (Settings → Secrets → Actions):
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_ACCESS_TOKEN
SUPABASE_PROJECT_ID
```

---

## 2. SETUP SUPABASE

### 2.1 Install Supabase CLI
```bash
npm install -g supabase
supabase login
```

### 2.2 Inisialisasi project
```bash
supabase init
supabase link --project-ref YOUR_PROJECT_REF
```

### 2.3 Jalankan migrations
```bash
# Development
supabase db push

# Atau jalankan SQL langsung di Supabase Studio
# Project → SQL Editor → paste file migrations
```

### 2.4 Setup Storage Bucket
Di Supabase Dashboard → Storage:
```
Nama bucket: sipselbumd-documents
Akses: Private (authenticated only)
```

RLS Storage Policy:
```sql
-- Allow authenticated users to upload their own documents
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'sipselbumd-documents'
  AND auth.role() = 'authenticated'
);

-- Allow users to read their own documents
CREATE POLICY "Users can read own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'sipselbumd-documents'
  AND auth.role() = 'authenticated'
);
```

### 2.5 Konfigurasi Auth
Di Supabase Dashboard → Authentication:
- Email: Enable
- Phone: Enable (opsional)
- Site URL: `https://sipselbumd.vercel.app`
- Redirect URLs: tambahkan URL produksi dan localhost

### 2.6 Environment Variables Supabase
```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
```

---

## 3. SETUP NEXT.JS PROJECT

```bash
# Buat project
npx create-next-app@latest sipselbumd \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --src-dir \
  --import-alias "@/*"

cd sipselbumd

# Install dependencies
npm install @supabase/supabase-js @supabase/ssr
npm install @tanstack/react-query
npm install zod react-hook-form @hookform/resolvers
npm install recharts
npm install jspdf jspdf-autotable
npm install qrcode react-qr-code
npm install xlsx file-saver
npm install date-fns
npm install lucide-react

# Install Shadcn/UI
npx shadcn@latest init
npx shadcn@latest add button card input table badge dialog
npx shadcn@latest add toast select textarea form label
npx shadcn@latest add dropdown-menu avatar progress tabs
npx shadcn@latest add alert separator skeleton
```

### package.json scripts
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "supabase:types": "supabase gen types typescript --project-id $SUPABASE_PROJECT_ID > src/types/database.types.ts",
    "supabase:push": "supabase db push",
    "supabase:reset": "supabase db reset"
  }
}
```

### next.config.ts
```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'sipselbumd.vercel.app'],
    },
  },
}

export default nextConfig
```

### tailwind.config.ts
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0F172A',
          foreground: '#F8FAFC',
        },
        secondary: {
          DEFAULT: '#1E40AF',
          foreground: '#FFFFFF',
        },
        accent: {
          DEFAULT: '#06B6D4',
          foreground: '#0F172A',
        },
        success: '#10B981',
        background: '#F8FAFC',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}

export default config
```

---

## 4. MIDDLEWARE RBAC

```typescript
// src/middleware.ts
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ROLE_ROUTES = {
  peserta:  ['/peserta'],
  panitia:  ['/panitia'],
  ukk:      ['/ukk'],
  admin:    ['/admin'],
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => request.cookies.get(n)?.value } }
  )

  const { data: { session } } = await supabase.auth.getSession()

  // Redirect unauthenticated users
  const protectedPaths = ['/peserta', '/panitia', '/ukk', '/admin']
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p))

  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (session) {
    const { data: user } = await supabase
      .from('users')
      .select('role')
      .eq('id', session.user.id)
      .single()

    const role = user?.role
    // Check role-route mismatch
    for (const [r, paths] of Object.entries(ROLE_ROUTES)) {
      if (r !== role && paths.some((p) => pathname.startsWith(p))) {
        return NextResponse.redirect(new URL(`/${role}/dashboard`, request.url))
      }
    }
  }

  return response
}

export const config = {
  matcher: ['/peserta/:path*', '/panitia/:path*', '/ukk/:path*', '/admin/:path*'],
}
```

---

## 5. DEPLOY KE VERCEL

### 5.1 Via Vercel CLI
```bash
npm i -g vercel
vercel login
vercel --prod
```

### 5.2 Via GitHub Integration
1. Buka vercel.com → New Project
2. Import dari GitHub repository sipselbumd
3. Framework: Next.js (auto-detected)
4. Tambahkan Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Deploy

### 5.3 GitHub Actions CI/CD
```yaml
# .github/workflows/deploy.yml
name: Deploy SIPSELBUMD

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run lint
      - run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'

  db-migrate:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: supabase/setup-cli@v1
        with: { version: latest }
      - run: supabase db push
        env:
          SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
          SUPABASE_DB_PASSWORD: ${{ secrets.SUPABASE_DB_PASSWORD }}
```

---

## 6. GENERATE SUPABASE TYPES

```bash
# Generate TypeScript types dari database
npx supabase gen types typescript \
  --project-id YOUR_PROJECT_ID \
  > src/types/database.types.ts
```

---

## 7. DEVELOPMENT LOCAL

```bash
# Clone repo
git clone https://github.com/USERNAME/sipselbumd.git
cd sipselbumd

# Install dependencies
npm install

# Copy env file
cp .env.example .env.local
# Edit .env.local dengan credentials Supabase Anda

# Jalankan Supabase local (opsional)
supabase start

# Jalankan dev server
npm run dev
# Buka http://localhost:3000
```

---

## 8. KEAMANAN PRODUKSI

### Checklist
- [ ] Environment variables tidak di-commit ke Git
- [ ] Supabase RLS aktif di semua tabel
- [ ] Storage bucket hanya accessible authenticated users
- [ ] Rate limiting diaktifkan di Supabase
- [ ] HTTPS enforced (Vercel default)
- [ ] Auth email confirmation diaktifkan
- [ ] Session timeout dikonfigurasi
- [ ] Audit log monitoring aktif
- [ ] Database backup otomatis (Supabase Pro)
- [ ] Error monitoring (Sentry) dikonfigurasi

### Supabase Security Settings
```
Authentication → Email:
  - Confirm email: ON
  - Secure email change: ON
  - Password min length: 12

Authentication → Sessions:
  - JWT expiry: 3600 (1 jam)
  - Refresh token rotation: ON
```
