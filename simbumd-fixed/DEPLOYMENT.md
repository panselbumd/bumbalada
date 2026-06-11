# Panduan Deployment SIMBUMD ke Vercel + Supabase

## 1. Supabase — Setup Database

### Jalankan SQL Migration (aman dijalankan ulang)

Buka **Supabase Dashboard → SQL Editor** dan jalankan file:
```
supabase/migrations/001_initial_schema.sql
```

> ✅ Migration sudah diperbaiki menggunakan `IF NOT EXISTS` dan `DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL END $$`
> sehingga **aman dijalankan berkali-kali** tanpa error `type "user_role" already exists`.

### Aktifkan Storage Buckets (opsional)

Di Supabase Dashboard → Storage, buat dua bucket:
- `dokumen-peserta` (private)
- `foto-profil` (public)

---

## 2. Vercel — Environment Variables

Di **Vercel Dashboard → Project → Settings → Environment Variables**, tambahkan:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key dari Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | service role key (rahasia) |
| `NEXT_PUBLIC_APP_URL` | `https://simbubalada.vercel.app` |
| `NEXT_PUBLIC_APP_NAME` | `SIMBUMD` |
| `NEXT_PUBLIC_APP_ORG` | `Pemerintah Kota Batu` |

---

## 3. Supabase — Auth Redirect URL

Di **Supabase Dashboard → Authentication → URL Configuration**:

- **Site URL**: `https://simbubalada.vercel.app`
- **Redirect URLs** (tambahkan):
  ```
  https://simbubalada.vercel.app/**
  http://localhost:3000/**
  ```

---

## 4. Buat User Superadmin Pertama

Setelah deploy, buka **Supabase → Authentication → Users → Add User**, buat user dengan email dan password.

Lalu jalankan SQL berikut untuk set role superadmin:

```sql
UPDATE profiles
SET role = 'superadmin', status = 'aktif'
WHERE email = 'email-anda@domain.com';
```

---

## 5. Deploy ke Vercel

```bash
# Push ke GitHub terlebih dahulu, lalu Vercel otomatis build
# Atau manual:
npx vercel --prod
```

---

## Perubahan dari versi sebelumnya

| File | Perbaikan |
|------|-----------|
| `supabase/migrations/001_initial_schema.sql` | Semua `CREATE TYPE` pakai `DO $$ BEGIN...EXCEPTION` agar tidak error jika sudah ada; semua tabel pakai `IF NOT EXISTS`; semua policy pakai `DROP IF EXISTS` sebelum `CREATE`; seed data pakai `ON CONFLICT DO NOTHING` |
| `next.config.js` | Tambah `simbubalada.vercel.app` dan `*.vercel.app` ke `allowedOrigins` (fix 404 NOT_FOUND di Vercel) |
| `src/app/layout.tsx` | Tambah CDN Tabler Icons dan Google Fonts Inter secara eksplisit di `<head>` |
| `src/styles/globals.css` | Pindah `@import` ke atas `@tailwind` (urutan yang benar untuk PostCSS) |
| `vercel.json` | File konfigurasi baru untuk deployment Vercel |
