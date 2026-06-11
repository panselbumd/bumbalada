-- ============================================================
-- SIMBUBALADA – Skema Database Lengkap
-- Pemerintah Kota Batu
-- Versi: 1.0.3
--
-- PETUNJUK PENTING:
-- Jalankan file ini dalam DUA LANGKAH di Supabase SQL Editor:
--   1. Blok STEP 1 (baris 1 s/d "-- END STEP 1")
--   2. Blok STEP 2 (baris setelah "-- BEGIN STEP 2" sampai akhir)
-- Atau gunakan dua tab SQL Editor yang berbeda.
-- ============================================================

-- ============================================================
-- STEP 1: BUAT/LENGKAPI SEMUA ENUM TYPES
-- Jalankan blok ini PERTAMA, lalu jalankan STEP 2 secara terpisah.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM (
    'superadmin','admin','panitia_seleksi','penilai','viewer_eksekutif','bumd_operator'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN ALTER TYPE user_role ADD VALUE 'superadmin';       EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE user_role ADD VALUE 'admin';            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE user_role ADD VALUE 'panitia_seleksi';  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE user_role ADD VALUE 'penilai';          EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE user_role ADD VALUE 'viewer_eksekutif'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE user_role ADD VALUE 'bumd_operator';    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE user_status AS ENUM ('aktif', 'nonaktif', 'pending');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN ALTER TYPE user_status ADD VALUE 'aktif';    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE user_status ADD VALUE 'nonaktif'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE user_status ADD VALUE 'pending';  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE bumd_type AS ENUM ('perseroda', 'perumda');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN ALTER TYPE bumd_type ADD VALUE 'perseroda'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE bumd_type ADD VALUE 'perumda';   EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE health_level AS ENUM ('sehat', 'kurang_sehat', 'tidak_sehat');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN ALTER TYPE health_level ADD VALUE 'sehat';        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE health_level ADD VALUE 'kurang_sehat'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE health_level ADD VALUE 'tidak_sehat';  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE auditor_opinion AS ENUM ('WTP', 'WTP_DPP', 'WDP', 'TMP', 'belum');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN ALTER TYPE auditor_opinion ADD VALUE 'WTP';     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE auditor_opinion ADD VALUE 'WTP_DPP'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE auditor_opinion ADD VALUE 'WDP';     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE auditor_opinion ADD VALUE 'TMP';     EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE auditor_opinion ADD VALUE 'belum';   EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE kpi_status AS ENUM ('melebihi_target', 'tercapai', 'tidak_tercapai');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN ALTER TYPE kpi_status ADD VALUE 'melebihi_target'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE kpi_status ADD VALUE 'tercapai';        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE kpi_status ADD VALUE 'tidak_tercapai';  EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE seleksi_status AS ENUM (
    'draft','dibuka','seleksi_administrasi','ukk','wawancara','selesai','dibatalkan'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN ALTER TYPE seleksi_status ADD VALUE 'draft';                EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE seleksi_status ADD VALUE 'dibuka';               EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE seleksi_status ADD VALUE 'seleksi_administrasi'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE seleksi_status ADD VALUE 'ukk';                  EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE seleksi_status ADD VALUE 'wawancara';            EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE seleksi_status ADD VALUE 'selesai';              EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE seleksi_status ADD VALUE 'dibatalkan';           EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE peserta_status AS ENUM (
    'terdaftar','review_dokumen','lolos_administrasi','tidak_lolos_administrasi',
    'lolos_ukk','tidak_lolos_ukk','lolos_wawancara','tidak_lolos_wawancara','ditetapkan'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN ALTER TYPE peserta_status ADD VALUE 'terdaftar';                EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE peserta_status ADD VALUE 'review_dokumen';           EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE peserta_status ADD VALUE 'lolos_administrasi';       EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE peserta_status ADD VALUE 'tidak_lolos_administrasi'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE peserta_status ADD VALUE 'lolos_ukk';                EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE peserta_status ADD VALUE 'tidak_lolos_ukk';          EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE peserta_status ADD VALUE 'lolos_wawancara';          EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE peserta_status ADD VALUE 'tidak_lolos_wawancara';    EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE peserta_status ADD VALUE 'ditetapkan';               EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE log_action AS ENUM (
    'login','logout','create','update','delete','export',
    'submit_laporan','reset_password','change_role'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN ALTER TYPE log_action ADD VALUE 'login';          EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE log_action ADD VALUE 'logout';         EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE log_action ADD VALUE 'create';         EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE log_action ADD VALUE 'update';         EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE log_action ADD VALUE 'delete';         EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE log_action ADD VALUE 'export';         EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE log_action ADD VALUE 'submit_laporan'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE log_action ADD VALUE 'reset_password'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN ALTER TYPE log_action ADD VALUE 'change_role';    EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- END STEP 1
