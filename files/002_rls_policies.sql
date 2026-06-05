-- ============================================================
-- SIPSELBUMD — Row Level Security Policies
-- ============================================================

-- Enable RLS on all tables
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
-- ============================================================
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM users WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT auth_user_role() = 'admin';
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_panitia_or_admin()
RETURNS BOOLEAN AS $$
  SELECT auth_user_role() IN ('panitia', 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION is_ukk_or_admin()
RETURNS BOOLEAN AS $$
  SELECT auth_user_role() IN ('ukk', 'admin');
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- TABLE: users
-- ============================================================
-- Users can see their own data; admin sees all
CREATE POLICY users_select_own ON users
  FOR SELECT USING (id = auth.uid() OR is_admin());

CREATE POLICY users_update_own ON users
  FOR UPDATE USING (id = auth.uid() OR is_admin());

-- ============================================================
-- TABLE: participants
-- ============================================================
CREATE POLICY participants_select ON participants
  FOR SELECT USING (
    user_id = auth.uid()
    OR is_panitia_or_admin()
    OR is_ukk_or_admin()
  );

CREATE POLICY participants_insert_own ON participants
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY participants_update_own ON participants
  FOR UPDATE USING (user_id = auth.uid() OR is_admin());

-- ============================================================
-- TABLE: applications
-- ============================================================
CREATE POLICY applications_select ON applications
  FOR SELECT USING (
    participant_id IN (SELECT id FROM participants WHERE user_id = auth.uid())
    OR is_panitia_or_admin()
    OR is_ukk_or_admin()
  );

CREATE POLICY applications_insert ON applications
  FOR INSERT WITH CHECK (
    participant_id IN (SELECT id FROM participants WHERE user_id = auth.uid())
  );

CREATE POLICY applications_update ON applications
  FOR UPDATE USING (is_panitia_or_admin());

-- ============================================================
-- TABLE: documents
-- ============================================================
CREATE POLICY documents_select ON documents
  FOR SELECT USING (
    application_id IN (
      SELECT a.id FROM applications a
      JOIN participants p ON a.participant_id = p.id
      WHERE p.user_id = auth.uid()
    )
    OR is_panitia_or_admin()
    OR is_ukk_or_admin()
  );

CREATE POLICY documents_insert ON documents
  FOR INSERT WITH CHECK (
    application_id IN (
      SELECT a.id FROM applications a
      JOIN participants p ON a.participant_id = p.id
      WHERE p.user_id = auth.uid()
    )
    OR is_panitia_or_admin()
  );

CREATE POLICY documents_update ON documents
  FOR UPDATE USING (is_panitia_or_admin());

-- ============================================================
-- TABLE: administration_results
-- ============================================================
CREATE POLICY adm_results_select ON administration_results
  FOR SELECT USING (
    application_id IN (
      SELECT a.id FROM applications a
      JOIN participants p ON a.participant_id = p.id
      WHERE p.user_id = auth.uid()
    )
    OR is_panitia_or_admin()
  );

CREATE POLICY adm_results_insert ON administration_results
  FOR INSERT WITH CHECK (is_panitia_or_admin());

CREATE POLICY adm_results_update ON administration_results
  FOR UPDATE USING (is_panitia_or_admin());

-- ============================================================
-- TABLE: ukk_results (append only — no delete, no update)
-- ============================================================
CREATE POLICY ukk_results_select ON ukk_results
  FOR SELECT USING (
    -- Peserta only sees their latest result
    (
      application_id IN (
        SELECT a.id FROM applications a
        JOIN participants p ON a.participant_id = p.id
        WHERE p.user_id = auth.uid()
      ) AND is_latest = TRUE
    )
    OR is_panitia_or_admin()
    OR is_ukk_or_admin()
  );

CREATE POLICY ukk_results_insert ON ukk_results
  FOR INSERT WITH CHECK (is_ukk_or_admin());

-- No UPDATE or DELETE allowed on ukk_results (immutable versioning)

-- ============================================================
-- TABLE: interview_results (append only)
-- ============================================================
CREATE POLICY interview_results_select ON interview_results
  FOR SELECT USING (
    (
      application_id IN (
        SELECT a.id FROM applications a
        JOIN participants p ON a.participant_id = p.id
        WHERE p.user_id = auth.uid()
      ) AND is_latest = TRUE
    )
    OR is_panitia_or_admin()
  );

CREATE POLICY interview_results_insert ON interview_results
  FOR INSERT WITH CHECK (is_panitia_or_admin());

-- ============================================================
-- TABLE: performance_contracts & appointments
-- ============================================================
CREATE POLICY contracts_select ON performance_contracts
  FOR SELECT USING (
    application_id IN (
      SELECT a.id FROM applications a
      JOIN participants p ON a.participant_id = p.id
      WHERE p.user_id = auth.uid()
    )
    OR is_panitia_or_admin()
  );

CREATE POLICY contracts_insert ON performance_contracts
  FOR INSERT WITH CHECK (is_panitia_or_admin());

CREATE POLICY contracts_update ON performance_contracts
  FOR UPDATE USING (is_panitia_or_admin());

CREATE POLICY appointments_select ON appointments
  FOR SELECT USING (
    application_id IN (
      SELECT a.id FROM applications a
      JOIN participants p ON a.participant_id = p.id
      WHERE p.user_id = auth.uid()
    )
    OR is_panitia_or_admin()
  );

CREATE POLICY appointments_insert ON appointments
  FOR INSERT WITH CHECK (is_panitia_or_admin());

-- ============================================================
-- TABLE: announcements (public read, panitia write)
-- ============================================================
CREATE POLICY announcements_select ON announcements
  FOR SELECT USING (is_published = TRUE OR is_panitia_or_admin());

CREATE POLICY announcements_insert ON announcements
  FOR INSERT WITH CHECK (is_panitia_or_admin());

CREATE POLICY announcements_update ON announcements
  FOR UPDATE USING (is_panitia_or_admin());

-- ============================================================
-- TABLE: schedules (public read, panitia write)
-- ============================================================
CREATE POLICY schedules_select ON schedules
  FOR SELECT USING (is_public = TRUE OR is_panitia_or_admin());

CREATE POLICY schedules_write ON schedules
  FOR ALL USING (is_panitia_or_admin());

-- ============================================================
-- TABLE: positions & selection_stages (read all, write admin)
-- ============================================================
CREATE POLICY positions_select ON positions
  FOR SELECT USING (TRUE); -- public

CREATE POLICY positions_write ON positions
  FOR ALL USING (is_admin());

CREATE POLICY stages_select ON selection_stages
  FOR SELECT USING (TRUE);

CREATE POLICY stages_write ON selection_stages
  FOR ALL USING (is_panitia_or_admin());

-- ============================================================
-- TABLE: audit_logs (insert all, select admin only)
-- ============================================================
CREATE POLICY audit_logs_select ON audit_logs
  FOR SELECT USING (is_admin());

CREATE POLICY audit_logs_insert ON audit_logs
  FOR INSERT WITH CHECK (TRUE); -- any authenticated user can insert

-- ============================================================
-- TABLE: settings (admin only)
-- ============================================================
CREATE POLICY settings_select ON settings
  FOR SELECT USING (is_admin());

CREATE POLICY settings_write ON settings
  FOR ALL USING (is_admin());
