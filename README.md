# SIMBUMD — Panduan Deploy Lengkap
**Sistem Informasi Manajemen BUMD/BLUD Pemerintah Kota Batu**

---

## 📋 Prasyarat

Pastikan sudah terinstall:
- [Node.js](https://nodejs.org) versi **18.17+**
- [Git](https://git-scm.com)
- Akun [Supabase](https://supabase.com) (gratis)
- Akun [GitHub](https://github.com)
- Akun [Vercel](https://vercel.com) (gratis, sambungkan ke GitHub)

---

## 🗄️ LANGKAH 1 — Setup Supabase

### 1.1 Buat Project Supabase

1. Buka [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Klik **"New Project"**
3. Isi:
   - **Name:** `simbumd-kotabatu`
   - **Database Password:** buat password kuat, **simpan baik-baik**
   - **Region:** `Southeast Asia (Singapore)` ← paling dekat Indonesia
4. Klik **"Create new project"** — tunggu ±2 menit

### 1.2 Jalankan Migrasi Database

1. Di Supabase Dashboard → buka menu **SQL Editor**
2. Klik **"New query"**
3. Copy-paste seluruh isi file `supabase/migrations/001_initial_schema.sql`
4. Klik **"Run"** (atau tekan Ctrl+Enter)
5. Pastikan muncul pesan **"Success. No rows returned"**

### 1.3 Setup Storage Buckets

Masih di SQL Editor, jalankan query ini:

```sql
INSERT INTO storage.buckets (id, name, public) VALUES
  ('dokumen-peserta', 'dokumen-peserta', false),
  ('foto-profil',     'foto-profil',     true);

-- Policy: hanya pengguna terautentikasi bisa upload dokumen
CREATE POLICY "upload_dokumen" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'dokumen-peserta' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "read_dokumen_panitia" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'dokumen-peserta' AND auth.uid() IS NOT NULL
  );

CREATE POLICY "upload_foto_profil" ON storage.objects
  FOR ALL USING (
    bucket_id = 'foto-profil' AND auth.uid() IS NOT NULL
  );
```

### 1.4 Buat Akun Superadmin Pertama

Di SQL Editor, jalankan (ganti email & password sesuai kebutuhan):

```sql
-- 1. Buat user di auth.users via Supabase Dashboard → Authentication → Users → Add user
--    Email: admin@kotabatu.go.id
--    Password: [password kuat Anda]

-- 2. Setelah user dibuat, update role-nya menjadi superadmin:
UPDATE profiles
SET
  role         = 'superadmin',
  status       = 'aktif',
  nama_lengkap = 'Administrator SIMBUMD',
  unit_kerja   = 'Bagian Perekonomian',
  nip          = '000000000000000000'
WHERE email = 'admin@kotabatu.go.id';
```

### 1.5 Ambil API Keys

1. Di Supabase Dashboard → **Settings** → **API**
2. Catat tiga nilai ini:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role / secret key** → `SUPABASE_SERVICE_ROLE_KEY` ⚠️ *RAHASIA*

---

## 💻 LANGKAH 2 — Setup Lokal & GitHub

### 2.1 Install Dependencies

```bash
cd simbumd
npm install
```

### 2.2 Buat File .env.local

```bash
cp .env.local.example .env.local
```

Edit `.env.local` dan isi dengan nilai dari Langkah 1.5:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2.3 Jalankan Development Server

```bash
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000) — seharusnya redirect ke `/login`.

Login dengan akun superadmin yang dibuat di Langkah 1.4.

### 2.4 Push ke GitHub

```bash
# Inisialisasi repo (jika belum)
git init
git add .
git commit -m "feat: SIMBUMD v1.0.0 — initial release"

# Buat repo baru di GitHub (via https://github.com/new)
# Nama: simbumd-kotabatu (set ke Private)

git remote add origin https://github.com/USERNAME/simbumd-kotabatu.git
git branch -M main
git push -u origin main
```

> ⚠️ Pastikan `.env.local` sudah ada di `.gitignore` — **JANGAN** push file ini ke GitHub!

---

## 🚀 LANGKAH 3 — Deploy ke Vercel

### 3.1 Import Project

1. Buka [https://vercel.com/new](https://vercel.com/new)
2. Klik **"Import Git Repository"**
3. Pilih repo `simbumd-kotabatu`
4. Klik **"Import"**

### 3.2 Konfigurasi Environment Variables

Di halaman setup Vercel, klik **"Environment Variables"** dan tambahkan:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL dari Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key dari Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key ⚠️ |
| `NEXT_PUBLIC_APP_URL` | `https://simbumd-kotabatu.vercel.app` |

> Centang **"Production"**, **"Preview"**, dan **"Development"** untuk semua variabel.

### 3.3 Deploy

1. Biarkan settings lain default (Next.js terdeteksi otomatis)
2. Klik **"Deploy"**
3. Tunggu ±2-3 menit
4. Vercel akan memberikan URL seperti `https://simbumd-kotabatu.vercel.app`

### 3.4 Update Supabase Allowed URLs

1. Di Supabase Dashboard → **Authentication** → **URL Configuration**
2. **Site URL:** `https://simbumd-kotabatu.vercel.app`
3. **Redirect URLs:** tambahkan:
   - `https://simbumd-kotabatu.vercel.app/**`
   - `http://localhost:3000/**`

---

## 🔁 Workflow Deploy Selanjutnya

Setelah setup awal, setiap update cukup:

```bash
git add .
git commit -m "fix: deskripsi perubahan"
git push origin main
```

Vercel akan **auto-deploy** dalam 1-2 menit otomatis. ✅

---

## 🌐 Custom Domain (Opsional)

Jika ingin menggunakan domain `simbumd.kotabatu.go.id`:

1. Vercel → Project → **Settings** → **Domains**
2. Tambahkan `simbumd.kotabatu.go.id`
3. Ikuti instruksi DNS yang diberikan Vercel
4. Update **Site URL** di Supabase dengan domain baru

---

## 📁 Struktur Direktori

```
simbumd/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── login/              # Halaman login
│   │   ├── dashboard/          # Dashboard utama
│   │   ├── executive/          # Dashboard eksekutif BUMD/BLUD
│   │   ├── pendaftaran/        # Portal pendaftaran peserta
│   │   ├── seleksi/
│   │   │   ├── panitia/        # Dashboard panitia seleksi
│   │   │   └── ukk-ranking/    # UKK penilaian & ranking
│   │   └── admin/
│   │       ├── users/          # Manajemen user
│   │       ├── roles/          # Hak akses
│   │       ├── audit/          # Log aktivitas
│   │       ├── sessions/       # Sesi aktif
│   │       └── config/         # Konfigurasi sistem
│   ├── components/
│   │   ├── layout/             # Sidebar, ProtectedLayout
│   │   └── charts/             # Chart.js components
│   ├── lib/
│   │   ├── supabase/           # Client, server, middleware
│   │   ├── actions/            # Server actions (auth, bumd, seleksi, admin)
│   │   └── utils.ts            # Helper functions
│   ├── types/
│   │   └── database.ts         # TypeScript types
│   └── styles/
│       └── globals.css
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql   # Full DB schema + RLS
├── .env.local.example          # Template env vars
├── .gitignore
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json
└── package.json
```

---

## 🔑 Role & Akses

| Role | Dashboard | Seleksi | Penilaian | Admin |
|------|-----------|---------|-----------|-------|
| `superadmin` | ✅ Full | ✅ Full | ✅ Full | ✅ Full |
| `admin` | ✅ Full | ✅ Full | ✅ Read | ✅ Sebagian |
| `panitia_seleksi` | ✅ Read | ✅ Full | ✅ Read | ❌ |
| `penilai` | ✅ Read | ✅ Read | ✅ Input nilai | ❌ |
| `viewer_eksekutif` | ✅ Read | ❌ | ❌ | ❌ |
| `bumd_operator` | ✅ Read | ❌ | ❌ | ❌ |

---

## 🛡️ Keamanan yang Sudah Diterapkan

- ✅ **Row Level Security (RLS)** di semua tabel Supabase
- ✅ **Server Actions** — tidak ada logika sensitif di client
- ✅ **Middleware auth** — setiap request diverifikasi
- ✅ **Session management** — cookie-based via Supabase SSR
- ✅ **Input validation** — Zod schema di server actions
- ✅ **Security headers** — X-Frame-Options, CSP via vercel.json
- ✅ **Audit log** — semua aksi tercatat di tabel `audit_log`
- ✅ **Service role key** — hanya di server-side, tidak exposed ke client

---

## 🆘 Troubleshooting

**Build gagal di Vercel?**
→ Periksa apakah semua environment variables sudah diisi di Vercel dashboard

**Login tidak bisa?**
→ Pastikan user sudah dibuat di Supabase Auth dan profilnya punya `status = 'aktif'`

**Data tidak muncul?**
→ Cek apakah migrasi SQL sudah dijalankan dengan benar, dan RLS policies aktif

**CORS error?**
→ Tambahkan URL Vercel ke allowed origins di Supabase → Auth → URL Configuration

---

*SIMBUMD v1.0.0 · Pemerintah Kota Batu · 2025*
