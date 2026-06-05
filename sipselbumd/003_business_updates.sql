-- ============================================================
-- SIPSELBUMD — Migration 003: Business Logic Updates
-- Versi: 1.2.0 — Fixed:
--   1. CREATE TRIGGER (bukan TRIGGER) pada selection_periods
--   2. DROP TRIGGER IF EXISTS sebelum CREATE TRIGGER
--   3. CREATE TABLE IF NOT EXISTS pada semua tabel baru
--   4. ON CONFLICT DO NOTHING pada semua INSERT seed data
--   5. DROP POLICY IF EXISTS sebelum CREATE POLICY (di bagian RLS)
--   6. Fungsi carry_over_candidates & validate_access_code ditambahkan
--      SET search_path = public, pg_catalog (FIX SECURITY DEFINER)
--   7. VIEW v_period_summary diubah ke SECURITY INVOKER agar tidak
--      melanggar Supabase security advisor (issue SECURITY DEFINER view)
-- Jalankan SETELAH 002_rls_policies.sql
-- ============================================================

-- ============================================================
-- 1. SELECTION PERIODS (periode seleksi per BUMD)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.selection_periods (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_code     TEXT NOT NULL UNIQUE,
  period_label    TEXT NOT NULL,
  position_id     UUID REFERENCES public.positions(id),
  bumd_name       TEXT NOT NULL,
  bumd_short      TEXT NOT NULL,
  bumd_type       bumd_type NOT NULL,
  is_restricted   BOOLEAN DEFAULT FALSE,
  access_code     TEXT,
  min_candidates  INT DEFAULT 1,
  quota_position  INT NOT NULL DEFAULT 1,
  status          TEXT DEFAULT 'draft'
    CHECK (status IN ('draft','open','closed','completed')),
  open_date       TIMESTAMPTZ,
  close_date      TIMESTAMPTZ,
  notes           TEXT,
  created_by      UUID REFERENCES public.users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_periods_updated_at ON public.selection_periods;
CREATE TRIGGER trg_periods_updated_at
  BEFORE UPDATE ON public.selection_periods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 2. TAMBAH KOLOM KE applications (idempotent via IF NOT EXISTS)
-- ============================================================
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS period_id       UUID REFERENCES public.selection_periods(id),
  ADD COLUMN IF NOT EXISTS is_carry_over   BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS carry_over_from UUID REFERENCES public.applications(id),
  ADD COLUMN IF NOT EXISTS carry_over_note TEXT;

-- Lepas constraint UNIQUE lama agar peserta bisa mendaftar ulang di periode berbeda
DO $$ BEGIN
  ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_participant_id_position_id_key;
EXCEPTION WHEN undefined_object THEN NULL; END $$;

-- Tambah constraint baru yang menyertakan period_id
DO $$ BEGIN
  ALTER TABLE public.applications
    ADD CONSTRAINT uq_application_per_period
    UNIQUE (participant_id, position_id, period_id);
EXCEPTION WHEN duplicate_table THEN NULL; END $$;

-- ============================================================
-- 3. ACCESS CODES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.access_codes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_id     UUID NOT NULL REFERENCES public.selection_periods(id),
  code          TEXT NOT NULL,
  label         TEXT,
  issued_to     TEXT,
  used_by       UUID REFERENCES public.users(id),
  used_at       TIMESTAMPTZ,
  is_active     BOOLEAN DEFAULT TRUE,
  expires_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES public.users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. CONTENT MANAGEMENT (editable oleh admin/panitia)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.content_pages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_id    UUID REFERENCES public.selection_periods(id),
  page_type    TEXT NOT NULL
    CHECK (page_type IN (
      'persyaratan', 'tahapan', 'jadwal',
      'pengumuman', 'tata_cara', 'tentang'
    )),
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  metadata     JSONB,
  version      INT DEFAULT 1,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  updated_by   UUID REFERENCES public.users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_content_updated_at ON public.content_pages;
CREATE TRIGGER trg_content_updated_at
  BEFORE UPDATE ON public.content_pages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- INDEXES (IF NOT EXISTS agar aman dijalankan ulang)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_access_codes_period    ON public.access_codes(period_id);
CREATE INDEX IF NOT EXISTS idx_access_codes_code      ON public.access_codes(code) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_applications_period    ON public.applications(period_id);
CREATE INDEX IF NOT EXISTS idx_applications_carryover ON public.applications(is_carry_over) WHERE is_carry_over = TRUE;
CREATE INDEX IF NOT EXISTS idx_content_period_type    ON public.content_pages(period_id, page_type);
CREATE INDEX IF NOT EXISTS idx_content_published      ON public.content_pages(is_published, page_type);

-- ============================================================
-- 5. SEED DATA — Periode Seleksi
-- ON CONFLICT DO NOTHING = aman dijalankan berulang
-- ============================================================
INSERT INTO public.selection_periods (
  period_code, period_label, bumd_name, bumd_short, bumd_type,
  is_restricted, min_candidates, quota_position, status
) VALUES (
  'BWR-DIREKSI-2025',
  'Seleksi Calon Direksi PT. Banjar Wisata Raya Tahun 2025',
  'PT. Banjar Wisata Raya', 'PT. BWR', 'perseroda',
  FALSE, 5, 3, 'completed'
) ON CONFLICT (period_code) DO NOTHING;

INSERT INTO public.selection_periods (
  period_code, period_label, bumd_name, bumd_short, bumd_type,
  is_restricted, min_candidates, quota_position, status, notes
) VALUES (
  'BWR-DIREKSI-2026',
  'Seleksi Calon Direksi PT. Banjar Wisata Raya Tahun 2026',
  'PT. Banjar Wisata Raya', 'PT. BWR', 'perseroda',
  FALSE, 5, 3, 'open',
  '3 calon dari seleksi 2025 carry-over langsung ke tahap UKK.'
) ON CONFLICT (period_code) DO NOTHING;

INSERT INTO public.selection_periods (
  period_code, period_label, bumd_name, bumd_short, bumd_type,
  is_restricted, access_code, min_candidates, quota_position, status, notes
) VALUES (
  'BWR-KOMISARIS-2026',
  'Seleksi Calon Komisaris PT. Banjar Wisata Raya Tahun 2026',
  'PT. Banjar Wisata Raya', 'PT. BWR', 'perseroda',
  TRUE, 'BWR-KOM-2026', 1, 2, 'open',
  'Seleksi terbatas untuk Pejabat Internal Pemerintah Daerah.'
) ON CONFLICT (period_code) DO NOTHING;

INSERT INTO public.selection_periods (
  period_code, period_label, bumd_name, bumd_short, bumd_type,
  is_restricted, access_code, min_candidates, quota_position, status, notes
) VALUES (
  'PERUMDAM-DEWAS-2026',
  'Seleksi Calon Dewan Pengawas Perumdam Tahun 2026',
  'Perusahaan Umum Daerah Air Minum', 'Perumdam', 'perumda',
  TRUE, 'PERUMDAM-DEWAS-2026', 1, 3, 'open',
  'Seleksi terbatas untuk Pejabat Internal Pemerintah Daerah.'
) ON CONFLICT (period_code) DO NOTHING;

-- ============================================================
-- 6. SEED DATA — Content Pages
-- ============================================================
DO $$
DECLARE
  v_bwr_direksi_2026   UUID;
  v_bwr_komisaris_2026  UUID;
  v_perumdam_dewas_2026 UUID;
BEGIN
  SELECT id INTO v_bwr_direksi_2026    FROM public.selection_periods WHERE period_code = 'BWR-DIREKSI-2026';
  SELECT id INTO v_bwr_komisaris_2026   FROM public.selection_periods WHERE period_code = 'BWR-KOMISARIS-2026';
  SELECT id INTO v_perumdam_dewas_2026  FROM public.selection_periods WHERE period_code = 'PERUMDAM-DEWAS-2026';

  -- Pengumuman: Direksi & Komisaris PT. BWR 2026
  INSERT INTO public.content_pages (period_id, page_type, title, content, is_published, published_at)
  SELECT
    v_bwr_direksi_2026, 'pengumuman',
    'Pengumuman Seleksi Calon Direksi dan Komisaris PT. Banjar Wisata Raya Tahun 2026',
    E'## Pengumuman\n\n**Nomor:** [Nomor Pengumuman]\n\n'
    'Panitia Seleksi membuka pendaftaran untuk pengisian jabatan Direksi dan Komisaris PT. BWR.\n\n'
    '### A. Calon Direksi PT. BWR\n'
    '- Jumlah jabatan: **3 (tiga) orang**\n'
    '- Sifat: **Terbuka untuk Umum**\n'
    '- Catatan: 3 calon yang memenuhi kualifikasi pada seleksi Tahun 2025 **langsung masuk tahap UKK**\n\n'
    '### B. Calon Komisaris PT. BWR\n'
    '- Jumlah jabatan: **2 (dua) orang**\n'
    '- Sifat: **Terbatas — Pejabat Internal Pemerintah Daerah**\n\n'
    '### Dasar Hukum\n'
    '1. UU Nomor 23 Tahun 2014 tentang Pemerintahan Daerah\n'
    '2. PP Nomor 54 Tahun 2017 tentang BUMD\n'
    '3. Permendagri Nomor 37 Tahun 2018',
    TRUE, NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.content_pages
    WHERE period_id = v_bwr_direksi_2026 AND page_type = 'pengumuman'
  );

  -- Pengumuman: Dewan Pengawas Perumdam 2026
  INSERT INTO public.content_pages (period_id, page_type, title, content, is_published, published_at)
  SELECT
    v_perumdam_dewas_2026, 'pengumuman',
    'Pengumuman Seleksi Calon Dewan Pengawas Perumdam Tahun 2026',
    E'## Pengumuman\n\n**Nomor:** [Nomor Pengumuman]\n\n'
    'Seleksi Calon Dewan Pengawas Perumdam — **hanya untuk Pejabat Internal Pemerintah Daerah**.\n\n'
    '### Jabatan yang Diseleksi\n'
    '**Calon Dewan Pengawas Perumdam** — **3 (tiga) orang**\n\n'
    '### Ketentuan Peserta\n'
    'Pendaftaran menggunakan **kode akses** yang diterbitkan oleh Panitia Seleksi.\n\n'
    '### Dasar Hukum\n'
    '1. UU Nomor 23 Tahun 2014\n'
    '2. PP Nomor 54 Tahun 2017 tentang BUMD\n'
    '3. Permendagri Nomor 37 Tahun 2018',
    TRUE, NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.content_pages
    WHERE period_id = v_perumdam_dewas_2026 AND page_type = 'pengumuman'
  );

  -- Persyaratan: Direksi PT. BWR
  INSERT INTO public.content_pages (period_id, page_type, title, content, metadata, is_published, published_at)
  SELECT
    v_bwr_direksi_2026, 'persyaratan',
    'Persyaratan Pendaftaran Calon Direksi PT. BWR Tahun 2026',
    E'## Persyaratan Umum\n\n'
    '1. Warga Negara Indonesia\n'
    '2. Sehat jasmani dan rohani\n'
    '3. Tidak pernah dinyatakan pailit\n'
    '4. Tidak sedang menjalani sanksi pidana\n'
    '5. Tidak sedang menjadi pengurus partai politik\n\n'
    '## Persyaratan Khusus\n\n'
    '1. **Pendidikan:** Minimal S1, diutamakan S2\n'
    '2. **Pengalaman:** Minimal 5 tahun di bidang relevan\n'
    '3. **Usia:** Maksimal 55 tahun saat mendaftar\n'
    '4. **Kompetensi:** Pariwisata, hospitality, atau manajemen bisnis\n\n'
    '## Dokumen yang Diperlukan\n\n'
    '1. KTP yang masih berlaku\n'
    '2. Pas foto 4x6 (latar merah)\n'
    '3. CV lengkap\n'
    '4. Ijazah terlegalisir\n'
    '5. NPWP\n'
    '6. SKCK\n'
    '7. Surat Keterangan Sehat\n'
    '8. Pakta Integritas\n'
    '9. Dokumen pendukung lain',
    '{"required_docs":["ktp","pas_foto","cv","ijazah","npwp","skck","surat_kesehatan","pakta_integritas","dok_pendukung"]}',
    TRUE, NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.content_pages
    WHERE period_id = v_bwr_direksi_2026 AND page_type = 'persyaratan'
  );

  -- Persyaratan: Komisaris PT. BWR (terbatas)
  INSERT INTO public.content_pages (period_id, page_type, title, content, metadata, is_published, published_at)
  SELECT
    v_bwr_komisaris_2026, 'persyaratan',
    'Persyaratan Pendaftaran Calon Komisaris PT. BWR Tahun 2026',
    E'## Ketentuan Peserta\n\n'
    '> Seleksi ini **hanya diperuntukkan** bagi Pejabat Internal Pemerintah Daerah.\n\n'
    '## Persyaratan Umum\n\n'
    '1. Pejabat aktif di lingkungan Pemerintah Daerah\n'
    '2. Sehat jasmani dan rohani\n'
    '3. Tidak sedang menjalani sanksi\n\n'
    '## Persyaratan Khusus\n\n'
    '1. **Jabatan:** Minimal Eselon II atau setara\n'
    '2. **Pendidikan:** Minimal S1\n'
    '3. **Kompetensi:** Pengawasan, keuangan, atau bidang relevan PT. BWR\n\n'
    '## Dokumen yang Diperlukan\n\n'
    '1. KTP, Pas Foto 4x6, CV, Ijazah terlegalisir\n'
    '2. SK Jabatan terakhir\n'
    '3. Surat Keterangan Sehat\n'
    '4. Pakta Integritas\n'
    '5. Surat rekomendasi atasan langsung',
    '{"required_docs":["ktp","pas_foto","cv","ijazah","surat_kesehatan","pakta_integritas","dok_pendukung"],"access_required":true}',
    TRUE, NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.content_pages
    WHERE period_id = v_bwr_komisaris_2026 AND page_type = 'persyaratan'
  );

  -- Persyaratan: Dewan Pengawas Perumdam (terbatas)
  INSERT INTO public.content_pages (period_id, page_type, title, content, metadata, is_published, published_at)
  SELECT
    v_perumdam_dewas_2026, 'persyaratan',
    'Persyaratan Pendaftaran Calon Dewan Pengawas Perumdam Tahun 2026',
    E'## Ketentuan Peserta\n\n'
    '> Seleksi ini **hanya diperuntukkan** bagi Pejabat Internal Pemerintah Daerah.\n\n'
    '## Persyaratan Umum\n\n'
    '1. Pejabat aktif di Pemerintah Daerah\n'
    '2. Sehat jasmani dan rohani\n'
    '3. Tidak sedang menjalani sanksi\n\n'
    '## Persyaratan Khusus\n\n'
    '1. **Jabatan:** Pejabat Eselon II atau setara\n'
    '2. **Pendidikan:** Minimal S1\n'
    '3. **Kompetensi:** Pengawasan, keuangan daerah, atau pelayanan air minum\n\n'
    '## Dokumen yang Diperlukan\n\n'
    '1. KTP, Pas Foto, CV, Ijazah terlegalisir\n'
    '2. SK Jabatan terakhir\n'
    '3. Surat Keterangan Sehat\n'
    '4. Pakta Integritas\n'
    '5. Surat rekomendasi atasan',
    '{"required_docs":["ktp","pas_foto","cv","ijazah","surat_kesehatan","pakta_integritas","dok_pendukung"],"access_required":true}',
    TRUE, NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.content_pages
    WHERE period_id = v_perumdam_dewas_2026 AND page_type = 'persyaratan'
  );

  -- Jadwal: Direksi PT. BWR 2026
  INSERT INTO public.content_pages (period_id, page_type, title, content, metadata, is_published, published_at)
  SELECT
    v_bwr_direksi_2026, 'jadwal',
    'Jadwal Pelaksanaan Seleksi Calon Direksi PT. BWR Tahun 2026',
    'Jadwal pelaksanaan seleksi dapat dilihat pada tabel berikut.',
    '{"jadwal_items":[
      {"no":1,"tahapan":"Pengumuman Seleksi","tanggal":"5 Januari 2026","keterangan":"Pengumuman resmi melalui sistem dan media"},
      {"no":2,"tahapan":"Pendaftaran Peserta Baru","tanggal":"6 - 20 Januari 2026","keterangan":"Pendaftaran online melalui sistem"},
      {"no":3,"tahapan":"Verifikasi Administrasi","tanggal":"21 - 25 Januari 2026","keterangan":"Panitia memverifikasi kelengkapan dokumen"},
      {"no":4,"tahapan":"Pengumuman Lolos Administrasi","tanggal":"27 Januari 2026","keterangan":"Termasuk 3 calon carry-over 2025"},
      {"no":5,"tahapan":"Uji Kompetensi dan Kelayakan (UKK)","tanggal":"3 - 7 Februari 2026","keterangan":"Semua calon lolos administrasi"},
      {"no":6,"tahapan":"Pengumuman Hasil UKK","tanggal":"10 Februari 2026","keterangan":""},
      {"no":7,"tahapan":"Wawancara RUPS","tanggal":"17 - 19 Februari 2026","keterangan":"Wawancara oleh pemegang saham"},
      {"no":8,"tahapan":"Penetapan Calon Terpilih","tanggal":"24 Februari 2026","keterangan":""},
      {"no":9,"tahapan":"Penandatanganan Kontrak Kinerja","tanggal":"3 Maret 2026","keterangan":""},
      {"no":10,"tahapan":"Pengangkatan / SK Direksi","tanggal":"10 Maret 2026","keterangan":""}
    ]}',
    TRUE, NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.content_pages
    WHERE period_id = v_bwr_direksi_2026 AND page_type = 'jadwal'
  );

  -- Jadwal: Komisaris PT. BWR 2026
  INSERT INTO public.content_pages (period_id, page_type, title, content, metadata, is_published, published_at)
  SELECT
    v_bwr_komisaris_2026, 'jadwal',
    'Jadwal Pelaksanaan Seleksi Calon Komisaris PT. BWR Tahun 2026',
    'Jadwal pelaksanaan seleksi Komisaris PT. BWR.',
    '{"jadwal_items":[
      {"no":1,"tahapan":"Pengumuman Internal","tanggal":"5 Januari 2026","keterangan":"Surat resmi kepada unit Pemda"},
      {"no":2,"tahapan":"Distribusi Kode Akses","tanggal":"5 - 10 Januari 2026","keterangan":"Panitia menerbitkan kode akses"},
      {"no":3,"tahapan":"Pendaftaran","tanggal":"6 - 20 Januari 2026","keterangan":"Self-register dengan kode akses"},
      {"no":4,"tahapan":"Verifikasi Administrasi","tanggal":"21 - 25 Januari 2026","keterangan":""},
      {"no":5,"tahapan":"UKK","tanggal":"3 - 7 Februari 2026","keterangan":""},
      {"no":6,"tahapan":"Wawancara RUPS","tanggal":"17 - 19 Februari 2026","keterangan":""},
      {"no":7,"tahapan":"Penetapan dan Pengangkatan","tanggal":"Maret 2026","keterangan":""}
    ]}',
    TRUE, NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.content_pages
    WHERE period_id = v_bwr_komisaris_2026 AND page_type = 'jadwal'
  );

  -- Jadwal: Dewan Pengawas Perumdam 2026
  INSERT INTO public.content_pages (period_id, page_type, title, content, metadata, is_published, published_at)
  SELECT
    v_perumdam_dewas_2026, 'jadwal',
    'Jadwal Pelaksanaan Seleksi Calon Dewan Pengawas Perumdam Tahun 2026',
    'Jadwal pelaksanaan seleksi Dewan Pengawas Perumdam.',
    '{"jadwal_items":[
      {"no":1,"tahapan":"Pengumuman Internal","tanggal":"5 Januari 2026","keterangan":"Surat resmi ke unit Pemda"},
      {"no":2,"tahapan":"Distribusi Kode Akses","tanggal":"5 - 10 Januari 2026","keterangan":""},
      {"no":3,"tahapan":"Pendaftaran","tanggal":"6 - 20 Januari 2026","keterangan":"Self-register dengan kode akses"},
      {"no":4,"tahapan":"Verifikasi Administrasi","tanggal":"21 - 25 Januari 2026","keterangan":""},
      {"no":5,"tahapan":"Pengumuman Lolos Administrasi","tanggal":"27 Januari 2026","keterangan":""},
      {"no":6,"tahapan":"UKK / Uji Kelayakan","tanggal":"3 - 7 Februari 2026","keterangan":""},
      {"no":7,"tahapan":"Wawancara KPM","tanggal":"17 - 19 Februari 2026","keterangan":"Wawancara oleh KPM"},
      {"no":8,"tahapan":"Penetapan dan Pengangkatan","tanggal":"Maret 2026","keterangan":""}
    ]}',
    TRUE, NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.content_pages
    WHERE period_id = v_perumdam_dewas_2026 AND page_type = 'jadwal'
  );

  -- Tahapan: Direksi PT. BWR 2026
  INSERT INTO public.content_pages (period_id, page_type, title, content, metadata, is_published, published_at)
  SELECT
    v_bwr_direksi_2026, 'tahapan',
    'Tahapan Seleksi Calon Direksi PT. BWR Tahun 2026',
    'Seleksi dilaksanakan melalui tahapan berikut.',
    '{"tahapan_items":[
      {"no":1,"nama":"Pengumuman Seleksi","deskripsi":"Panitia menerbitkan pengumuman resmi","icon":"megaphone"},
      {"no":2,"nama":"Pendaftaran Online","deskripsi":"Calon mengisi formulir dan mengunggah dokumen","icon":"file-text"},
      {"no":3,"nama":"Verifikasi Administrasi","deskripsi":"Panitia memeriksa kelengkapan dokumen","icon":"check-circle"},
      {"no":4,"nama":"Penetapan Lolos Administrasi","deskripsi":"3 calon carry-over 2025 otomatis lolos","icon":"award"},
      {"no":5,"nama":"UKK","deskripsi":"Tes kompetensi, psikologi, makalah, dan wawancara","icon":"clipboard"},
      {"no":6,"nama":"Penetapan Hasil UKK","deskripsi":"Tim UKK menetapkan calon yang memenuhi syarat","icon":"bar-chart"},
      {"no":7,"nama":"Wawancara RUPS","deskripsi":"Wawancara oleh pemegang saham","icon":"users"},
      {"no":8,"nama":"Penetapan Calon Terpilih","deskripsi":"Ditetapkan oleh RUPS","icon":"star"},
      {"no":9,"nama":"Kontrak Kinerja","deskripsi":"Penandatanganan kontrak kinerja","icon":"pen-tool"},
      {"no":10,"nama":"Pengangkatan","deskripsi":"Penerbitan SK Pengangkatan","icon":"shield"}
    ]}',
    TRUE, NOW()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.content_pages
    WHERE period_id = v_bwr_direksi_2026 AND page_type = 'tahapan'
  );

