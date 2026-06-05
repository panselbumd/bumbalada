-- ============================================================
-- SIPSELBUMD — Migration 003: Business Logic Updates
-- Carry-over candidates, access codes, restricted selection
-- ============================================================

-- ============================================================
-- 1. SELECTION PERIODS (periode seleksi per BUMD)
--    Memungkinkan seleksi ulang dengan carry-over peserta
-- ============================================================
CREATE TABLE selection_periods (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_code     TEXT NOT NULL UNIQUE,   -- e.g. 'BWR-DIREKSI-2025', 'BWR-DIREKSI-2026'
  period_label    TEXT NOT NULL,          -- e.g. 'Seleksi Direksi PT. BWR Tahun 2026'
  position_id     UUID REFERENCES positions(id),
  bumd_name       TEXT NOT NULL,          -- 'PT. Banjar Wisata Raya'
  bumd_short      TEXT NOT NULL,          -- 'PT. BWR'
  bumd_type       bumd_type NOT NULL,
  is_restricted   BOOLEAN DEFAULT FALSE,  -- TRUE = internal Pemda only
  access_code     TEXT,                   -- kode akses untuk seleksi terbatas
  min_candidates  INT DEFAULT 1,          -- minimal calon yang harus memenuhi kualifikasi
  quota_position  INT NOT NULL DEFAULT 1, -- jumlah jabatan yang diisi
  status          TEXT DEFAULT 'draft'    -- draft, open, closed, completed
    CHECK (status IN ('draft','open','closed','completed')),
  open_date       TIMESTAMPTZ,
  close_date      TIMESTAMPTZ,
  notes           TEXT,
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

TRIGGER trg_periods_updated_at BEFORE UPDATE ON selection_periods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 2. TAMBAH KOLOM KE applications
--    Untuk tracking periode & carry-over
-- ============================================================
ALTER TABLE applications
  ADD COLUMN period_id       UUID REFERENCES selection_periods(id),
  ADD COLUMN is_carry_over   BOOLEAN DEFAULT FALSE,
  ADD COLUMN carry_over_from UUID REFERENCES applications(id), -- link ke aplikasi periode sebelumnya
  ADD COLUMN carry_over_note TEXT;

-- ============================================================
-- 3. ACCESS CODES (kode akses untuk seleksi terbatas)
--    Komisaris & Dewan Pengawas = internal Pemda
-- ============================================================
CREATE TABLE access_codes (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_id     UUID NOT NULL REFERENCES selection_periods(id),
  code          TEXT NOT NULL,
  label         TEXT,                         -- 'Kode untuk Kepala Dinas'
  issued_to     TEXT,                         -- nama/jabatan penerima (opsional)
  used_by       UUID REFERENCES users(id),
  used_at       TIMESTAMPTZ,
  is_active     BOOLEAN DEFAULT TRUE,
  expires_at    TIMESTAMPTZ,
  created_by    UUID REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Index untuk lookup cepat
CREATE INDEX idx_access_codes_period   ON access_codes(period_id);
CREATE INDEX idx_access_codes_code     ON access_codes(code) WHERE is_active = TRUE;
CREATE INDEX idx_applications_period   ON applications(period_id);
CREATE INDEX idx_applications_carryover ON applications(is_carry_over) WHERE is_carry_over = TRUE;

-- ============================================================
-- 4. CONTENT MANAGEMENT (persyaratan, tahapan, jadwal — editable)
-- ============================================================
CREATE TABLE content_pages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_id   UUID REFERENCES selection_periods(id),  -- NULL = global/semua periode
  page_type   TEXT NOT NULL
    CHECK (page_type IN (
      'persyaratan',      -- persyaratan pendaftaran
      'tahapan',          -- tahapan seleksi
      'jadwal',           -- jadwal pelaksanaan
      'pengumuman',       -- pengumuman seleksi
      'tata_cara',        -- tata cara pendaftaran
      'tentang'           -- tentang seleksi
    )),
  title       TEXT NOT NULL,
  content     TEXT NOT NULL,   -- rich text / markdown
  metadata    JSONB,           -- data terstruktur (jadwal tabel, dll.)
  version     INT DEFAULT 1,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  updated_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TRIGGER trg_content_updated_at BEFORE UPDATE ON content_pages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX idx_content_period_type ON content_pages(period_id, page_type);
CREATE INDEX idx_content_published   ON content_pages(is_published, page_type);

-- ============================================================
-- 5. SEED DATA — Periode Seleksi 2025 & 2026
-- ============================================================

-- === PT. BWR — Seleksi Direksi 2025 (sudah selesai, sumber carry-over) ===
INSERT INTO selection_periods (
  period_code, period_label, bumd_name, bumd_short, bumd_type,
  is_restricted, min_candidates, quota_position, status
) VALUES (
  'BWR-DIREKSI-2025',
  'Seleksi Calon Direksi PT. Banjar Wisata Raya Tahun 2025',
  'PT. Banjar Wisata Raya', 'PT. BWR', 'perseroda',
  FALSE, 5, 3, 'completed'
);

-- === PT. BWR — Seleksi Direksi 2026 (carry-over + pendaftar baru) ===
INSERT INTO selection_periods (
  period_code, period_label, bumd_name, bumd_short, bumd_type,
  is_restricted, min_candidates, quota_position, status, notes
) VALUES (
  'BWR-DIREKSI-2026',
  'Seleksi Calon Direksi PT. Banjar Wisata Raya Tahun 2026',
  'PT. Banjar Wisata Raya', 'PT. BWR', 'perseroda',
  FALSE, 5, 3, 'open',
  '3 calon dari seleksi 2025 carry-over langsung ke tahap UKK. Seleksi dibuka untuk pendaftar baru.'
);

-- === PT. BWR — Seleksi Komisaris 2026 (TERBATAS — internal Pemda) ===
INSERT INTO selection_periods (
  period_code, period_label, bumd_name, bumd_short, bumd_type,
  is_restricted, access_code, min_candidates, quota_position, status, notes
) VALUES (
  'BWR-KOMISARIS-2026',
  'Seleksi Calon Komisaris PT. Banjar Wisata Raya Tahun 2026',
  'PT. Banjar Wisata Raya', 'PT. BWR', 'perseroda',
  TRUE, 'BWR-KOM-2026', 1, 2, 'open',
  'Seleksi terbatas untuk Pejabat Internal Pemerintah Daerah.'
);

-- === Perumdam — Seleksi Dewan Pengawas 2026 (TERBATAS — internal Pemda) ===
INSERT INTO selection_periods (
  period_code, period_label, bumd_name, bumd_short, bumd_type,
  is_restricted, access_code, min_candidates, quota_position, status, notes
) VALUES (
  'PERUMDAM-DEWAS-2026',
  'Seleksi Calon Dewan Pengawas Perumdam Tahun 2026',
  'Perusahaan Umum Daerah Air Minum', 'Perumdam', 'perumda',
  TRUE, 'PERUMDAM-DEWAS-2026', 1, 3, 'open',
  'Seleksi terbatas untuk Pejabat Internal Pemerintah Daerah.'
);

-- ============================================================
-- 6. SEED DATA — Content Pages
-- ============================================================

-- Ambil ID periode yang baru dibuat
DO $$
DECLARE
  v_bwr_direksi_2026  UUID;
  v_bwr_komisaris_2026 UUID;
  v_perumdam_dewas_2026 UUID;
BEGIN
  SELECT id INTO v_bwr_direksi_2026   FROM selection_periods WHERE period_code = 'BWR-DIREKSI-2026';
  SELECT id INTO v_bwr_komisaris_2026  FROM selection_periods WHERE period_code = 'BWR-KOMISARIS-2026';
  SELECT id INTO v_perumdam_dewas_2026 FROM selection_periods WHERE period_code = 'PERUMDAM-DEWAS-2026';

  -- === Pengumuman: Seleksi Direksi & Komisaris PT. BWR 2026 ===
  INSERT INTO content_pages (period_id, page_type, title, content, is_published, published_at)
  VALUES (
    v_bwr_direksi_2026,
    'pengumuman',
    'Pengumuman Seleksi Calon Direksi dan Komisaris PT. Banjar Wisata Raya Tahun 2026',
    E'## Pengumuman\n\n'
    '**Nomor:** [Nomor Pengumuman]\n\n'
    'Panitia Seleksi Calon Direksi dan Komisaris PT. Banjar Wisata Raya (PT. BWR) '
    'memberitahukan bahwa dalam rangka pengisian jabatan Direksi dan Komisaris PT. BWR, '
    'akan dilaksanakan **Seleksi Terbuka** untuk posisi:\n\n'
    '### A. Calon Direksi PT. BWR\n'
    '- Jumlah jabatan: **3 (tiga) orang**\n'
    '- Sifat: **Terbuka untuk Umum**\n'
    '- Catatan: 3 calon yang memenuhi kualifikasi pada seleksi Tahun 2025 **langsung masuk tahap UKK**\n\n'
    '### B. Calon Komisaris PT. BWR\n'
    '- Jumlah jabatan: **2 (dua) orang**\n'
    '- Sifat: **Terbatas — Pejabat Internal Pemerintah Daerah**\n\n'
    '### Dasar Hukum\n'
    '1. Undang-Undang Nomor 23 Tahun 2014 tentang Pemerintahan Daerah\n'
    '2. Peraturan Pemerintah Nomor 54 Tahun 2017 tentang BUMD\n'
    '3. Permendagri Nomor 37 Tahun 2018 tentang Pengangkatan dan Pemberhentian Anggota Dewan Pengawas atau Anggota Komisaris dan Anggota Direksi BUMD\n\n'
    '### Informasi Lebih Lanjut\n'
    'Seluruh informasi mengenai persyaratan, jadwal, dan tahapan seleksi dapat dilihat pada sistem ini.',
    TRUE,
    NOW()
  );

  -- === Pengumuman: Seleksi Dewan Pengawas Perumdam 2026 ===
  INSERT INTO content_pages (period_id, page_type, title, content, is_published, published_at)
  VALUES (
    v_perumdam_dewas_2026,
    'pengumuman',
    'Pengumuman Seleksi Calon Dewan Pengawas Perusahaan Umum Daerah Air Minum Tahun 2026',
    E'## Pengumuman\n\n'
    '**Nomor:** [Nomor Pengumuman]\n\n'
    'Dalam rangka pengisian jabatan Dewan Pengawas Perusahaan Umum Daerah Air Minum (Perumdam), '
    'Pemerintah Daerah membuka seleksi dengan ketentuan sebagai berikut:\n\n'
    '### Jabatan yang Diseleksi\n'
    '**Calon Dewan Pengawas Perumdam**\n'
    '- Jumlah: **3 (tiga) orang**\n'
    '- Sifat: **Terbatas — Pejabat Internal Pemerintah Daerah**\n\n'
    '### Ketentuan Peserta\n'
    'Seleksi ini **hanya diperuntukkan** bagi Pejabat Internal Pemerintah Daerah yang '
    'telah mendapatkan **kode akses** dari panitia seleksi.\n\n'
    '### Dasar Hukum\n'
    '1. Undang-Undang Nomor 23 Tahun 2014 tentang Pemerintahan Daerah\n'
    '2. Peraturan Pemerintah Nomor 54 Tahun 2017 tentang BUMD\n'
    '3. Permendagri Nomor 37 Tahun 2018\n\n'
    '### Pendaftaran\n'
    'Pendaftaran dilakukan secara online melalui sistem ini dengan menggunakan kode akses '
    'yang diterbitkan oleh Panitia Seleksi.',
    TRUE,
    NOW()
  );

  -- === Persyaratan: Direksi PT. BWR ===
  INSERT INTO content_pages (period_id, page_type, title, content, metadata, is_published, published_at)
  VALUES (
    v_bwr_direksi_2026,
    'persyaratan',
    'Persyaratan Pendaftaran Calon Direksi PT. BWR Tahun 2026',
    E'## Persyaratan Umum\n\n'
    '1. Warga Negara Indonesia\n'
    '2. Sehat jasmani dan rohani (dibuktikan dengan surat keterangan dokter)\n'
    '3. Tidak pernah dinyatakan pailit\n'
    '4. Tidak pernah menjadi anggota Direksi, Dewan Pengawas, atau Komisaris yang dinyatakan bersalah menyebabkan BUMD dinyatakan pailit\n'
    '5. Tidak sedang menjalani sanksi pidana\n'
    '6. Tidak sedang menjadi pengurus partai politik\n\n'
    '## Persyaratan Khusus\n\n'
    '1. **Pendidikan:** Minimal Sarjana (S1) semua jurusan, diutamakan S2\n'
    '2. **Pengalaman:** Minimal 5 tahun di bidang yang relevan\n'
    '3. **Usia:** Maksimal 55 tahun pada saat mendaftar\n'
    '4. **Kompetensi:** Memiliki pemahaman di bidang pariwisata, hospitality, atau manajemen bisnis\n\n'
    '## Dokumen yang Diperlukan\n\n'
    '1. Fotokopi KTP yang masih berlaku\n'
    '2. Pas foto terbaru ukuran 4x6 (latar belakang merah)\n'
    '3. Daftar Riwayat Hidup (CV) lengkap\n'
    '4. Fotokopi Ijazah terakhir yang telah dilegalisir\n'
    '5. Fotokopi NPWP\n'
    '6. Surat Keterangan Catatan Kepolisian (SKCK)\n'
    '7. Surat Keterangan Sehat dari Dokter/Rumah Sakit\n'
    '8. Pakta Integritas (format disediakan sistem)\n'
    '9. Surat pernyataan tidak sedang menjadi pengurus partai politik\n'
    '10. Dokumen pendukung lain (sertifikat, pengalaman kerja, dll.)',
    '{"required_docs": ["ktp","pas_foto","cv","ijazah","npwp","skck","surat_kesehatan","pakta_integritas","dok_pendukung"]}',
    TRUE,
    NOW()
  );

  -- === Persyaratan: Komisaris PT. BWR (terbatas) ===
  INSERT INTO content_pages (period_id, page_type, title, content, metadata, is_published, published_at)
  VALUES (
    v_bwr_komisaris_2026,
    'persyaratan',
    'Persyaratan Pendaftaran Calon Komisaris PT. BWR Tahun 2026',
    E'## Ketentuan Peserta\n\n'
    '> ⚠️ Seleksi ini **hanya diperuntukkan** bagi Pejabat Internal Pemerintah Daerah.\n'
    '> Pendaftaran memerlukan **kode akses** yang diterbitkan Panitia Seleksi.\n\n'
    '## Persyaratan Umum\n\n'
    '1. Pejabat aktif di lingkungan Pemerintah Daerah\n'
    '2. Sehat jasmani dan rohani\n'
    '3. Tidak pernah dinyatakan pailit\n'
    '4. Tidak sedang menjalani sanksi pidana atau administratif\n'
    '5. Tidak sedang menjadi pengurus partai politik\n\n'
    '## Persyaratan Khusus\n\n'
    '1. **Jabatan:** Minimal Pejabat Eselon II atau setara\n'
    '2. **Pendidikan:** Minimal Sarjana (S1)\n'
    '3. **Pengalaman:** Memiliki pengetahuan di bidang pengawasan, keuangan, atau bidang yang relevan dengan usaha PT. BWR\n\n'
    '## Dokumen yang Diperlukan\n\n'
    '1. Fotokopi KTP yang masih berlaku\n'
    '2. Pas foto terbaru ukuran 4x6\n'
    '3. Daftar Riwayat Hidup (CV) lengkap\n'
    '4. Fotokopi Ijazah terakhir yang telah dilegalisir\n'
    '5. SK Jabatan terakhir\n'
    '6. Surat Keterangan Sehat\n'
    '7. Pakta Integritas\n'
    '8. Surat rekomendasi dari atasan langsung',
    '{"required_docs": ["ktp","pas_foto","cv","ijazah","skck","surat_kesehatan","pakta_integritas","dok_pendukung"], "access_required": true}',
    TRUE,
    NOW()
  );

  -- === Persyaratan: Dewan Pengawas Perumdam (terbatas) ===
  INSERT INTO content_pages (period_id, page_type, title, content, metadata, is_published, published_at)
  VALUES (
    v_perumdam_dewas_2026,
    'persyaratan',
    'Persyaratan Pendaftaran Calon Dewan Pengawas Perumdam Tahun 2026',
    E'## Ketentuan Peserta\n\n'
    '> ⚠️ Seleksi ini **hanya diperuntukkan** bagi Pejabat Internal Pemerintah Daerah.\n'
    '> Pendaftaran memerlukan **kode akses** yang diterbitkan Panitia Seleksi.\n\n'
    '## Persyaratan Umum\n\n'
    '1. Pejabat aktif di lingkungan Pemerintah Daerah\n'
    '2. Sehat jasmani dan rohani\n'
    '3. Tidak pernah dinyatakan pailit\n'
    '4. Tidak sedang menjalani sanksi hukum\n'
    '5. Tidak sedang menjadi pengurus partai politik\n\n'
    '## Persyaratan Khusus\n\n'
    '1. **Jabatan:** Pejabat Eselon II atau setara di lingkungan Pemerintah Daerah\n'
    '2. **Pendidikan:** Minimal Sarjana (S1)\n'
    '3. **Bidang:** Memiliki kompetensi di bidang pengawasan, keuangan daerah, atau pelayanan air minum\n\n'
    '## Dokumen yang Diperlukan\n\n'
    '1. Fotokopi KTP\n'
    '2. Pas foto terbaru ukuran 4x6\n'
    '3. Daftar Riwayat Hidup\n'
    '4. Fotokopi Ijazah terlegalisir\n'
    '5. SK Jabatan terakhir\n'
    '6. Surat Keterangan Sehat\n'
    '7. Pakta Integritas\n'
    '8. Surat rekomendasi atasan',
    '{"required_docs": ["ktp","pas_foto","cv","ijazah","surat_kesehatan","pakta_integritas","dok_pendukung"], "access_required": true}',
    TRUE,
    NOW()
  );

  -- === Jadwal: Direksi PT. BWR 2026 ===
  INSERT INTO content_pages (period_id, page_type, title, content, metadata, is_published, published_at)
  VALUES (
    v_bwr_direksi_2026,
    'jadwal',
    'Jadwal Pelaksanaan Seleksi Calon Direksi PT. BWR Tahun 2026',
    'Jadwal pelaksanaan seleksi dapat dilihat pada tabel berikut.',
    '{
      "jadwal_items": [
        {"no": 1, "tahapan": "Pengumuman Seleksi", "tanggal": "5 Januari 2026", "keterangan": "Pengumuman resmi melalui sistem dan media"},
        {"no": 2, "tahapan": "Pendaftaran Peserta Baru", "tanggal": "6 – 20 Januari 2026", "keterangan": "Pendaftaran online melalui sistem"},
        {"no": 3, "tahapan": "Verifikasi Administrasi Peserta Baru", "tanggal": "21 – 25 Januari 2026", "keterangan": "Panitia memverifikasi kelengkapan dokumen"},
        {"no": 4, "tahapan": "Pengumuman Lolos Administrasi", "tanggal": "27 Januari 2026", "keterangan": "Termasuk 3 calon carry-over 2025"},
        {"no": 5, "tahapan": "Uji Kompetensi dan Kelayakan (UKK)", "tanggal": "3 – 7 Februari 2026", "keterangan": "Diikuti semua calon yang lolos administrasi"},
        {"no": 6, "tahapan": "Pengumuman Hasil UKK", "tanggal": "10 Februari 2026", "keterangan": ""},
        {"no": 7, "tahapan": "Wawancara RUPS", "tanggal": "17 – 19 Februari 2026", "keterangan": "Wawancara oleh pemegang saham"},
        {"no": 8, "tahapan": "Penetapan Calon Terpilih", "tanggal": "24 Februari 2026", "keterangan": ""},
        {"no": 9, "tahapan": "Penandatanganan Kontrak Kinerja", "tanggal": "3 Maret 2026", "keterangan": ""},
        {"no": 10, "tahapan": "Pengangkatan / SK Direksi", "tanggal": "10 Maret 2026", "keterangan": ""}
      ]
    }',
    TRUE,
    NOW()
  );

  -- === Jadwal: Komisaris PT. BWR 2026 ===
  INSERT INTO content_pages (period_id, page_type, title, content, metadata, is_published, published_at)
  VALUES (
    v_bwr_komisaris_2026,
    'jadwal',
    'Jadwal Pelaksanaan Seleksi Calon Komisaris PT. BWR Tahun 2026',
    'Jadwal pelaksanaan seleksi Komisaris PT. BWR.',
    '{
      "jadwal_items": [
        {"no": 1, "tahapan": "Pengumuman Internal", "tanggal": "5 Januari 2026", "keterangan": "Disampaikan melalui surat resmi kepada unit Pemda"},
        {"no": 2, "tahapan": "Pendistribusian Kode Akses", "tanggal": "5 – 10 Januari 2026", "keterangan": "Panitia menerbitkan kode akses untuk pejabat yang ditunjuk"},
        {"no": 3, "tahapan": "Pendaftaran", "tanggal": "6 – 20 Januari 2026", "keterangan": "Self-register dengan kode akses internal"},
        {"no": 4, "tahapan": "Verifikasi Administrasi", "tanggal": "21 – 25 Januari 2026", "keterangan": ""},
        {"no": 5, "tahapan": "Uji Kompetensi dan Kelayakan (UKK)", "tanggal": "3 – 7 Februari 2026", "keterangan": ""},
        {"no": 6, "tahapan": "Wawancara RUPS", "tanggal": "17 – 19 Februari 2026", "keterangan": ""},
        {"no": 7, "tahapan": "Penetapan dan Pengangkatan", "tanggal": "Maret 2026", "keterangan": ""}
      ]
    }',
    TRUE,
    NOW()
  );

  -- === Jadwal: Dewan Pengawas Perumdam 2026 ===
  INSERT INTO content_pages (period_id, page_type, title, content, metadata, is_published, published_at)
  VALUES (
    v_perumdam_dewas_2026,
    'jadwal',
    'Jadwal Pelaksanaan Seleksi Calon Dewan Pengawas Perumdam Tahun 2026',
    'Jadwal pelaksanaan seleksi Dewan Pengawas Perumdam.',
    '{
      "jadwal_items": [
        {"no": 1, "tahapan": "Pengumuman Internal", "tanggal": "5 Januari 2026", "keterangan": "Surat resmi ke unit Pemda"},
        {"no": 2, "tahapan": "Pendistribusian Kode Akses", "tanggal": "5 – 10 Januari 2026", "keterangan": ""},
        {"no": 3, "tahapan": "Pendaftaran", "tanggal": "6 – 20 Januari 2026", "keterangan": "Self-register dengan kode akses"},
        {"no": 4, "tahapan": "Verifikasi Administrasi", "tanggal": "21 – 25 Januari 2026", "keterangan": ""},
        {"no": 5, "tahapan": "Pengumuman Lolos Administrasi", "tanggal": "27 Januari 2026", "keterangan": ""},
        {"no": 6, "tahapan": "UKK / Uji Kelayakan", "tanggal": "3 – 7 Februari 2026", "keterangan": ""},
        {"no": 7, "tahapan": "Wawancara KPM", "tanggal": "17 – 19 Februari 2026", "keterangan": "Wawancara oleh KPM (Kepala Daerah)"},
        {"no": 8, "tahapan": "Penetapan dan Pengangkatan", "tanggal": "Maret 2026", "keterangan": ""}
      ]
    }',
    TRUE,
    NOW()
  );

  -- === Tahapan Seleksi: Direksi PT. BWR 2026 ===
  INSERT INTO content_pages (period_id, page_type, title, content, metadata, is_published, published_at)
  VALUES (
    v_bwr_direksi_2026,
    'tahapan',
    'Tahapan Seleksi Calon Direksi PT. BWR Tahun 2026',
    'Seleksi dilaksanakan melalui tahapan berikut.',
    '{
      "tahapan_items": [
        {"no": 1, "nama": "Pengumuman Seleksi", "deskripsi": "Panitia menerbitkan pengumuman resmi seleksi terbuka", "icon": "megaphone"},
        {"no": 2, "nama": "Pendaftaran Online", "deskripsi": "Calon mengisi formulir dan mengunggah dokumen melalui sistem", "icon": "file-text"},
        {"no": 3, "nama": "Verifikasi Administrasi", "deskripsi": "Panitia memeriksa kelengkapan dan keabsahan dokumen", "icon": "check-circle"},
        {"no": 4, "nama": "Pengumuman Lolos Administrasi", "deskripsi": "Penetapan peserta yang berhak mengikuti UKK. Calon carry-over 2025 otomatis lolos.", "icon": "award"},
        {"no": 5, "nama": "Uji Kompetensi & Kelayakan (UKK)", "deskripsi": "Tes kompetensi teknis, psikologi, presentasi makalah, dan wawancara UKK", "icon": "clipboard"},
        {"no": 6, "nama": "Penetapan Hasil UKK", "deskripsi": "Tim UKK menetapkan calon yang memenuhi syarat minimal", "icon": "bar-chart"},
        {"no": 7, "nama": "Wawancara RUPS", "deskripsi": "Calon yang lolos UKK diwawancarai oleh pemegang saham (RUPS)", "icon": "users"},
        {"no": 8, "nama": "Penetapan Calon Terpilih", "deskripsi": "Ditetapkan oleh RUPS sesuai mekanisme perseroan", "icon": "star"},
        {"no": 9, "nama": "Penandatanganan Kontrak Kinerja", "deskripsi": "Calon terpilih menandatangani kontrak kinerja", "icon": "pen-tool"},
        {"no": 10, "nama": "Pengangkatan", "deskripsi": "Penerbitan SK Pengangkatan oleh pejabat berwenang", "icon": "shield"}
      ]
    }',
    TRUE,
    NOW()
  );

