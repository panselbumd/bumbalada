-- ============================================================
-- SIMBUMD – Skema Database Lengkap
-- Pemerintah Kota Batu
-- Versi: 1.0.0
-- ============================================================

-- Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================

CREATE TYPE user_role AS ENUM (
  'superadmin',
  'admin',
  'panitia_seleksi',
  'penilai',
  'viewer_eksekutif',
  'bumd_operator'
);

CREATE TYPE user_status AS ENUM ('aktif', 'nonaktif', 'pending');

CREATE TYPE bumd_type AS ENUM ('perseroda', 'perumda');

CREATE TYPE health_level AS ENUM ('sehat', 'kurang_sehat', 'tidak_sehat');

CREATE TYPE auditor_opinion AS ENUM ('WTP', 'WTP_DPP', 'WDP', 'TMP', 'belum');

CREATE TYPE kpi_status AS ENUM ('melebihi_target', 'tercapai', 'tidak_tercapai');

CREATE TYPE seleksi_status AS ENUM (
  'draft', 'dibuka', 'seleksi_administrasi', 'ukk', 'wawancara', 'selesai', 'dibatalkan'
);

CREATE TYPE peserta_status AS ENUM (
  'terdaftar', 'review_dokumen', 'lolos_administrasi',
  'tidak_lolos_administrasi', 'lolos_ukk', 'tidak_lolos_ukk',
  'lolos_wawancara', 'tidak_lolos_wawancara', 'ditetapkan'
);

CREATE TYPE log_action AS ENUM (
  'login', 'logout', 'create', 'update', 'delete', 'export',
  'submit_laporan', 'reset_password', 'change_role'
);

-- ============================================================
-- TABEL: profiles (extends auth.users)
-- ============================================================

CREATE TABLE profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nip           VARCHAR(20) UNIQUE,
  nama_lengkap  TEXT NOT NULL,
  email         TEXT NOT NULL,
  role          user_role NOT NULL DEFAULT 'viewer_eksekutif',
  unit_kerja    TEXT,
  jabatan       TEXT,
  no_hp         VARCHAR(20),
  avatar_url    TEXT,
  status        user_status NOT NULL DEFAULT 'pending',
  tahun_aktif   SMALLINT DEFAULT EXTRACT(YEAR FROM NOW()),
  expired_at    TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABEL: bumd
-- ============================================================

