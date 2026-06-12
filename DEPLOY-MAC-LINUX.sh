#!/bin/bash
echo "============================================"
echo " SIMBUMD - Deploy ke Vercel (Mac/Linux)"
echo "============================================"

# Install Vercel CLI
echo "[1/4] Install Vercel CLI..."
npm install -g vercel

echo "[2/4] Install dependencies..."
npm install --legacy-peer-deps

echo "[3/4] Build project..."
export NEXT_PUBLIC_SUPABASE_URL="GANTI_DENGAN_URL_SUPABASE_ANDA"
export NEXT_PUBLIC_SUPABASE_ANON_KEY="GANTI_DENGAN_ANON_KEY_ANDA"
export SUPABASE_SERVICE_ROLE_KEY="GANTI_DENGAN_SERVICE_ROLE_KEY_ANDA"
npm run build

echo "[4/4] Deploy ke Vercel..."
vercel --prod

echo "============================================"
echo " SELESAI! Cek URL di atas untuk akses app"
echo "============================================"
