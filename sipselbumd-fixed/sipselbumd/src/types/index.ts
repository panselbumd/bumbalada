// ============================================================
// SIPSELBUMD — TypeScript Types
// Generated from Supabase PostgreSQL schema
// ============================================================

export type UserRole = 'peserta' | 'panitia' | 'ukk' | 'admin'

export type BumdType = 'perumda' | 'perseroda'

export type PositionType =
  | 'dewan_pengawas_perumda'
  | 'komisaris_perseroda'
  | 'direksi_perumda'
  | 'direksi_perseroda'

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'verified'
  | 'rejected'
  | 'lolos_administrasi'
  | 'tidak_lolos_administrasi'
  | 'ikut_ukk'
  | 'lolos_ukk'
  | 'tidak_lolos_ukk'
  | 'ikut_wawancara'
  | 'lolos_wawancara'
  | 'tidak_lolos_wawancara'
  | 'terpilih'
  | 'tidak_terpilih'
  | 'kontrak'
  | 'diangkat'

export type DocType =
  | 'ktp'
  | 'pas_foto'
  | 'cv'
  | 'ijazah'
  | 'npwp'
  | 'skck'
  | 'surat_kesehatan'
  | 'pakta_integritas'
  | 'dok_pendukung'
  | 'berita_acara'
  | 'kontrak_kinerja'

export type VerificationStatus = 'pending' | 'valid' | 'invalid' | 'need_revision'

export type InterviewType = 'kpm' | 'rups' | 'ukk'

// ============================================================
// DATABASE TYPES
// ============================================================

export interface User {
  id: string
  email: string
  phone?: string
  full_name?: string
  role: UserRole
  is_active: boolean
  last_login_at?: string
  created_at: string
  updated_at: string
}

export interface Role {
  id: string
  name: UserRole
  label: string
  permissions: Record<string, boolean>
  created_at: string
}

export interface Position {
  id: string
  name: PositionType
  label: string
  bumd_type: BumdType
  company_name: string
  company_code?: string
  quota: number
  period: string
  is_active: boolean
  created_at: string
}

export interface SelectionStage {
  id: string
  position_id?: string
  stage_order: number
  stage_name: string
  stage_code: string
  start_date?: string
  end_date?: string
  is_active: boolean
  is_done: boolean
  notes?: string
  created_at: string
}

export interface Participant {
  id: string
  user_id: string
  nik: string
  full_name: string
  birth_place?: string
  birth_date?: string
  gender?: 'L' | 'P'
  religion?: string
  address?: string
  phone?: string
  email?: string
  education_level?: string
  education_major?: string
  education_school?: string
  graduation_year?: number
  work_experience?: WorkExperience[]
  photo_url?: string
  created_at: string
  updated_at: string
}

export interface WorkExperience {
  company: string
  position: string
  start_year: number
  end_year?: number
  is_current?: boolean
}

export interface Application {
  id: string
  participant_id: string
  position_id: string
  reg_number?: string
  status: ApplicationStatus
  submitted_at?: string
  notes?: string
  created_at: string
  updated_at: string
  // Relations
  participant?: Participant
  position?: Position
}

export interface Document {
  id: string
  application_id: string
  doc_type: DocType
  file_name: string
  file_url: string
  file_size?: number
  mime_type?: string
  status: VerificationStatus
  verified_by?: string
  verified_at?: string
  notes?: string
  created_at: string
}

export interface AdministrationResult {
  id: string
  application_id: string
  verified_by?: string
  status: VerificationStatus
  is_pass?: boolean
  score_completeness?: number
  notes?: string
  verified_at?: string
  created_at: string
}

export interface UKKResult {
  id: string
  application_id: string
  input_by?: string
  version: number
  score_technical: number
  score_psychology: number
  score_paper: number
  score_interview: number
  total_score: number
  is_pass?: boolean
  is_latest: boolean
  notes?: string
  created_at: string
}

export interface InterviewResult {
  id: string
  application_id: string
  interview_type: InterviewType
  conducted_by?: string
  version: number
  score?: number
  is_pass?: boolean
  recommendation?: string
  is_latest: boolean
  interviewed_at?: string
  created_at: string
}

export interface PerformanceContract {
  id: string
  application_id: string
  contract_number?: string
  signed_date?: string
  start_date?: string
  end_date?: string
  document_url?: string
  qr_code?: string
  e_materai_id?: string
  status: string
  created_at: string
}

export interface Appointment {
  id: string
  application_id: string
  decree_number?: string
  appointment_date?: string
  start_date?: string
  document_url?: string
  qr_code?: string
  status: string
  created_at: string
}

export interface Announcement {
  id: string
  title: string
  slug?: string
  content: string
  excerpt?: string
  stage?: string
  position_id?: string
  is_published: boolean
  published_at?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface Schedule {
  id: string
  position_id?: string
  stage: string
  title: string
  location?: string
  start_at: string
  end_at: string
  is_public: boolean
  notes?: string
  created_at: string
}

export interface AuditLog {
  id: string
  user_id?: string
  action: string
  table_name?: string
  record_id?: string
  old_data?: Record<string, unknown>
  new_data?: Record<string, unknown>
  ip_address?: string
  user_agent?: string
  created_at: string
}

// ============================================================
// API RESPONSE TYPES
// ============================================================

export interface ApiResponse<T> {
  data: T | null
  error: string | null
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ============================================================
// DASHBOARD STATS
// ============================================================

export interface DashboardStats {
  total_applicants: number
  passed_admin: number
  failed_admin: number
  ukk_participants: number
  passed_ukk: number
  failed_ukk: number
  interview_participants: number
  passed_interview: number
  selected_candidates: number
  signed_contracts: number
  appointed: number
}

// ============================================================
// FORM TYPES
// ============================================================

export interface RegisterParticipantForm {
  nik: string
  full_name: string
  birth_place: string
  birth_date: string
  gender: 'L' | 'P'
  religion: string
  address: string
  phone: string
  email: string
  education_level: string
  education_major: string
  education_school: string
  graduation_year: number
  position_id: string
}

export interface InputUKKForm {
  application_id: string
  score_technical: number
  score_psychology: number
  score_paper: number
  score_interview: number
  is_pass: boolean
  notes?: string
}

export interface InputInterviewForm {
  application_id: string
  interview_type: InterviewType
  score: number
  is_pass: boolean
  recommendation?: string
  interviewed_at: string
}
