// ============================================================
// SIPSELBUMD — Types Update (migration 003)
// ============================================================

export type SelectionPeriodStatus = 'draft' | 'open' | 'closed' | 'completed'
export type ContentPageType =
  | 'persyaratan'
  | 'tahapan'
  | 'jadwal'
  | 'pengumuman'
  | 'tata_cara'
  | 'tentang'

// ============================================================
// Selection Period
// ============================================================
export interface SelectionPeriod {
  id: string
  period_code: string
  period_label: string
  bumd_name: string
  bumd_short: string
  bumd_type: 'perumda' | 'perseroda'
  is_restricted: boolean
  access_code?: string         // internal only — never exposed to public API
  min_candidates: number
  quota_position: number
  status: SelectionPeriodStatus
  open_date?: string
  close_date?: string
  notes?: string
  created_by?: string
  created_at: string
  updated_at: string
}

// Public-safe version (no access_code)
export type SelectionPeriodPublic = Omit<SelectionPeriod, 'access_code'>

// ============================================================
// Access Code
// ============================================================
export interface AccessCode {
  id: string
  period_id: string
  code: string
  label?: string
  issued_to?: string
  used_by?: string
  used_at?: string
  is_active: boolean
  expires_at?: string
  created_by?: string
  created_at: string
}

// ============================================================
// Content Page (Editable by admin/panitia)
// ============================================================
export interface ContentPage {
  id: string
  period_id?: string
  page_type: ContentPageType
  title: string
  content: string              // markdown/rich text
  metadata?: ContentMetadata
  version: number
  is_published: boolean
  published_at?: string
  updated_by?: string
  created_at: string
  updated_at: string
}

export interface ContentMetadata {
  required_docs?: string[]
  access_required?: boolean
  jadwal_items?: JadwalItem[]
  tahapan_items?: TahapanItem[]
}

export interface JadwalItem {
  no: number
  tahapan: string
  tanggal: string
  keterangan?: string
}

export interface TahapanItem {
  no: number
  nama: string
  deskripsi: string
  icon?: string
}

// ============================================================
// Period Summary (from v_period_summary view)
// ============================================================
export interface PeriodSummary {
  id: string
  period_code: string
  period_label: string
  bumd_name: string
  bumd_short: string
  bumd_type: string
  is_restricted: boolean
  status: SelectionPeriodStatus
  min_candidates: number
  quota_position: number
  total_applicants: number
  carry_over_count: number
  passed_admin: number
  passed_ukk: number
  selected: number
  appointed: number
}

// ============================================================
// Application (updated with carry-over fields)
// ============================================================
export interface ApplicationExtended {
  id: string
  participant_id: string
  position_id: string
  period_id?: string
  reg_number?: string
  status: import('./index').ApplicationStatus
  is_carry_over: boolean
  carry_over_from?: string
  carry_over_note?: string
  submitted_at?: string
  notes?: string
  created_at: string
  updated_at: string
  // Relations
  participant?: import('./index').Participant
  position?: import('./index').Position
  period?: SelectionPeriod
}

// ============================================================
// Forms
// ============================================================
export interface AccessCodeValidationResult {
  valid: boolean
  message: string
  code_id?: string
}

export interface RegisterRestrictedForm {
  period_id: string
  access_code: string           // required for is_restricted periods
  nik: string
  full_name: string
  birth_date: string
  gender: 'L' | 'P'
  jabatan_pemda: string         // jabatan di Pemda (khusus terbatas)
  unit_kerja: string            // unit kerja di Pemda
  email: string
  phone: string
}

export interface ContentPageUpdateForm {
  title: string
  content: string
  metadata?: ContentMetadata
  is_published: boolean
}

export interface JadwalUpdateForm {
  period_id: string
  jadwal_items: JadwalItem[]
}