END $$;

-- ============================================================
-- 7. FUNCTION: carry_over_candidates
-- FIX: Tambahkan SET search_path = public, pg_catalog
-- ============================================================
CREATE OR REPLACE FUNCTION public.carry_over_candidates(
  p_from_period_code TEXT,
  p_to_period_code   TEXT
)
RETURNS TABLE(application_id UUID, participant_name TEXT, new_application_id UUID) AS $$
DECLARE
  v_from_period UUID;
  v_to_period   UUID;
  v_rec         RECORD;
  v_new_app     UUID;
BEGIN
  SELECT id INTO v_from_period FROM public.selection_periods WHERE period_code = p_from_period_code;
  SELECT id INTO v_to_period   FROM public.selection_periods WHERE period_code = p_to_period_code;

  IF v_from_period IS NULL OR v_to_period IS NULL THEN
    RAISE EXCEPTION 'Period code tidak ditemukan: % atau %',
      p_from_period_code, p_to_period_code;
  END IF;

  FOR v_rec IN
    SELECT a.id AS app_id, a.position_id, a.participant_id, p.full_name
    FROM public.applications a
    JOIN public.participants p ON a.participant_id = p.id
    WHERE a.period_id = v_from_period
      AND a.status = 'lolos_ukk'
    ORDER BY a.created_at
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.applications
      WHERE participant_id = v_rec.participant_id
        AND period_id = v_to_period
        AND is_carry_over = TRUE
    ) THEN
      CONTINUE;
    END IF;

    INSERT INTO public.applications (
      participant_id, position_id, period_id,
      status, is_carry_over, carry_over_from,
      carry_over_note, submitted_at
    ) VALUES (
      v_rec.participant_id, v_rec.position_id, v_to_period,
      'lolos_administrasi', TRUE, v_rec.app_id,
      'Carry-over dari seleksi ' || p_from_period_code || '. Langsung masuk tahap UKK.',
      NOW()
    ) RETURNING id INTO v_new_app;

    application_id     := v_rec.app_id;
    participant_name   := v_rec.full_name;
    new_application_id := v_new_app;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_catalog;

