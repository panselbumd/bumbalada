-- ============================================================
-- SIPSELBUMD — Row Level Security Policies
-- Versi: 1.2.0 — Fixed:
--   1. Semua fungsi SECURITY DEFINER ditambahkan SET search_path
--      agar PostgreSQL dapat menemukan tabel di schema public
--      (root cause error: relation "applicants" does not exist)
--   2. search_path eksplisit mencegah search_path injection attack
-- Jalankan SETELAH 001_init_schema.sql
-- ============================================================

-- Enable RLS pada semua tabel yang dibuat di migration 001
-- Aman dijalankan berulang — ALTER TABLE tidak error jika sudah aktif
ALTER TABLE users                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants            ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents               ENABLE ROW LEVEL SECURITY;
ALTER TABLE administration_results  ENABLE ROW LEVEL SECURITY;
ALTER TABLE ukk_results             ENABLE ROW LEVEL SECURITY;
ALTER TABLE interview_results       ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_contracts   ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments            ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcements           ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules               ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions               ENABLE ROW LEVEL SECURITY;
ALTER TABLE selection_stages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings                ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTIONS
-- FIX: DROP fungsi lama terlebih dahulu agar CREATE OR REPLACE
--      tidak gagal ketika return type berubah (error 42P13).
--      Kemudian buat ulang dengan SET search_path = public, pg_catalog
--      agar fungsi SECURITY DEFINER dapat menemukan tabel di schema public.
-- CASCADE diperlukan agar policy yang bergantung pada fungsi ikut di-drop,
-- lalu dibuat ulang di bawah.
-- ============================================================
DROP FUNCTION IF EXISTS public.auth_user_role() CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_panitia_or_admin() CASCADE;
DROP FUNCTION IF EXISTS public.is_ukk_or_admin() CASCADE;

CREATE FUNCTION public.auth_user_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE
   SET search_path = public, pg_catalog;

CREATE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
  SELECT public.auth_user_role() = 'admin';
$$ LANGUAGE sql SECURITY DEFINER STABLE
   SET search_path = public, pg_catalog;

CREATE FUNCTION public.is_panitia_or_admin()
RETURNS BOOLEAN AS $$
  SELECT public.auth_user_role() IN ('panitia', 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE
   SET search_path = public, pg_catalog;

CREATE FUNCTION public.is_ukk_or_admin()
RETURNS BOOLEAN AS $$
  SELECT public.auth_user_role() IN ('ukk', 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE
   SET search_path = public, pg_catalog;

-- ============================================================
-- Hapus policy lama sebelum buat ulang (idempotent)
-- ============================================================
DO $$ BEGIN
  -- users
  DROP POLICY IF EXISTS users_select_own   ON public.users;
  DROP POLICY IF EXISTS users_update_own   ON public.users;
  -- participants
  DROP POLICY IF EXISTS participants_select      ON public.participants;
  DROP POLICY IF EXISTS participants_insert_own  ON public.participants;
  DROP POLICY IF EXISTS participants_update_own  ON public.participants;
  -- applications
  DROP POLICY IF EXISTS applications_select ON public.applications;
  DROP POLICY IF EXISTS applications_insert ON public.applications;
  DROP POLICY IF EXISTS applications_update ON public.applications;
  -- documents
  DROP POLICY IF EXISTS documents_select ON public.documents;
  DROP POLICY IF EXISTS documents_insert ON public.documents;
  DROP POLICY IF EXISTS documents_update ON public.documents;
  -- administration_results
  DROP POLICY IF EXISTS adm_results_select ON public.administration_results;
  DROP POLICY IF EXISTS adm_results_insert ON public.administration_results;
  DROP POLICY IF EXISTS adm_results_update ON public.administration_results;
  -- ukk_results
  DROP POLICY IF EXISTS ukk_results_select ON public.ukk_results;
  DROP POLICY IF EXISTS ukk_results_insert ON public.ukk_results;
  -- interview_results
  DROP POLICY IF EXISTS interview_results_select ON public.interview_results;
  DROP POLICY IF EXISTS interview_results_insert ON public.interview_results;
  -- performance_contracts
  DROP POLICY IF EXISTS contracts_select ON public.performance_contracts;
  DROP POLICY IF EXISTS contracts_insert ON public.performance_contracts;
  DROP POLICY IF EXISTS contracts_update ON public.performance_contracts;
  -- appointments
  DROP POLICY IF EXISTS appointments_select ON public.appointments;
  DROP POLICY IF EXISTS appointments_insert ON public.appointments;
  -- announcements
  DROP POLICY IF EXISTS announcements_select ON public.announcements;
  DROP POLICY IF EXISTS announcements_insert ON public.announcements;
  DROP POLICY IF EXISTS announcements_update ON public.announcements;
  -- schedules
  DROP POLICY IF EXISTS schedules_select ON public.schedules;
  DROP POLICY IF EXISTS schedules_write  ON public.schedules;
  -- positions
  DROP POLICY IF EXISTS positions_select ON public.positions;
  DROP POLICY IF EXISTS positions_write  ON public.positions;
  -- selection_stages
  DROP POLICY IF EXISTS stages_select ON public.selection_stages;
  DROP POLICY IF EXISTS stages_write  ON public.selection_stages;
  -- audit_logs
  DROP POLICY IF EXISTS audit_logs_select ON public.audit_logs;
  DROP POLICY IF EXISTS audit_logs_insert ON public.audit_logs;
  -- settings
  DROP POLICY IF EXISTS settings_select ON public.settings;
  DROP POLICY IF EXISTS settings_write  ON public.settings;
END $$;

-- ============================================================
-- TABLE: users
-- ============================================================
CREATE POLICY users_select_own ON public.users
  FOR SELECT USING (id = auth.uid() OR public.is_admin());

CREATE POLICY users_update_own ON public.users
  FOR UPDATE USING (id = auth.uid() OR public.is_admin());

-- ============================================================
-- TABLE: participants
-- ============================================================
CREATE POLICY participants_select ON public.participants
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_panitia_or_admin()
    OR public.is_ukk_or_admin()
  );

CREATE POLICY participants_insert_own ON public.participants
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY participants_update_own ON public.participants
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());

