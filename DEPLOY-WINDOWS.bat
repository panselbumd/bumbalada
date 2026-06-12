@echo off
echo ============================================
echo  SIMBUMD - Deploy ke Vercel (Windows)
echo ============================================
echo.

REM Install Vercel CLI
echo [1/4] Install Vercel CLI...
npm install -g vercel

REM Set env vars - GANTI NILAI INI SESUAI SUPABASE ANDA
set NEXT_PUBLIC_SUPABASE_URL=GANTI_DENGAN_URL_SUPABASE_ANDA
set NEXT_PUBLIC_SUPABASE_ANON_KEY=GANTI_DENGAN_ANON_KEY_ANDA
set SUPABASE_SERVICE_ROLE_KEY=GANTI_DENGAN_SERVICE_ROLE_KEY_ANDA

echo [2/4] Install dependencies...
npm install --legacy-peer-deps

echo [3/4] Build project...
npm run build

echo [4/4] Deploy ke Vercel...
vercel --prod

echo.
echo ============================================
echo  SELESAI! Cek URL di atas untuk akses app
echo ============================================
pause
