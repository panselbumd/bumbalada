-- ============================================================
-- SIMBUMD – RESET BERSIH (Jalankan SEBELUM 001_initial_schema.sql)
-- Hapus semua objek yang mungkin sudah ada sebelumnya
-- PERINGATAN: Ini akan menghapus semua data!
-- ============================================================

-- Drop triggers dulu
DROP TRIGGER IF EXISTS on_auth_user_created    ON auth.users;
DROP TRIGGER IF EXISTS set_updated_profiles    ON profiles;
DROP TRIGGER IF EXISTS set_updated_bumd        ON bumd;
DROP TRIGGER IF EXISTS set_updated_blud        ON blud;
DROP TRIGGER IF EXISTS set_updated_laporan_bumd ON laporan_kinerja_bumd;
DROP TRIGGER IF EXISTS set_updated_laporan_blud ON laporan_kinerja_blud;
DROP TRIGGER IF EXISTS set_updated_seleksi     ON proses_seleksi;
DROP TRIGGER IF EXISTS set_updated_peserta     ON peserta_seleksi;

-- Drop functions
DROP FUNCTION IF EXISTS handle_new_user()            CASCADE;
DROP FUNCTION IF EXISTS trigger_set_updated_at()     CASCADE;
DROP FUNCTION IF EXISTS hitung_nilai_akhir(UUID)     CASCADE;
DROP FUNCTION IF EXISTS get_user_role()              CASCADE;
DROP FUNCTION IF EXISTS is_admin()                   CASCADE;

-- Drop tables (urutan: dependent dulu)
DROP TABLE IF EXISTS notifikasi            CASCADE;
DROP TABLE IF EXISTS sesi_aktif            CASCADE;
DROP TABLE IF EXISTS audit_log             CASCADE;
DROP TABLE IF EXISTS penilaian_wawancara   CASCADE;
DROP TABLE IF EXISTS penilaian_ukk         CASCADE;
DROP TABLE IF EXISTS dokumen_peserta       CASCADE;
DROP TABLE IF EXISTS peserta_seleksi       CASCADE;
DROP TABLE IF EXISTS proses_seleksi        CASCADE;
DROP TABLE IF EXISTS kpi_bumd              CASCADE;
DROP TABLE IF EXISTS laporan_kinerja_blud  CASCADE;
DROP TABLE IF EXISTS laporan_kinerja_bumd  CASCADE;
DROP TABLE IF EXISTS blud                  CASCADE;
DROP TABLE IF EXISTS bumd                  CASCADE;
DROP TABLE IF EXISTS profiles              CASCADE;

-- Drop types
DROP TYPE IF EXISTS log_action       CASCADE;
DROP TYPE IF EXISTS peserta_status   CASCADE;
DROP TYPE IF EXISTS seleksi_status   CASCADE;
DROP TYPE IF EXISTS kpi_status       CASCADE;
DROP TYPE IF EXISTS auditor_opinion  CASCADE;
DROP TYPE IF EXISTS health_level     CASCADE;
DROP TYPE IF EXISTS bumd_type        CASCADE;
DROP TYPE IF EXISTS user_status      CASCADE;
DROP TYPE IF EXISTS user_role        CASCADE;

-- Konfirmasi
DO $$ BEGIN
  RAISE NOTICE 'Reset selesai. Silakan jalankan 001_initial_schema.sql';
END $$;
