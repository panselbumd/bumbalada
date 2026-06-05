# SIPSELBUMD
### Sistem Informasi Seleksi Badan Usaha Milik Daerah

Platform digital end-to-end pelaksanaan seleksi pejabat BUMD yang transparan, profesional, dan akuntabel berdasarkan regulasi nasional.

---

## 🏛 Konteks Seleksi Aktif (2026)

| Periode | BUMD | Jabatan | Sifat | Keterangan |
|---------|------|---------|-------|------------|
| BWR-DIREKSI-2026 | PT. BWR | Direksi (3 orang) | Terbuka Umum | 3 carry-over dari 2025, langsung lolos adm. |
| BWR-KOMISARIS-2026 | PT. BWR | Komisaris (2 orang) | Terbatas Internal Pemda | Kode akses: BWR-KOM-2026 |
| PERUMDAM-DEWAS-2026 | Perumdam | Dewan Pengawas (3 orang) | Terbatas Internal Pemda | Kode akses: PERUMDAM-DEWAS-2026 |

---

## 📁 Struktur File Utama

```
src/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx              ✅ Login dengan role selector
│   │   └── daftar/page.tsx             ✅ Registrasi + kode akses terbatas
│   ├── (peserta)/
│   │   └── dashboard/page.tsx          ✅ Status seleksi + upload dokumen
│   ├── (panitia)/
│   │   ├── dashboard/page.tsx          ✅ Dashboard eksekutif + verifikasi adm.
│   │   ├── wawancara/page.tsx          ✅ Input wawancara KPM/RUPS (immutable)
│   │   └── laporan/page.tsx            ✅ Export Excel & PDF
│   ├── (ukk)/
│   │   └── dashboard/page.tsx          ✅ Input nilai UKK (immutable versioning)
│   ├── (admin)/
│   │   └── dashboard/page.tsx          ✅ User mgmt, audit log, carry-over, settings
│   └── verifikasi/page.tsx             ✅ Verifikasi QR Code publik
├── components/
│   └── panitia/
│       ├── ContentEditor.tsx           ✅ Editor konten (pengumuman, jadwal, dll.)
│       ├── BeritaAcaraGenerator.tsx    ✅ Generator BA PDF otomatis
│       └── AccessCodeManager.tsx      ✅ Manajemen kode akses terbatas
├── lib/
│   ├── supabase.ts                     ✅ Supabase client + audit helper
│   ├── middleware.ts                   ✅ RBAC middleware
│   ├── actions/dashboard.ts            ✅ Server actions
│   └── utils/export.ts                ✅ Export Excel & PDF
├── types/
│   ├── index.ts                        ✅ TypeScript types
│   └── extended.ts                     ✅ Extended types (period, access code, dll.)
└── middleware.ts                       ✅ Next.js RBAC middleware

supabase/migrations/
├── 001_init_schema.sql                 ✅ Schema dasar (16 tabel)
├── 002_rls_policies.sql                ✅ Row Level Security semua tabel
└── 003_business_updates.sql            ✅ Periode seleksi, kode akses, carry-over
```

---

## 🗄️ Database — Tabel Utama

| Tabel | Fungsi |
|-------|--------|
| `selection_periods` | Periode seleksi per BUMD (terbuka/terbatas) |
| `access_codes` | Kode akses untuk seleksi terbatas (1 kali pakai) |
| `content_pages` | Konten editable: pengumuman, persyaratan, jadwal, tahapan |
| `participants` | Profil peserta |
| `applications` | Lamaran + carry-over tracking |
| `documents` | Dokumen persyaratan (dengan verifikasi) |
| `administration_results` | Hasil verifikasi administrasi |
| `ukk_results` | Nilai UKK — immutable versioning, tidak bisa dihapus |
| `interview_results` | Nilai wawancara KPM/RUPS — immutable versioning |
| `performance_contracts` | Kontrak kinerja + QR verifikasi |
| `appointments` | SK Pengangkatan + QR verifikasi |
| `audit_logs` | Seluruh aktivitas sistem — tidak bisa dihapus |
| `v_period_summary` | View ringkasan statistik per periode |