END $$;

-- ============================================================
-- 7. FUNCTION: Carry-over candidates (3 calon direksi 2025)
--    Dipanggil saat setup periode 2026
-- ============================================================
CREATE OR REPLACE FUNCTION carry_over_candidates(
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
  SELECT id INTO v_from_period FROM selection_periods WHERE period_code = p_from_period_code;
  SELECT id INTO v_to_period   FROM selection_periods WHERE period_code = p_to_period_code;

  IF v_from_period IS NULL OR v_to_period IS NULL THEN
    RAISE EXCEPTION 'Period code not found';
  END IF;

  -- Ambil aplikasi yang qualified dari periode sebelumnya
  FOR v_rec IN
    SELECT
      a.id         AS app_id,
      a.position_id,
      a.participant_id,
      p.full_name
    FROM applications a
    JOIN participants p ON a.participant_id = p.id
    WHERE a.period_id = v_from_period
      AND a.status = 'lolos_ukk'   -- hanya yang memenuhi kualifikasi UKK
    ORDER BY a.created_at
  LOOP
    -- Buat aplikasi baru di periode 2026
    INSERT INTO applications (
      participant_id,
      position_id,
      period_id,
      status,
      is_carry_over,
      carry_over_from,
      carry_over_note,
      submitted_at
    ) VALUES (
      v_rec.participant_id,
      v_rec.position_id,
      v_to_period,
      'lolos_administrasi',   -- langsung lolos administrasi
      TRUE,
      v_rec.app_id,
      'Carry-over dari seleksi ' || p_from_period_code || '. Langsung masuk tahap UKK.',
      NOW()
    )
    RETURNING id INTO v_new_app;

    application_id     := v_rec.app_id;
    participant_name   := v_rec.full_name;
    new_application_id := v_new_app;
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. FUNCTION: Validate access code untuk pendaftaran terbatas
-- ============================================================
CREATE OR REPLACE FUNCTION validate_access_code(
  p_period_id UUID,
  p_code      TEXT,
  p_user_id   UUID
)
RETURNS JSONB AS $$
DECLARE
  v_code_rec access_codes%ROWTYPE;
  v_period   selection_periods%ROWTYPE;
BEGIN
  SELECT * INTO v_period FROM selection_periods WHERE id = p_period_id;

  -- Cek apakah periode memang memerlukan kode akses
  IF NOT v_period.is_restricted THEN
    RETURN '{"valid": true, "message": "Seleksi terbuka, kode akses tidak diperlukan"}'::JSONB;
  END IF;

  -- Validasi kode akses
  SELECT * INTO v_code_rec
  FROM access_codes
  WHERE period_id = p_period_id
    AND code = p_code
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
    AND used_by IS NULL;  -- belum digunakan

  IF v_code_rec.id IS NULL THEN
    RETURN '{"valid": false, "message": "Kode akses tidak valid, sudah digunakan, atau sudah kadaluarsa"}'::JSONB;
  END IF;

  -- Tandai kode sebagai telah digunakan
  UPDATE access_codes
  SET used_by = p_user_id, used_at = NOW()
  WHERE id = v_code_rec.id;

  RETURN jsonb_build_object(
    'valid', true,
    'message', 'Kode akses valid',
    'code_id', v_code_rec.id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 9. VIEW: Ringkasan status per periode (untuk dashboard)
-- ============================================================
CREATE OR REPLACE VIEW v_period_summary AS
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
  COUNT(a.id)                                              AS total_applicants,
  COUNT(a.id) FILTER (WHERE a.is_carry_over)               AS carry_over_count,
  COUNT(a.id) FILTER (WHERE a.status = 'lolos_administrasi'
    OR a.status IN ('ikut_ukk','lolos_ukk','tidak_lolos_ukk',
                    'ikut_wawancara','lolos_wawancara',
                    'tidak_lolos_wawancara','terpilih','kontrak','diangkat')) AS passed_admin,
  COUNT(a.id) FILTER (WHERE a.status IN ('lolos_ukk','ikut_wawancara',
                    'lolos_wawancara','tidak_lolos_wawancara',
                    'terpilih','kontrak','diangkat'))        AS passed_ukk,
  COUNT(a.id) FILTER (WHERE a.status IN ('terpilih','kontrak','diangkat')) AS selected,
  COUNT(a.id) FILTER (WHERE a.status = 'diangkat')          AS appointed
FROM selection_periods sp
LEFT JOIN applications a ON a.period_id = sp.id
GROUP BY sp.id;

-- RLS untuk views — expose ke panitia dan admin
ALTER VIEW v_period_summary OWNER TO postgres;
GRANT SELECT ON v_period_summary TO authenticated;

-- ============================================================
-- 10. RLS untuk tabel baru
-- ============================================================
ALTER TABLE selection_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_codes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_pages     ENABLE ROW LEVEL SECURITY;

-- selection_periods: semua authenticated bisa baca
CREATE POLICY sp_select ON selection_periods FOR SELECT USING (TRUE);
CREATE POLICY sp_write  ON selection_periods FOR ALL   USING (is_panitia_or_admin());

-- access_codes: hanya admin/panitia bisa kelola
CREATE POLICY ac_select ON access_codes FOR SELECT USING (is_panitia_or_admin());
CREATE POLICY ac_insert ON access_codes FOR INSERT WITH CHECK (is_panitia_or_admin());
CREATE POLICY ac_update ON access_codes FOR UPDATE USING (is_panitia_or_admin());

-- content_pages: published bisa dibaca semua; edit hanya panitia/admin
CREATE POLICY cp_select_public  ON content_pages FOR SELECT USING (is_published = TRUE OR is_panitia_or_admin());
CREATE POLICY cp_write          ON content_pages FOR ALL   USING (is_panitia_or_admin());