-- ============================================================
-- 8. FUNCTION: validate_access_code
-- FIX: Tambahkan SET search_path = public, pg_catalog
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_access_code(
  p_period_id UUID,
  p_code      TEXT,
  p_user_id   UUID
)
RETURNS JSONB AS $$
DECLARE
  v_code_rec public.access_codes%ROWTYPE;
  v_period   public.selection_periods%ROWTYPE;
BEGIN
  SELECT * INTO v_period FROM public.selection_periods WHERE id = p_period_id;

  IF NOT FOUND THEN
    RETURN '{"valid":false,"message":"Periode seleksi tidak ditemukan"}'::JSONB;
  END IF;

  IF NOT v_period.is_restricted THEN
    RETURN '{"valid":true,"message":"Seleksi terbuka, kode akses tidak diperlukan"}'::JSONB;
  END IF;

  SELECT * INTO v_code_rec
  FROM public.access_codes
  WHERE period_id  = p_period_id
    AND code       = p_code
    AND is_active  = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
    AND used_by    IS NULL;

  IF NOT FOUND THEN
    RETURN '{"valid":false,"message":"Kode akses tidak valid, sudah digunakan, atau sudah kadaluarsa"}'::JSONB;
  END IF;

  UPDATE public.access_codes
  SET used_by = p_user_id, used_at = NOW()
  WHERE id = v_code_rec.id;

  RETURN jsonb_build_object(
    'valid',   true,
    'message', 'Kode akses valid',
    'code_id', v_code_rec.id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
   SET search_path = public, pg_catalog;

-- ============================================================
-- 9. VIEW: v_period_summary
-- FIX: Hilangkan "ALTER VIEW ... OWNER TO postgres" karena itulah
--      yang menyebabkan view berjalan sebagai SECURITY DEFINER.
--      Ganti dengan SECURITY INVOKER eksplisit (PG15+ / Supabase).
--      View akan mengikuti RLS dan permission dari user yang query,
--      bukan dari owner view.
-- ============================================================
DROP VIEW IF EXISTS public.v_period_summary;

CREATE OR REPLACE VIEW public.v_period_summary
WITH (security_invoker = true)   -- FIX: enforce SECURITY INVOKER, bukan SECURITY DEFINER
AS
SELECT
  sp.id,
  sp.period_code,
  sp.period_label,
  sp.bumd_name,
  sp.bumd_short,
  sp.bumd_type,
  sp.is_restricted,
  sp.status,
  sp.min_candidates,
  sp.quota_position,
  COUNT(a.id)                                                        AS total_applicants,
  COUNT(a.id) FILTER (WHERE a.is_carry_over)                         AS carry_over_count,
  COUNT(a.id) FILTER (WHERE a.status IN (
    'lolos_administrasi','ikut_ukk','lolos_ukk','tidak_lolos_ukk',
    'ikut_wawancara','lolos_wawancara','tidak_lolos_wawancara',
    'terpilih','tidak_terpilih','kontrak','diangkat'))               AS passed_admin,
  COUNT(a.id) FILTER (WHERE a.status IN (
    'lolos_ukk','ikut_wawancara','lolos_wawancara',
    'tidak_lolos_wawancara','terpilih','tidak_terpilih',
    'kontrak','diangkat'))                                            AS passed_ukk,
  COUNT(a.id) FILTER (WHERE a.status IN
    ('terpilih','tidak_terpilih','kontrak','diangkat'))               AS selected,
  COUNT(a.id) FILTER (WHERE a.status = 'diangkat')                   AS appointed
FROM public.selection_periods sp
LEFT JOIN public.applications a ON a.period_id = sp.id
GROUP BY sp.id;

-- Grant akses view ke authenticated users
-- Catatan: TIDAK mengubah OWNER view agar tetap SECURITY INVOKER
GRANT SELECT ON public.v_period_summary TO authenticated;

-- ============================================================
-- 10. RLS untuk tabel baru di migration ini
-- ============================================================
ALTER TABLE public.selection_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_codes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_pages     ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  DROP POLICY IF EXISTS sp_select ON public.selection_periods;
  DROP POLICY IF EXISTS sp_write  ON public.selection_periods;
  DROP POLICY IF EXISTS ac_select ON public.access_codes;
  DROP POLICY IF EXISTS ac_insert ON public.access_codes;
  DROP POLICY IF EXISTS ac_update ON public.access_codes;
  DROP POLICY IF EXISTS cp_select_public ON public.content_pages;
  DROP POLICY IF EXISTS cp_write         ON public.content_pages;
END $$;

-- selection_periods: semua authenticated bisa baca
CREATE POLICY sp_select ON public.selection_periods
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY sp_write ON public.selection_periods
  FOR ALL USING (public.is_panitia_or_admin());

-- access_codes: hanya admin/panitia
CREATE POLICY ac_select ON public.access_codes
  FOR SELECT USING (public.is_panitia_or_admin());

CREATE POLICY ac_insert ON public.access_codes
  FOR INSERT WITH CHECK (public.is_panitia_or_admin());

CREATE POLICY ac_update ON public.access_codes
  FOR UPDATE USING (public.is_panitia_or_admin());

-- content_pages: published = publik, edit = panitia/admin
CREATE POLICY cp_select_public ON public.content_pages
  FOR SELECT USING (is_published = TRUE OR public.is_panitia_or_admin());

CREATE POLICY cp_write ON public.content_pages
  FOR ALL USING (public.is_panitia_or_admin());
