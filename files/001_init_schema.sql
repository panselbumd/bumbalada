-- ============================================================
-- SIPSELBUMD — Sistem Informasi Seleksi BUMD
-- Database Schema PostgreSQL (Supabase)
-- Versi: 1.0.0
-- Referensi: PP No. 54/2017, Permendagri No. 37/2018
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE user_role AS ENUM ('peserta', 'panitia', 'ukk', 'admin');
CREATE TYPE bumd_type AS ENUM ('perumda', 'perseroda');
CREATE TYPE position_type AS ENUM (
  'dewan_pengawas_perumda',
  'komisaris_perseroda',
  'direksi_perumda',
  'direksi_perseroda'
);
CREATE TYPE app_status AS ENUM (
  'draft', 'submitted', 'verified', 'rejected',
  'lolos_administrasi', 'tidak_lolos_administrasi',
  'ikut_ukk', 'lolos_ukk', 'tidak_lolos_ukk',
  'ikut_wawancara', 'lolos_wawancara', 'tidak_lolos_wawancara',
  'terpilih', 'tidak_terpilih', 'kontrak', 'diangkat'
);
CREATE TYPE doc_type AS ENUM (
  'ktp', 'pas_foto', 'cv', 'ijazah', 'npwp',
  'skck', 'surat_kesehatan', 'pakta_integritas',
  'dok_pendukung', 'berita_acara', 'kontrak_kinerja'
);
CREATE TYPE interview_type AS ENUM ('kpm', 'rups', 'ukk');
CREATE TYPE verification_status AS ENUM ('pending', 'valid', 'invalid', 'need_revision');