---

## 🔑 Fitur Utama

### Carry-over Peserta
```sql
-- Jalankan via Admin Dashboard atau SQL Editor
SELECT * FROM carry_over_candidates('BWR-DIREKSI-2025', 'BWR-DIREKSI-2026');
```
3 calon dari 2025 otomatis berstatus `lolos_administrasi` di periode 2026.

### Seleksi Terbatas (Komisaris & Dewan Pengawas)
- Pendaftaran memerlukan kode akses yang diterbitkan Panitia
- Kode hanya bisa digunakan 1 kali
- Kode kedaluwarsa dapat dikonfigurasi

### Immutable Value Input (UKK & Wawancara)
- Nilai **tidak bisa dihapus** — hanya bisa direvisi
- Setiap revisi membuat versi baru dengan versi lama tetap tersimpan
- Riwayat semua versi dapat dilihat untuk keperluan audit

### Content Editor
- Pengumuman, persyaratan, jadwal, tahapan — semua editable oleh Panitia/Admin
- Jadwal menggunakan editor tabel visual
- Konten lain menggunakan editor Markdown dengan preview

---

## 🚀 Quick Start

```bash
# 1. Clone & install
git clone https://github.com/USERNAME/sipselbumd.git
cd sipselbumd
npm install

# 2. Setup environment
cp .env.example .env.local
# Edit .env.local dengan credentials Supabase Anda

# 3. Setup database
npx supabase login
npx supabase link --project-ref YOUR_PROJECT_ID
npx supabase db push

# 4. Generate types
npm run db:types

# 5. Jalankan development server
npm run dev
# Buka http://localhost:3000
```

---

## 🔐 Akun Default (Setelah Setup)

Buat akun via Supabase Auth Dashboard, lalu update role di tabel `users`:

```sql
-- Buat admin pertama
UPDATE users SET role = 'admin' WHERE email = 'admin@sipselbumd.go.id';

-- Buat panitia
UPDATE users SET role = 'panitia' WHERE email = 'panitia@sipselbumd.go.id';

-- Buat Tim UKK
UPDATE users SET role = 'ukk' WHERE email = 'ukk@sipselbumd.go.id';
```

---

## 📋 Alur Kerja Carry-over

```
Seleksi BWR 2025
    └── 3 calon lolos UKK → status: lolos_ukk
           ↓
[Admin jalankan carry_over_candidates()]
           ↓
Seleksi BWR 2026
    ├── 3 calon carry-over → status: lolos_administrasi (otomatis)
    │       is_carry_over = TRUE
    │       carry_over_note = "Carry-over dari BWR-DIREKSI-2025"
    └── Peserta baru → daftar normal → verifikasi administrasi
```

---

## 📊 Kode Akses Seleksi Terbatas

| Periode | Kode Default | Jabatan |
|---------|-------------|---------|
| BWR-KOMISARIS-2026 | `BWR-KOM-2026` | Komisaris PT. BWR |
| PERUMDAM-DEWAS-2026 | `PERUMDAM-DEWAS-2026` | Dewan Pengawas Perumdam |

> **Ubah kode default** via Admin Dashboard → Kode Akses setelah production deploy.

---

## 🔗 Referensi Hukum

1. **UU No. 23 Tahun 2014** tentang Pemerintahan Daerah
2. **PP No. 54 Tahun 2017** tentang Badan Usaha Milik Daerah  
3. **Permendagri No. 37 Tahun 2018** tentang Pengangkatan dan Pemberhentian Anggota Dewan Pengawas atau Anggota Komisaris dan Anggota Direksi BUMD

---

## 🏗️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Backend | Supabase (PostgreSQL + Auth + Storage + Edge Functions) |
| Auth | Supabase Auth + JWT + RBAC + Row Level Security |
| Deployment | Vercel (Frontend) + Supabase Cloud (Backend) |
| CI/CD | GitHub Actions |

---

© 2026 Sistem Informasi Seleksi BUMD · Pemerintah Daerah
