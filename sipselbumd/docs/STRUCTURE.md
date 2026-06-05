# SIPSELBUMD — Struktur Folder Next.js 15

```
sipselbumd/
├── .env.local                        # Environment variables
├── .env.example
├── .gitignore
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── package.json
│
├── supabase/
│   ├── config.toml
│   └── migrations/
│       ├── 001_init_schema.sql       ✅ Sudah dibuat
│       ├── 002_rls_policies.sql      ✅ Sudah dibuat
│       ├── 003_storage_buckets.sql
│       └── 004_seed_data.sql
│
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── layout.tsx                ✅ Sudah dibuat
│   │   ├── globals.css
│   │   │
│   │   ├── (public)/                 # Halaman publik (tanpa auth)
│   │   │   ├── page.tsx              # Beranda
│   │   │   ├── tentang/page.tsx
│   │   │   ├── dasar-hukum/page.tsx
│   │   │   ├── jadwal/page.tsx
│   │   │   ├── tahapan/page.tsx
│   │   │   ├── pengumuman/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [slug]/page.tsx
│   │   │   ├── faq/page.tsx
│   │   │   └── kontak/page.tsx
│   │   │
│   │   ├── (auth)/                   # Halaman autentikasi
│   │   │   ├── login/page.tsx
│   │   │   ├── daftar/page.tsx
│   │   │   ├── lupa-sandi/page.tsx
│   │   │   └── callback/route.ts
│   │   │
│   │   ├── (peserta)/                # Portal peserta (role: peserta)
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── profil/page.tsx
│   │   │   ├── pendaftaran/
│   │   │   │   ├── page.tsx          # Pilih jabatan
│   │   │   │   └── [positionId]/page.tsx
│   │   │   ├── dokumen/page.tsx
│   │   │   ├── status/page.tsx
│   │   │   └── jadwal/page.tsx
│   │   │
│   │   ├── (panitia)/                # Panel panitia (role: panitia)
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx    # Dashboard eksekutif
│   │   │   ├── pengumuman/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   ├── jadwal/page.tsx
│   │   │   ├── peserta/
│   │   │   │   ├── page.tsx          # Daftar semua peserta
│   │   │   │   └── [id]/page.tsx     # Detail peserta
│   │   │   ├── verifikasi/page.tsx   # Verifikasi administrasi
│   │   │   ├── tahapan/page.tsx
│   │   │   ├── wawancara/page.tsx    # Input hasil wawancara KPM/RUPS
│   │   │   ├── kontrak/page.tsx
│   │   │   ├── berita-acara/page.tsx
│   │   │   └── laporan/page.tsx      # Export Excel/PDF
│   │   │
│   │   ├── (ukk)/                    # Panel Tim UKK (role: ukk)
│   │   │   ├── layout.tsx
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── peserta/page.tsx
│   │   │   ├── nilai/
│   │   │   │   ├── page.tsx          # Input nilai UKK
│   │   │   │   └── [applicationId]/page.tsx
│   │   │   ├── berita-acara/page.tsx
│   │   │   └── finalisasi/page.tsx
│   │   │
│   │   └── (admin)/                  # Panel administrator (role: admin)
│   │       ├── layout.tsx
│   │       ├── dashboard/page.tsx
│   │       ├── pengguna/page.tsx
│   │       ├── role/page.tsx
│   │       ├── database/page.tsx
│   │       ├── audit-log/page.tsx
│   │       └── settings/page.tsx
│   │
│   ├── components/
│   │   ├── ui/                       # Shadcn/UI components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── table.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── toast.tsx
│   │   │   └── ... (semua shadcn)
│   │   │
│   │   ├── layout/
│   │   │   ├── Navbar.tsx            # Navigasi publik
│   │   │   ├── Sidebar.tsx           # Sidebar untuk role-based
│   │   │   ├── Footer.tsx
│   │   │   └── BreadcrumbNav.tsx
│   │   │
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── AuthGuard.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── StatsCard.tsx         # Kartu statistik
│   │   │   ├── FunnelChart.tsx       # Grafik batang funnel
│   │   │   ├── DonutChart.tsx        # Grafik donut distribusi
│   │   │   ├── TrendChart.tsx        # Grafik tren waktu
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── PipelineStages.tsx    # Tampilan tahapan seleksi
│   │   │   └── AlertNotif.tsx
│   │   │
│   │   ├── peserta/
│   │   │   ├── RegistrationForm.tsx  # Formulir pendaftaran lengkap
│   │   │   ├── DocumentUpload.tsx    # Upload dokumen dengan progress
│   │   │   ├── StatusTracker.tsx     # Track status seleksi
│   │   │   └── ApplicationCard.tsx
│   │   │
│   │   ├── panitia/
│   │   │   ├── VerificationTable.tsx # Tabel verifikasi administrasi
│   │   │   ├── ParticipantDetail.tsx
│   │   │   ├── InterviewInput.tsx    # Form input wawancara
│   │   │   └── BeritaAcaraGen.tsx    # Generator berita acara PDF
│   │   │
│   │   ├── ukk/
│   │   │   ├── UKKScoreForm.tsx      # Form input nilai UKK
│   │   │   ├── UKKResultTable.tsx
│   │   │   └── UKKVersionHistory.tsx # Riwayat versi nilai
│   │   │
│   │   └── shared/
│   │       ├── QRCodeDisplay.tsx     # Tampil & verifikasi QR
│   │       ├── PDFExport.tsx
│   │       ├── ExcelExport.tsx
│   │       ├── AuditLogTable.tsx
│   │       ├── FilePreview.tsx
│   │       └── ConfirmDialog.tsx
│   │
│   ├── lib/
│   │   ├── supabase.ts               ✅ Sudah dibuat
│   │   ├── actions/
│   │   │   ├── dashboard.ts          ✅ Sudah dibuat
│   │   │   ├── applications.ts
│   │   │   ├── participants.ts
│   │   │   ├── ukk.ts
│   │   │   ├── documents.ts
│   │   │   └── announcements.ts
│   │   ├── utils/
│   │   │   ├── format.ts             # Format tanggal, angka, IDR
│   │   │   ├── validation.ts         # Zod schemas
│   │   │   ├── pdf-generator.ts      # Berita Acara & kontrak PDF
│   │   │   ├── qr-generator.ts       # QR Code generator
│   │   │   └── export.ts             # Excel export
│   │   └── middleware/
│   │       ├── auth.ts               # Auth check middleware
│   │       └── rbac.ts               # Role-based access control
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useDashboard.ts
│   │   ├── useApplications.ts
│   │   ├── useParticipant.ts
│   │   └── useDocuments.ts
│   │
│   └── types/
│       ├── index.ts                  ✅ Sudah dibuat
│       └── database.types.ts         # Auto-generated by Supabase CLI
│
└── docs/
    ├── DEPLOYMENT.md                 # Panduan deployment
    ├── API.md                        # Dokumentasi API
    └── ARCHITECTURE.md
```