-- ============================================================
-- TABLE: applications
-- ============================================================
CREATE POLICY applications_select ON public.applications
  FOR SELECT USING (
    participant_id IN (
      SELECT id FROM public.participants WHERE user_id = auth.uid()
    )
    OR public.is_panitia_or_admin()
    OR public.is_ukk_or_admin()
  );

CREATE POLICY applications_insert ON public.applications
  FOR INSERT WITH CHECK (
    participant_id IN (
      SELECT id FROM public.participants WHERE user_id = auth.uid()
    )
  );

CREATE POLICY applications_update ON public.applications
  FOR UPDATE USING (public.is_panitia_or_admin());

-- ============================================================
-- TABLE: documents
-- ============================================================
CREATE POLICY documents_select ON public.documents
  FOR SELECT USING (
    application_id IN (
      SELECT a.id FROM public.applications a
      JOIN public.participants p ON a.participant_id = p.id
      WHERE p.user_id = auth.uid()
    )
    OR public.is_panitia_or_admin()
    OR public.is_ukk_or_admin()
  );

CREATE POLICY documents_insert ON public.documents
  FOR INSERT WITH CHECK (
    application_id IN (
      SELECT a.id FROM public.applications a
      JOIN public.participants p ON a.participant_id = p.id
      WHERE p.user_id = auth.uid()
    )
    OR public.is_panitia_or_admin()
  );

CREATE POLICY documents_update ON public.documents
  FOR UPDATE USING (public.is_panitia_or_admin());

-- ============================================================
-- TABLE: administration_results
-- ============================================================
CREATE POLICY adm_results_select ON public.administration_results
  FOR SELECT USING (
    application_id IN (
      SELECT a.id FROM public.applications a
      JOIN public.participants p ON a.participant_id = p.id
      WHERE p.user_id = auth.uid()
    )
    OR public.is_panitia_or_admin()
  );

CREATE POLICY adm_results_insert ON public.administration_results
  FOR INSERT WITH CHECK (public.is_panitia_or_admin());

CREATE POLICY adm_results_update ON public.administration_results
  FOR UPDATE USING (public.is_panitia_or_admin());

