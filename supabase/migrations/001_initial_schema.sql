-- ============================================================
-- SIMBUBALADA – Skema Database Lengkap
-- Pemerintah Kota Batu · Versi 1.0.1
-- IDEMPOTENT: Aman dijalankan berulang kali
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM TYPES (DO $$ IF NOT EXISTS workaround untuk PostgreSQL)
-- ============================================================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'superadmin','admin','panitia_seleksi',
    'penilai','viewer_eksekutif','bumd_operator'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('aktif','nonaktif','pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE bumd_type AS ENUM ('perseroda','perumda');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE health_level AS ENUM ('sehat','kurang_sehat','tidak_sehat');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE auditor_opinion AS ENUM ('WTP','WTP_DPP','WDP','TMP','belum');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE kpi_status AS ENUM ('melebihi_target','tercapai','tidak_tercapai');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE seleksi_status AS ENUM (
    'draft','dibuka','seleksi_administrasi',
    'ukk','wawancara','selesai','dibatalkan'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE peserta_status AS ENUM (
    'terdaftar','review_dokumen','lolos_administrasi',
    'tidak_lolos_administrasi','lolos_ukk','tidak_lolos_ukk',
    'lolos_wawancara','tidak_lolos_wawancara','ditetapkan'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE log_action AS ENUM (
    'login','logout','create','update','delete','export',
    'submit_laporan','reset_password','change_role'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- TABEL: profiles
-- ============================================================

CREATE TABLE IF NOT EXISTS profiles (
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

CREATE TABLE IF NOT EXISTS bumd (
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

CREATE TABLE IF NOT EXISTS blud (
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

CREATE TABLE IF NOT EXISTS laporan_kinerja_bumd (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bumd_id              UUID NOT NULL REFERENCES bumd(id),
  tahun                SMALLINT NOT NULL,
  triwulan             SMALLINT NOT NULL CHECK (triwulan BETWEEN 1 AND 4),
  target_pendapatan    BIGINT,
  realisasi_pendapatan BIGINT,
  target_laba          BIGINT,
  realisasi_laba       BIGINT,
  total_aset           BIGINT,
  total_kewajiban      BIGINT,
  ekuitas              BIGINT,
  dividen              BIGINT,
  skor_kesehatan       NUMERIC(5,2),
  level_kesehatan      health_level,
  opini_auditor        auditor_opinion DEFAULT 'belum',
  catatan              TEXT,
  submitted_at         TIMESTAMPTZ,
  submitted_by         UUID REFERENCES profiles(id),
  approved_at          TIMESTAMPTZ,
  approved_by          UUID REFERENCES profiles(id),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(bumd_id, tahun, triwulan)
);

-- ============================================================
-- TABEL: laporan_kinerja_blud
-- ============================================================

CREATE TABLE IF NOT EXISTS laporan_kinerja_blud (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blud_id        UUID NOT NULL REFERENCES blud(id),
  tahun          SMALLINT NOT NULL,
  triwulan       SMALLINT NOT NULL CHECK (triwulan BETWEEN 1 AND 4),
  rba_target     BIGINT,
  rba_realisasi  BIGINT,
  spm_capaian    NUMERIC(5,2),
  cost_recovery  NUMERIC(5,2),
  skor_kepatuhan NUMERIC(5,2),
  catatan        TEXT,
  submitted_at   TIMESTAMPTZ,
  submitted_by   UUID REFERENCES profiles(id),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(blud_id, tahun, triwulan)
);

-- ============================================================
-- TABEL: kpi_bumd
-- ============================================================

CREATE TABLE IF NOT EXISTS kpi_bumd (
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

CREATE TABLE IF NOT EXISTS proses_seleksi (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  kode             VARCHAR(20) UNIQUE NOT NULL,
  judul            TEXT NOT NULL,
  bumd_id          UUID REFERENCES bumd(id),
  blud_id          UUID REFERENCES blud(id),
  jabatan          TEXT NOT NULL,
  kuota            SMALLINT NOT NULL DEFAULT 1,
  status           seleksi_status NOT NULL DEFAULT 'draft',
  buka_pendaftaran TIMESTAMPTZ,
  tutup_pendaftaran TIMESTAMPTZ,
  jadwal_ukk       TIMESTAMPTZ,
  jadwal_wawancara TIMESTAMPTZ,
  pengumuman_at    TIMESTAMPTZ,
  syarat_umum      TEXT,
  syarat_khusus    TEXT,
  ketua_panitia_id UUID REFERENCES profiles(id),
  catatan          TEXT,
  created_by       UUID REFERENCES profiles(id),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABEL: peserta_seleksi
-- ============================================================

CREATE TABLE IF NOT EXISTS peserta_seleksi (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seleksi_id         UUID NOT NULL REFERENCES proses_seleksi(id),
  nama_lengkap       TEXT NOT NULL,
  nik                VARCHAR(16) NOT NULL,
  tempat_lahir       TEXT,
  tanggal_lahir      DATE,
  jenis_kelamin      CHAR(1) CHECK (jenis_kelamin IN ('L','P')),
  alamat             TEXT,
  email              TEXT,
  no_hp              VARCHAR(20),
  pendidikan         TEXT,
  jurusan            TEXT,
  institusi          TEXT,
  pengalaman_tahun   SMALLINT,
  pekerjaan_saat_ini TEXT,
  status             peserta_status NOT NULL DEFAULT 'terdaftar',
  nilai_administrasi NUMERIC(5,2),
  nilai_ukk          NUMERIC(5,2),
  nilai_wawancara    NUMERIC(5,2),
  nilai_akhir        NUMERIC(5,2),
  ranking            SMALLINT,
  catatan_panitia    TEXT,
  registered_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABEL: dokumen_peserta
-- ============================================================

CREATE TABLE IF NOT EXISTS dokumen_peserta (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  peserta_id    UUID NOT NULL REFERENCES peserta_seleksi(id) ON DELETE CASCADE,
  jenis_dokumen TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  file_path     TEXT NOT NULL,
  file_size     INTEGER,
  verified      BOOLEAN DEFAULT FALSE,
  verified_by   UUID REFERENCES profiles(id),
  verified_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABEL: penilaian_ukk
-- ============================================================

CREATE TABLE IF NOT EXISTS penilaian_ukk (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  peserta_id              UUID NOT NULL REFERENCES peserta_seleksi(id),
  penilai_id              UUID NOT NULL REFERENCES profiles(id),
  nilai_kompetensi_teknis NUMERIC(5,2),
  nilai_kepemimpinan      NUMERIC(5,2),
  nilai_manajemen         NUMERIC(5,2),
  nilai_integritas        NUMERIC(5,2),
  nilai_inovasi           NUMERIC(5,2),
  nilai_total             NUMERIC(5,2) GENERATED ALWAYS AS (
    COALESCE(nilai_kompetensi_teknis,0) * 0.30 +
    COALESCE(nilai_kepemimpinan,0)      * 0.25 +
    COALESCE(nilai_manajemen,0)         * 0.20 +
    COALESCE(nilai_integritas,0)        * 0.15 +
    COALESCE(nilai_inovasi,0)           * 0.10
  ) STORED,
  rekomendasi             TEXT,
  dinilai_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(peserta_id, penilai_id)
);

-- ============================================================
-- TABEL: penilaian_wawancara
-- ============================================================

CREATE TABLE IF NOT EXISTS penilaian_wawancara (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  peserta_id            UUID NOT NULL REFERENCES peserta_seleksi(id),
  penilai_id            UUID NOT NULL REFERENCES profiles(id),
  nilai_visi            NUMERIC(5,2),
  nilai_program         NUMERIC(5,2),
  nilai_komunikasi      NUMERIC(5,2),
  nilai_problem_solving NUMERIC(5,2),
  nilai_total           NUMERIC(5,2) GENERATED ALWAYS AS (
    COALESCE(nilai_visi,0)            * 0.30 +
    COALESCE(nilai_program,0)         * 0.30 +
    COALESCE(nilai_komunikasi,0)      * 0.20 +
    COALESCE(nilai_problem_solving,0) * 0.20
  ) STORED,
  rekomendasi           TEXT,
  dinilai_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(peserta_id, penilai_id)
);

-- ============================================================
-- TABEL: audit_log
-- ============================================================

CREATE TABLE IF NOT EXISTS audit_log (
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

CREATE TABLE IF NOT EXISTS sesi_aktif (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  device_info TEXT,
  ip_address  INET,
  user_agent  TEXT,
  last_active TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- TABEL: notifikasi
-- ============================================================

CREATE TABLE IF NOT EXISTS notifikasi (
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
-- INDEKS (IF NOT EXISTS)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_profiles_role       ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_status     ON profiles(status);
CREATE INDEX IF NOT EXISTS idx_laporan_bumd_period ON laporan_kinerja_bumd(bumd_id, tahun, triwulan);
CREATE INDEX IF NOT EXISTS idx_laporan_blud_period ON laporan_kinerja_blud(blud_id, tahun, triwulan);
CREATE INDEX IF NOT EXISTS idx_kpi_period          ON kpi_bumd(bumd_id, tahun, triwulan);
CREATE INDEX IF NOT EXISTS idx_seleksi_status      ON proses_seleksi(status);
CREATE INDEX IF NOT EXISTS idx_peserta_seleksi     ON peserta_seleksi(seleksi_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_user          ON audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action        ON audit_log(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifikasi_user     ON notifikasi(user_id, dibaca);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE laporan_kinerja_bumd ENABLE ROW LEVEL SECURITY;
ALTER TABLE laporan_kinerja_blud ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_bumd             ENABLE ROW LEVEL SECURITY;
ALTER TABLE proses_seleksi       ENABLE ROW LEVEL SECURITY;
ALTER TABLE peserta_seleksi      ENABLE ROW LEVEL SECURITY;
ALTER TABLE dokumen_peserta      ENABLE ROW LEVEL SECURITY;
ALTER TABLE penilaian_ukk        ENABLE ROW LEVEL SECURITY;
ALTER TABLE penilaian_wawancara  ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesi_aktif           ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifikasi           ENABLE ROW LEVEL SECURITY;
ALTER TABLE bumd                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE blud                 ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- FUNCTIONS (CREATE OR REPLACE = selalu aman)
-- ============================================================

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT get_user_role() IN ('superadmin','admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, nama_lengkap, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'nama_lengkap', split_part(NEW.email,'@',1)),
    'pending'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION hitung_nilai_akhir(p_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  v_admin     NUMERIC;
  v_ukk       NUMERIC;
  v_wawancara NUMERIC;
  v_akhir     NUMERIC;
BEGIN
  SELECT nilai_administrasi, nilai_ukk, nilai_wawancara
    INTO v_admin, v_ukk, v_wawancara
    FROM peserta_seleksi WHERE id = p_id;
  v_akhir := COALESCE(v_admin,0)*0.20 + COALESCE(v_ukk,0)*0.50 + COALESCE(v_wawancara,0)*0.30;
  UPDATE peserta_seleksi SET nilai_akhir = ROUND(v_akhir,2) WHERE id = p_id;
  RETURN ROUND(v_akhir,2);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- TRIGGERS (drop dulu agar tidak duplikat)
-- ============================================================

DROP TRIGGER IF EXISTS set_updated_profiles    ON profiles;
DROP TRIGGER IF EXISTS set_updated_bumd        ON bumd;
DROP TRIGGER IF EXISTS set_updated_blud        ON blud;
DROP TRIGGER IF EXISTS set_updated_laporan_bumd ON laporan_kinerja_bumd;
DROP TRIGGER IF EXISTS set_updated_laporan_blud ON laporan_kinerja_blud;
DROP TRIGGER IF EXISTS set_updated_seleksi     ON proses_seleksi;
DROP TRIGGER IF EXISTS set_updated_peserta     ON peserta_seleksi;
DROP TRIGGER IF EXISTS on_auth_user_created    ON auth.users;

CREATE TRIGGER set_updated_profiles
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_bumd
  BEFORE UPDATE ON bumd FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_blud
  BEFORE UPDATE ON blud FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_laporan_bumd
  BEFORE UPDATE ON laporan_kinerja_bumd FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_laporan_blud
  BEFORE UPDATE ON laporan_kinerja_blud FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_seleksi
  BEFORE UPDATE ON proses_seleksi FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER set_updated_peserta
  BEFORE UPDATE ON peserta_seleksi FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- RLS POLICIES (drop dulu agar tidak duplikat)
-- ============================================================

-- profiles
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_admin_all"  ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (id = auth.uid() OR is_admin());
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (id = auth.uid());
CREATE POLICY "profiles_admin_all"  ON profiles FOR ALL    USING (is_admin());

-- bumd
DROP POLICY IF EXISTS "bumd_read_all"    ON bumd;
DROP POLICY IF EXISTS "bumd_admin_write" ON bumd;
CREATE POLICY "bumd_read_all"    ON bumd FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "bumd_admin_write" ON bumd FOR ALL    USING (is_admin());

-- blud
DROP POLICY IF EXISTS "blud_read_all"    ON blud;
DROP POLICY IF EXISTS "blud_admin_write" ON blud;
CREATE POLICY "blud_read_all"    ON blud FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "blud_admin_write" ON blud FOR ALL    USING (is_admin());

-- laporan bumd
DROP POLICY IF EXISTS "laporan_bumd_read"  ON laporan_kinerja_bumd;
DROP POLICY IF EXISTS "laporan_bumd_write" ON laporan_kinerja_bumd;
CREATE POLICY "laporan_bumd_read"  ON laporan_kinerja_bumd FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "laporan_bumd_write" ON laporan_kinerja_bumd FOR ALL
  USING (is_admin() OR get_user_role() = 'bumd_operator');

-- laporan blud
DROP POLICY IF EXISTS "laporan_blud_read"  ON laporan_kinerja_blud;
DROP POLICY IF EXISTS "laporan_blud_write" ON laporan_kinerja_blud;
CREATE POLICY "laporan_blud_read"  ON laporan_kinerja_blud FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "laporan_blud_write" ON laporan_kinerja_blud FOR ALL
  USING (is_admin() OR get_user_role() = 'bumd_operator');

-- kpi
DROP POLICY IF EXISTS "kpi_read"  ON kpi_bumd;
DROP POLICY IF EXISTS "kpi_write" ON kpi_bumd;
CREATE POLICY "kpi_read"  ON kpi_bumd FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "kpi_write" ON kpi_bumd FOR ALL
  USING (is_admin() OR get_user_role() = 'bumd_operator');

-- seleksi
DROP POLICY IF EXISTS "seleksi_read_all"      ON proses_seleksi;
DROP POLICY IF EXISTS "seleksi_panitia_write" ON proses_seleksi;
CREATE POLICY "seleksi_read_all"      ON proses_seleksi FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "seleksi_panitia_write" ON proses_seleksi FOR ALL
  USING (is_admin() OR get_user_role() = 'panitia_seleksi');

-- peserta
DROP POLICY IF EXISTS "peserta_read_panitia"  ON peserta_seleksi;
DROP POLICY IF EXISTS "peserta_write_panitia" ON peserta_seleksi;
CREATE POLICY "peserta_read_panitia"  ON peserta_seleksi FOR SELECT
  USING (auth.uid() IS NOT NULL AND get_user_role() IN ('superadmin','admin','panitia_seleksi','penilai'));
CREATE POLICY "peserta_write_panitia" ON peserta_seleksi FOR ALL
  USING (is_admin() OR get_user_role() = 'panitia_seleksi');

-- dokumen
DROP POLICY IF EXISTS "dokumen_panitia_read"  ON dokumen_peserta;
DROP POLICY IF EXISTS "dokumen_panitia_write" ON dokumen_peserta;
CREATE POLICY "dokumen_panitia_read"  ON dokumen_peserta FOR SELECT
  USING (get_user_role() IN ('superadmin','admin','panitia_seleksi'));
CREATE POLICY "dokumen_panitia_write" ON dokumen_peserta FOR ALL
  USING (is_admin() OR get_user_role() = 'panitia_seleksi');

-- penilaian ukk
DROP POLICY IF EXISTS "ukk_penilai_own"  ON penilaian_ukk;
DROP POLICY IF EXISTS "ukk_read_admin"   ON penilaian_ukk;
CREATE POLICY "ukk_penilai_own" ON penilaian_ukk FOR ALL
  USING (penilai_id = auth.uid() OR is_admin());
CREATE POLICY "ukk_read_admin"  ON penilaian_ukk FOR SELECT
  USING (is_admin() OR get_user_role() = 'panitia_seleksi');

-- penilaian wawancara
DROP POLICY IF EXISTS "wawancara_penilai" ON penilaian_wawancara;
CREATE POLICY "wawancara_penilai" ON penilaian_wawancara FOR ALL
  USING (penilai_id = auth.uid() OR is_admin());

-- audit log
DROP POLICY IF EXISTS "audit_admin_read" ON audit_log;
DROP POLICY IF EXISTS "audit_insert_all" ON audit_log;
CREATE POLICY "audit_admin_read" ON audit_log FOR SELECT USING (is_admin());
CREATE POLICY "audit_insert_all" ON audit_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- sesi
DROP POLICY IF EXISTS "sesi_own" ON sesi_aktif;
CREATE POLICY "sesi_own" ON sesi_aktif FOR ALL USING (user_id = auth.uid() OR is_admin());

-- notifikasi
DROP POLICY IF EXISTS "notif_own" ON notifikasi;
CREATE POLICY "notif_own" ON notifikasi FOR ALL USING (user_id = auth.uid());

-- ============================================================
-- DATA SEED (INSERT ... ON CONFLICT DO NOTHING = idempotent)
-- ============================================================

INSERT INTO bumd (kode, nama, singkatan, jenis, direktur) VALUES
  ('BWR',  'PT Batu Wisata Resource',        'PT BWR',        'perseroda', 'Drs. Andi Susanto, M.Si.'),
  ('PDAM', 'Perumdam Air Tirta Kencana',     'Perumdam',      'perumda',   'Ir. Budi Raharjo, M.T.'),
  ('BATU', 'PT Batu Alam Indah',             'PT BAI',        'perseroda', 'Dr. Sri Lestari, M.M.'),
  ('PSAR', 'PD Pasar Kota Batu',             'PD Pasar',      'perumda',   'Drs. Hendra Wibowo'),
  ('BPI',  'PT Batu Properti Investama',     'PT BPI',        'perseroda', 'Slamet Haryono, S.E., M.M.'),
  ('PARK', 'Perumda Perparkiran Kota Batu',  'Perumda Parkir','perumda',   'Wahyu Santoso, S.T.')
ON CONFLICT (kode) DO NOTHING;

INSERT INTO blud (kode, nama, singkatan, jenis) VALUES
  ('RSUD',  'RSUD Kota Batu',                     'RSUD Batu',   'rumah_sakit'),
  ('PKM-A', 'Puskesmas BLUD Bumiaji',             'PKM Bumiaji', 'puskesmas'),
  ('PKM-B', 'Puskesmas BLUD Batu',                'PKM Batu',    'puskesmas'),
  ('LAB',   'Laboratorium Klinik BLUD Kota Batu', 'Lab BLUD',    'laboratorium')
ON CONFLICT (kode) DO NOTHING;

-- Konfirmasi selesai
DO $$ BEGIN
  RAISE NOTICE 'SIMBUBALADA schema berhasil diinisialisasi!';
END $$;