CREATE TABLE bumd (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kode        VARCHAR(10) UNIQUE NOT NULL,
  nama        TEXT NOT NULL,
  singkatan   VARCHAR(20),
  jenis       bumd_type NOT NULL,
  alamat      TEXT,
  telepon     VARCHAR(20),
  email       TEXT,
  website     TEXT,
  modal_dasar BIGINT,
  saham_pemda NUMERIC(5,2) DEFAULT 100.00,
  direktur    TEXT,
  aktif       BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABEL: blud
-- ============================================================

CREATE TABLE blud (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kode        VARCHAR(10) UNIQUE NOT NULL,
  nama        TEXT NOT NULL,
  singkatan   VARCHAR(20),
  jenis       TEXT,
  alamat      TEXT,
  direktur    TEXT,
  aktif       BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABEL: laporan_kinerja_bumd
-- ============================================================

CREATE TABLE laporan_kinerja_bumd (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bumd_id           UUID NOT NULL REFERENCES bumd(id),
  tahun             SMALLINT NOT NULL,
  triwulan          SMALLINT NOT NULL CHECK (triwulan BETWEEN 1 AND 4),
  -- RKAP
  target_pendapatan BIGINT,
  realisasi_pendapatan BIGINT,
  target_laba       BIGINT,
  realisasi_laba    BIGINT,
  -- Keuangan
  total_aset        BIGINT,
  total_kewajiban   BIGINT,
  ekuitas           BIGINT,
  dividen           BIGINT,
  -- Evaluasi
  skor_kesehatan    NUMERIC(5,2),
  level_kesehatan   health_level,
  opini_auditor     auditor_opinion DEFAULT 'belum',
  catatan           TEXT,
  -- Status submit
  submitted_at      TIMESTAMPTZ,
  submitted_by      UUID REFERENCES profiles(id),
  approved_at       TIMESTAMPTZ,
  approved_by       UUID REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bumd_id, tahun, triwulan)
);

-- ============================================================
-- TABEL: laporan_kinerja_blud
-- ============================================================

CREATE TABLE laporan_kinerja_blud (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blud_id         UUID NOT NULL REFERENCES blud(id),
  tahun           SMALLINT NOT NULL,
  triwulan        SMALLINT NOT NULL CHECK (triwulan BETWEEN 1 AND 4),
  rba_target      BIGINT,
  rba_realisasi   BIGINT,
  spm_capaian     NUMERIC(5,2),
  cost_recovery   NUMERIC(5,2),
  skor_kepatuhan  NUMERIC(5,2),
  catatan         TEXT,
  submitted_at    TIMESTAMPTZ,
  submitted_by    UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(blud_id, tahun, triwulan)
);

-- ============================================================
-- TABEL: kpi_bumd
-- ============================================================

CREATE TABLE kpi_bumd (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bumd_id     UUID NOT NULL REFERENCES bumd(id),
  tahun       SMALLINT NOT NULL,
  triwulan    SMALLINT NOT NULL CHECK (triwulan BETWEEN 1 AND 4),
  indikator   TEXT NOT NULL,
  target      TEXT NOT NULL,
  realisasi   TEXT,
  capaian_pct NUMERIC(6,2),
  status      kpi_status,
  catatan     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABEL: proses_seleksi
-- ============================================================

CREATE TABLE proses_seleksi (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kode            VARCHAR(20) UNIQUE NOT NULL,
  judul           TEXT NOT NULL,
  bumd_id         UUID REFERENCES bumd(id),
  blud_id         UUID REFERENCES blud(id),
  jabatan         TEXT NOT NULL,
  kuota           SMALLINT NOT NULL DEFAULT 1,
  status          seleksi_status NOT NULL DEFAULT 'draft',
  -- Jadwal
  buka_pendaftaran    TIMESTAMPTZ,
  tutup_pendaftaran   TIMESTAMPTZ,
  jadwal_ukk          TIMESTAMPTZ,
  jadwal_wawancara    TIMESTAMPTZ,
  pengumuman_at       TIMESTAMPTZ,
  -- Persyaratan
  syarat_umum     TEXT,
  syarat_khusus   TEXT,
  -- Ketua panitia
  ketua_panitia_id UUID REFERENCES profiles(id),
  catatan         TEXT,
  created_by      UUID REFERENCES profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABEL: peserta_seleksi
-- ============================================================

CREATE TABLE peserta_seleksi (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seleksi_id      UUID NOT NULL REFERENCES proses_seleksi(id),
  -- Data peserta
  nama_lengkap    TEXT NOT NULL,
  nik             VARCHAR(16) NOT NULL,
  tempat_lahir    TEXT,
  tanggal_lahir   DATE,
  jenis_kelamin   CHAR(1) CHECK (jenis_kelamin IN ('L','P')),
  alamat          TEXT,
  email           TEXT,
  no_hp           VARCHAR(20),
  pendidikan      TEXT,
  jurusan         TEXT,
  institusi       TEXT,
  pengalaman_tahun SMALLINT,
  pekerjaan_saat_ini TEXT,
  -- Status & Nilai
  status          peserta_status NOT NULL DEFAULT 'terdaftar',
  nilai_administrasi NUMERIC(5,2),
  nilai_ukk       NUMERIC(5,2),
  nilai_wawancara NUMERIC(5,2),
  nilai_akhir     NUMERIC(5,2),
  ranking         SMALLINT,
  catatan_panitia TEXT,
  -- Audit
  registered_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABEL: dokumen_peserta
-- ============================================================

CREATE TABLE dokumen_peserta (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  peserta_id   UUID NOT NULL REFERENCES peserta_seleksi(id) ON DELETE CASCADE,
  jenis_dokumen TEXT NOT NULL,
  file_name    TEXT NOT NULL,
  file_path    TEXT NOT NULL,  -- Supabase Storage path
  file_size    INTEGER,
  verified     BOOLEAN DEFAULT FALSE,
  verified_by  UUID REFERENCES profiles(id),
  verified_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABEL: penilaian_ukk
-- ============================================================

CREATE TABLE penilaian_ukk (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  peserta_id   UUID NOT NULL REFERENCES peserta_seleksi(id),
  penilai_id   UUID NOT NULL REFERENCES profiles(id),
  -- Komponen nilai
  nilai_kompetensi_teknis  NUMERIC(5,2),
  nilai_kepemimpinan       NUMERIC(5,2),
  nilai_manajemen          NUMERIC(5,2),
  nilai_integritas         NUMERIC(5,2),
  nilai_inovasi            NUMERIC(5,2),
  -- Bobot otomatis dihitung
  nilai_total   NUMERIC(5,2) GENERATED ALWAYS AS (
    COALESCE(nilai_kompetensi_teknis,0) * 0.30 +
    COALESCE(nilai_kepemimpinan,0)      * 0.25 +
    COALESCE(nilai_manajemen,0)         * 0.20 +
    COALESCE(nilai_integritas,0)        * 0.15 +
    COALESCE(nilai_inovasi,0)           * 0.10
  ) STORED,
  rekomendasi  TEXT,
  dinilai_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(peserta_id, penilai_id)
);

-- ============================================================
-- TABEL: penilaian_wawancara
-- ============================================================

CREATE TABLE penilaian_wawancara (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  peserta_id    UUID NOT NULL REFERENCES peserta_seleksi(id),
  penilai_id    UUID NOT NULL REFERENCES profiles(id),
  nilai_visi    NUMERIC(5,2),
  nilai_program NUMERIC(5,2),
  nilai_komunikasi NUMERIC(5,2),
  nilai_problem_solving NUMERIC(5,2),
  nilai_total   NUMERIC(5,2) GENERATED ALWAYS AS (
    COALESCE(nilai_visi,0)            * 0.30 +
    COALESCE(nilai_program,0)         * 0.30 +
    COALESCE(nilai_komunikasi,0)      * 0.20 +
    COALESCE(nilai_problem_solving,0) * 0.20
  ) STORED,
  rekomendasi   TEXT,
  dinilai_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(peserta_id, penilai_id)
);

-- ============================================================
-- TABEL: audit_log
-- ============================================================

CREATE TABLE audit_log (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID REFERENCES profiles(id),
  action     log_action NOT NULL,
  modul      TEXT,
  deskripsi  TEXT NOT NULL,
  metadata   JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABEL: sesi_aktif
-- ============================================================

CREATE TABLE sesi_aktif (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  device_info  TEXT,
  ip_address   INET,
  user_agent   TEXT,
  last_active  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABEL: notifikasi
-- ============================================================

CREATE TABLE notifikasi (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  judul      TEXT NOT NULL,
  isi        TEXT NOT NULL,
  tipe       TEXT DEFAULT 'info',
  dibaca     BOOLEAN DEFAULT FALSE,
  link       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEKS untuk performa query
-- ============================================================

CREATE INDEX idx_profiles_role          ON profiles(role);
CREATE INDEX idx_profiles_status        ON profiles(status);
CREATE INDEX idx_laporan_bumd_period    ON laporan_kinerja_bumd(bumd_id, tahun, triwulan);
CREATE INDEX idx_laporan_blud_period    ON laporan_kinerja_blud(blud_id, tahun, triwulan);
CREATE INDEX idx_kpi_period             ON kpi_bumd(bumd_id, tahun, triwulan);
CREATE INDEX idx_seleksi_status         ON proses_seleksi(status);
CREATE INDEX idx_peserta_seleksi        ON peserta_seleksi(seleksi_id, status);
CREATE INDEX idx_audit_user             ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_action           ON audit_log(action, created_at DESC);
CREATE INDEX idx_notifikasi_user        ON notifikasi(user_id, dibaca);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE laporan_kinerja_bumd  ENABLE ROW LEVEL SECURITY;
ALTER TABLE laporan_kinerja_blud  ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_bumd              ENABLE ROW LEVEL SECURITY;
ALTER TABLE proses_seleksi        ENABLE ROW LEVEL SECURITY;
ALTER TABLE peserta_seleksi       ENABLE ROW LEVEL SECURITY;
ALTER TABLE dokumen_peserta       ENABLE ROW LEVEL SECURITY;
ALTER TABLE penilaian_ukk         ENABLE ROW LEVEL SECURITY;
ALTER TABLE penilaian_wawancara   ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log             ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesi_aktif            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifikasi            ENABLE ROW LEVEL SECURITY;
ALTER TABLE bumd                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE blud                  ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: is admin or above
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN ('superadmin', 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ===== PROFILES RLS =====
-- Semua user bisa lihat profil sendiri
CREATE POLICY "profiles_select_own"  ON profiles FOR SELECT USING (id = auth.uid() OR is_admin());
CREATE POLICY "profiles_update_own"  ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_admin_all"   ON profiles FOR ALL    USING (is_admin());

-- ===== BUMD / BLUD — semua role aktif bisa lihat =====
CREATE POLICY "bumd_read_all"  ON bumd FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "bumd_admin_write" ON bumd FOR ALL USING (is_admin());
CREATE POLICY "blud_read_all"  ON blud FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "blud_admin_write" ON blud FOR ALL USING (is_admin());

-- ===== LAPORAN KINERJA =====
CREATE POLICY "laporan_bumd_read"   ON laporan_kinerja_bumd FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "laporan_bumd_write"  ON laporan_kinerja_bumd FOR ALL USING (is_admin() OR get_user_role() = 'bumd_operator');
CREATE POLICY "laporan_blud_read"   ON laporan_kinerja_blud FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "laporan_blud_write"  ON laporan_kinerja_blud FOR ALL USING (is_admin() OR get_user_role() = 'bumd_operator');

-- ===== KPI =====
CREATE POLICY "kpi_read"  ON kpi_bumd FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "kpi_write" ON kpi_bumd FOR ALL USING (is_admin() OR get_user_role() = 'bumd_operator');

-- ===== SELEKSI =====
CREATE POLICY "seleksi_read_all"   ON proses_seleksi FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "seleksi_panitia_write" ON proses_seleksi FOR ALL
  USING (is_admin() OR get_user_role() = 'panitia_seleksi');

-- ===== PESERTA =====
CREATE POLICY "peserta_read_panitia" ON peserta_seleksi FOR SELECT
  USING (auth.uid() IS NOT NULL AND get_user_role() IN ('superadmin','admin','panitia_seleksi','penilai'));
CREATE POLICY "peserta_write_panitia" ON peserta_seleksi FOR ALL
  USING (is_admin() OR get_user_role() = 'panitia_seleksi');

-- ===== DOKUMEN =====
CREATE POLICY "dokumen_panitia_read"  ON dokumen_peserta FOR SELECT
  USING (get_user_role() IN ('superadmin','admin','panitia_seleksi'));
CREATE POLICY "dokumen_panitia_write" ON dokumen_peserta FOR ALL
  USING (is_admin() OR get_user_role() = 'panitia_seleksi');

-- ===== PENILAIAN =====
CREATE POLICY "ukk_penilai_own"     ON penilaian_ukk FOR ALL USING (penilai_id = auth.uid() OR is_admin());
CREATE POLICY "ukk_read_admin"      ON penilaian_ukk FOR SELECT USING (is_admin() OR get_user_role() = 'panitia_seleksi');
CREATE POLICY "wawancara_penilai"   ON penilaian_wawancara FOR ALL USING (penilai_id = auth.uid() OR is_admin());

-- ===== AUDIT LOG =====
CREATE POLICY "audit_admin_read"  ON audit_log FOR SELECT USING (is_admin());
CREATE POLICY "audit_insert_all"  ON audit_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ===== SESI =====
CREATE POLICY "sesi_own"         ON sesi_aktif FOR ALL USING (user_id = auth.uid() OR is_admin());

-- ===== NOTIFIKASI =====
CREATE POLICY "notif_own"        ON notifikasi FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- FUNGSI & TRIGGER
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_profiles         BEFORE UPDATE ON profiles              FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_bumd             BEFORE UPDATE ON bumd                  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_blud             BEFORE UPDATE ON blud                  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_laporan_bumd     BEFORE UPDATE ON laporan_kinerja_bumd  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_laporan_blud     BEFORE UPDATE ON laporan_kinerja_blud  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_seleksi          BEFORE UPDATE ON proses_seleksi        FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_peserta          BEFORE UPDATE ON peserta_seleksi       FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

-- Auto-create profile saat user baru daftar via Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, nama_lengkap, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', split_part(NEW.email, '@', 1)),
    'pending'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Hitung nilai akhir peserta (rata-rata berbobot)
CREATE OR REPLACE FUNCTION hitung_nilai_akhir(p_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_admin   NUMERIC;
  v_ukk     NUMERIC;
  v_wawancara NUMERIC;
  v_akhir   NUMERIC;
BEGIN
  SELECT nilai_administrasi, nilai_ukk, nilai_wawancara
    INTO v_admin, v_ukk, v_wawancara
    FROM peserta_seleksi WHERE id = p_id;

  v_akhir := COALESCE(v_admin,0) * 0.20
           + COALESCE(v_ukk,0)   * 0.50
           + COALESCE(v_wawancara,0) * 0.30;

  UPDATE peserta_seleksi SET nilai_akhir = ROUND(v_akhir,2) WHERE id = p_id;
  RETURN ROUND(v_akhir, 2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- DATA SEED — Master BUMD & BLUD Kota Batu
-- ============================================================

INSERT INTO bumd (kode, nama, singkatan, jenis, direktur) VALUES
  ('BWR',  'PT Batu Wisata Resource',              'PT BWR',  'perseroda', 'Drs. Andi Susanto, M.Si.'),
  ('PDAM', 'Perumdam Air Tirta Kencana',           'Perumdam','perumda',   'Ir. Budi Raharjo, M.T.'),
  ('BATU', 'PT Batu Alam Indah',                   'PT BAI',  'perseroda', 'Dr. Sri Lestari, M.M.'),
  ('PSAR', 'PD Pasar Kota Batu',                   'PD Pasar','perumda',   'Drs. Hendra Wibowo'),
  ('BPI',  'PT Batu Properti Investama',            'PT BPI',  'perseroda', 'Slamet Haryono, S.E., M.M.'),
  ('PARK', 'Perumda Perparkiran Kota Batu',         'Perumda Parkir','perumda','Wahyu Santoso, S.T.');

INSERT INTO blud (kode, nama, singkatan, jenis) VALUES
  ('RSUD',  'RSUD Kota Batu',                      'RSUD Batu',   'rumah_sakit'),
  ('PKM-A', 'Puskesmas BLUD Bumiaji',              'PKM Bumiaji', 'puskesmas'),
  ('PKM-B', 'Puskesmas BLUD Batu',                 'PKM Batu',    'puskesmas'),
  ('LAB',   'Laboratorium Klinik BLUD Kota Batu',  'Lab BLUD',    'laboratorium');

-- ============================================================
-- SUPABASE STORAGE BUCKETS (jalankan via Dashboard atau CLI)
-- ============================================================
-- INSERT INTO storage.buckets (id, name, public) VALUES
--   ('dokumen-peserta', 'dokumen-peserta', false),
--   ('foto-profil',     'foto-profil',     true);