-- ============================================================
-- TABLE: ukk_results
-- INSERT only — tidak ada UPDATE/DELETE (immutable versioning)
-- ============================================================
CREATE POLICY ukk_results_select ON public.ukk_results
  FOR SELECT USING (
    (
      application_id IN (
        SELECT a.id FROM public.applications a
        JOIN public.participants p ON a.participant_id = p.id
        WHERE p.user_id = auth.uid()
      )
      AND is_latest = TRUE
    )
    OR public.is_panitia_or_admin()
    OR public.is_ukk_or_admin()
  );

CREATE POLICY ukk_results_insert ON public.ukk_results
  FOR INSERT WITH CHECK (public.is_ukk_or_admin());

-- ============================================================
-- TABLE: interview_results
-- INSERT only — tidak ada UPDATE/DELETE (immutable versioning)
-- ============================================================
CREATE POLICY interview_results_select ON public.interview_results
  FOR SELECT USING (
    (
      application_id IN (
        SELECT a.id FROM public.applications a
        JOIN public.participants p ON a.participant_id = p.id
        WHERE p.user_id = auth.uid()
      )
      AND is_latest = TRUE
    )
    OR public.is_panitia_or_admin()
  );

CREATE POLICY interview_results_insert ON public.interview_results
  FOR INSERT WITH CHECK (public.is_panitia_or_admin());

-- ============================================================
-- TABLE: performance_contracts & appointments
-- ============================================================
CREATE POLICY contracts_select ON public.performance_contracts
  FOR SELECT USING (
    application_id IN (
      SELECT a.id FROM public.applications a
      JOIN public.participants p ON a.participant_id = p.id
      WHERE p.user_id = auth.uid()
    )
    OR public.is_panitia_or_admin()
  );

CREATE POLICY contracts_insert ON public.performance_contracts
  FOR INSERT WITH CHECK (public.is_panitia_or_admin());

CREATE POLICY contracts_update ON public.performance_contracts
  FOR UPDATE USING (public.is_panitia_or_admin());

CREATE POLICY appointments_select ON public.appointments
  FOR SELECT USING (
    application_id IN (
      SELECT a.id FROM public.applications a
      JOIN public.participants p ON a.participant_id = p.id
      WHERE p.user_id = auth.uid()
    )
    OR public.is_panitia_or_admin()
  );

CREATE POLICY appointments_insert ON public.appointments
  FOR INSERT WITH CHECK (public.is_panitia_or_admin());

-- ============================================================
-- TABLE: announcements (published = public read)
-- ============================================================
CREATE POLICY announcements_select ON public.announcements
  FOR SELECT USING (is_published = TRUE OR public.is_panitia_or_admin());

CREATE POLICY announcements_insert ON public.announcements
  FOR INSERT WITH CHECK (public.is_panitia_or_admin());

CREATE POLICY announcements_update ON public.announcements
  FOR UPDATE USING (public.is_panitia_or_admin());

-- ============================================================
-- TABLE: schedules (public read, panitia write)
-- ============================================================
CREATE POLICY schedules_select ON public.schedules
  FOR SELECT USING (is_public = TRUE OR public.is_panitia_or_admin());

CREATE POLICY schedules_write ON public.schedules
  FOR ALL USING (public.is_panitia_or_admin());

-- ============================================================
-- TABLE: positions & selection_stages (public read, admin write)
-- ============================================================
CREATE POLICY positions_select ON public.positions
  FOR SELECT USING (TRUE);

CREATE POLICY positions_write ON public.positions
  FOR ALL USING (public.is_admin());

CREATE POLICY stages_select ON public.selection_stages
  FOR SELECT USING (TRUE);

CREATE POLICY stages_write ON public.selection_stages
  FOR ALL USING (public.is_panitia_or_admin());

-- ============================================================
-- TABLE: audit_logs (siapapun bisa insert, hanya admin yang bisa select)
-- ============================================================
CREATE POLICY audit_logs_select ON public.audit_logs
  FOR SELECT USING (public.is_admin());

CREATE POLICY audit_logs_insert ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- TABLE: settings (admin only)
-- ============================================================
CREATE POLICY settings_select ON public.settings
  FOR SELECT USING (public.is_admin());

CREATE POLICY settings_write ON public.settings
  FOR ALL USING (public.is_admin());