## Tahapan Implementasi

### Phase 1 — Foundation (Minggu 1-2)
- [ ] Setup Next.js 15 + TypeScript + Tailwind + Shadcn/UI
- [ ] Setup Supabase project + run migrations
- [ ] Implementasi auth (login, register, session)
- [ ] Middleware RBAC
- [ ] Layout dasar semua role

### Phase 2 — Peserta Module (Minggu 3-4)
- [ ] Form pendaftaran lengkap
- [ ] Upload dokumen dengan preview
- [ ] Status tracker
- [ ] Halaman jadwal dan pengumuman

### Phase 3 — Panitia Module (Minggu 5-6)
- [ ] Dashboard eksekutif dengan charts
- [ ] Verifikasi administrasi
- [ ] Manajemen pengumuman dan jadwal
- [ ] Input hasil wawancara

### Phase 4 — Tim UKK Module (Minggu 7)
- [ ] Input nilai UKK (immutable versioning)
- [ ] Upload berita acara
- [ ] Finalisasi dan penetapan

### Phase 5 — Advanced Features (Minggu 8-10)
- [ ] Generator PDF berita acara otomatis
- [ ] QR Code verifikasi
- [ ] E-Materai integration
- [ ] Export Excel/PDF
- [ ] Audit trail viewer
- [ ] Dashboard Kepala Daerah

### Phase 6 — Testing & Deployment
- [ ] Unit testing
- [ ] Integration testing
- [ ] Security audit
- [ ] Deploy to Vercel + Supabase Cloud