-- ============================================================
-- TABLE: roles
-- ============================================================
CREATE TABLE roles (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        user_role NOT NULL UNIQUE,
  label       TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (name, label, permissions) VALUES
  ('admin',   'Administrator Sistem', '{"all": true}'),
  ('panitia', 'Panitia Seleksi',      '{"manage_selection": true, "verify_admin": true, "input_results": true}'),
  ('ukk',     'Tim UKK',              '{"input_ukk": true, "upload_ba": true}'),
  ('peserta', 'Peserta Seleksi',      '{"register": true, "upload_docs": true, "view_results": true}');

-- ============================================================
-- TABLE: users (extends Supabase auth.users)
-- ============================================================
CREATE TABLE users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL UNIQUE,
  phone         TEXT,
  full_name     TEXT,
  role          user_role NOT NULL DEFAULT 'peserta',
  is_active     BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: positions (jabatan yang diseleksi)
-- ============================================================
CREATE TABLE positions (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         position_type NOT NULL,
  label        TEXT NOT NULL,
  bumd_type    bumd_type NOT NULL,
  company_name TEXT NOT NULL,
  company_code TEXT,
  quota        INT NOT NULL DEFAULT 1,
  period       TEXT NOT NULL, -- e.g. '2025-2029'
  is_active    BOOLEAN DEFAULT TRUE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: selection_stages (tahapan seleksi)
-- ============================================================
CREATE TABLE selection_stages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  position_id UUID REFERENCES positions(id),
  stage_order INT NOT NULL,
  stage_name  TEXT NOT NULL,
  stage_code  TEXT NOT NULL, -- e.g. 'verifikasi_administrasi'
  start_date  DATE,
  end_date    DATE,
  is_active   BOOLEAN DEFAULT FALSE,
  is_done     BOOLEAN DEFAULT FALSE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: participants (profil peserta)
-- ============================================================
CREATE TABLE participants (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  nik               TEXT UNIQUE NOT NULL,
  full_name         TEXT NOT NULL,
  birth_place       TEXT,
  birth_date        DATE,
  gender            TEXT CHECK (gender IN ('L', 'P')),
  religion          TEXT,
  address           TEXT,
  phone             TEXT,
  email             TEXT,
  education_level   TEXT,
  education_major   TEXT,
  education_school  TEXT,
  graduation_year   INT,
  work_experience   TEXT, -- JSON string of array
  photo_url         TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: applications (lamaran/pendaftaran)
-- ============================================================
CREATE TABLE applications (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participant_id  UUID NOT NULL REFERENCES participants(id),
  position_id     UUID NOT NULL REFERENCES positions(id),
  reg_number      TEXT UNIQUE, -- generated: SEL-2025-XXXX
  status          app_status NOT NULL DEFAULT 'draft',
  submitted_at    TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(participant_id, position_id)
);

-- Auto-generate registration number
CREATE OR REPLACE FUNCTION generate_reg_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reg_number IS NULL AND NEW.submitted_at IS NOT NULL THEN
    NEW.reg_number := 'SEL-' || TO_CHAR(NOW(), 'YYYY') || '-' ||
                      LPAD(nextval('reg_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE reg_number_seq START 1;
CREATE TRIGGER trg_generate_reg_number
  BEFORE INSERT OR UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION generate_reg_number();

-- ============================================================
-- TABLE: documents (dokumen peserta)
-- ============================================================
CREATE TABLE documents (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  doc_type       doc_type NOT NULL,
  file_name      TEXT NOT NULL,
  file_url       TEXT NOT NULL,
  file_size      BIGINT,
  mime_type      TEXT,
  status         verification_status DEFAULT 'pending',
  verified_by    UUID REFERENCES users(id),
  verified_at    TIMESTAMPTZ,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: administration_results (hasil verifikasi administrasi)
-- ============================================================
CREATE TABLE administration_results (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id    UUID NOT NULL REFERENCES applications(id),
  verified_by       UUID REFERENCES users(id),
  status            verification_status NOT NULL DEFAULT 'pending',
  is_pass           BOOLEAN,
  score_completeness INT, -- 0-100
  notes             TEXT,
  verified_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: ukk_results (hasil UKK — tidak boleh dihapus, append-only)
-- ============================================================
CREATE TABLE ukk_results (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id   UUID NOT NULL REFERENCES applications(id),
  input_by         UUID REFERENCES users(id),
  version          INT NOT NULL DEFAULT 1, -- versi input (immutable log)
  score_technical  NUMERIC(5,2) DEFAULT 0,
  score_psychology NUMERIC(5,2) DEFAULT 0,
  score_paper      NUMERIC(5,2) DEFAULT 0, -- makalah
  score_interview  NUMERIC(5,2) DEFAULT 0,
  total_score      NUMERIC(5,2) GENERATED ALWAYS AS (
    (score_technical * 0.3 + score_psychology * 0.2 +
     score_paper * 0.2 + score_interview * 0.3)
  ) STORED,
  is_pass          BOOLEAN,
  is_latest        BOOLEAN DEFAULT TRUE,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure only latest version is marked; old versions preserved
CREATE OR REPLACE FUNCTION mark_prev_ukk_not_latest()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE ukk_results
  SET is_latest = FALSE
  WHERE application_id = NEW.application_id
    AND id <> NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ukk_versioning
  AFTER INSERT ON ukk_results
  FOR EACH ROW EXECUTE FUNCTION mark_prev_ukk_not_latest();

-- ============================================================
-- TABLE: interview_results (hasil wawancara KPM/RUPS — immutable)
-- ============================================================
CREATE TABLE interview_results (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id  UUID NOT NULL REFERENCES applications(id),
  interview_type  interview_type NOT NULL,
  conducted_by    UUID REFERENCES users(id),
  version         INT NOT NULL DEFAULT 1,
  score           NUMERIC(5,2),
  is_pass         BOOLEAN,
  recommendation  TEXT,
  is_latest       BOOLEAN DEFAULT TRUE,
  interviewed_at  DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: performance_contracts (kontrak kinerja)
-- ============================================================
CREATE TABLE performance_contracts (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id  UUID NOT NULL REFERENCES applications(id),
  contract_number TEXT UNIQUE,
  signed_date     DATE,
  start_date      DATE,
  end_date        DATE,
  document_url    TEXT,
  qr_code         TEXT, -- QR untuk verifikasi
  e_materai_id    TEXT, -- ID e-Materai
  status          TEXT DEFAULT 'draft',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: appointments (SK Pengangkatan)
-- ============================================================
CREATE TABLE appointments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id   UUID NOT NULL REFERENCES applications(id),
  decree_number    TEXT UNIQUE, -- nomor SK
  appointment_date DATE,
  start_date       DATE,
  document_url     TEXT,
  qr_code          TEXT,
  status           TEXT DEFAULT 'pending',
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: announcements (pengumuman)
-- ============================================================
CREATE TABLE announcements (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title        TEXT NOT NULL,
  slug         TEXT UNIQUE,
  content      TEXT NOT NULL,
  excerpt      TEXT,
  stage        TEXT, -- tahapan terkait
  position_id  UUID REFERENCES positions(id),
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  created_by   UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: schedules (jadwal seleksi)
-- ============================================================
CREATE TABLE schedules (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  position_id UUID REFERENCES positions(id),
  stage       TEXT NOT NULL,
  title       TEXT NOT NULL,
  location    TEXT,
  start_at    TIMESTAMPTZ NOT NULL,
  end_at      TIMESTAMPTZ NOT NULL,
  is_public   BOOLEAN DEFAULT TRUE,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLE: audit_logs (tidak boleh dihapus)
-- ============================================================
CREATE TABLE audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES users(id),
  action      TEXT NOT NULL, -- INSERT, UPDATE, DELETE, LOGIN, LOGOUT, etc.
  table_name  TEXT,
  record_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  INET,
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Prevent deletion from audit_logs
CREATE OR REPLACE RULE no_delete_audit_logs AS
  ON DELETE TO audit_logs DO INSTEAD NOTHING;

-- ============================================================
-- TABLE: settings (konfigurasi sistem)
-- ============================================================
CREATE TABLE settings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key         TEXT NOT NULL UNIQUE,
  value       JSONB,
  description TEXT,
  updated_by  UUID REFERENCES users(id),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO settings (key, value, description) VALUES
  ('app_name', '"SIPSELBUMD"', 'Nama aplikasi'),
  ('selection_period', '"2025"', 'Periode seleksi aktif'),
  ('max_applications_per_person', '1', 'Maks lamaran per orang per periode'),
  ('passing_grade_ukk', '70', 'Nilai minimal lulus UKK'),
  ('passing_grade_interview', '65', 'Nilai minimal lulus wawancara'),
  ('admin_email', '"admin@sipselbumd.go.id"', 'Email administrator');

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_applications_participant ON applications(participant_id);
CREATE INDEX idx_applications_position    ON applications(position_id);
CREATE INDEX idx_applications_status      ON applications(status);
CREATE INDEX idx_documents_application    ON documents(application_id);
CREATE INDEX idx_ukk_results_application  ON ukk_results(application_id);
CREATE INDEX idx_ukk_results_latest       ON ukk_results(application_id) WHERE is_latest = TRUE;
CREATE INDEX idx_audit_logs_user          ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_table         ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_created       ON audit_logs(created_at DESC);
CREATE INDEX idx_participants_nik         ON participants(nik);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at        BEFORE UPDATE ON users        FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_participants_updated_at BEFORE UPDATE ON participants  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_applications_updated_at BEFORE UPDATE ON applications  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at();
