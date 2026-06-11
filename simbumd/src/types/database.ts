export type UserRole =
  | 'superadmin'
  | 'admin'
  | 'panitia_seleksi'
  | 'penilai'
  | 'viewer_eksekutif'
  | 'bumd_operator'

export type UserStatus = 'aktif' | 'nonaktif' | 'pending'
export type BumdType   = 'perseroda' | 'perumda'
export type HealthLevel = 'sehat' | 'kurang_sehat' | 'tidak_sehat'
export type AuditorOpinion = 'WTP' | 'WTP_DPP' | 'WDP' | 'TMP' | 'belum'
export type KpiStatus = 'melebihi_target' | 'tercapai' | 'tidak_tercapai'
export type SeleksiStatus =
  | 'draft' | 'dibuka' | 'seleksi_administrasi'
  | 'ukk' | 'wawancara' | 'selesai' | 'dibatalkan'
export type PesertaStatus =
  | 'terdaftar' | 'review_dokumen' | 'lolos_administrasi'
  | 'tidak_lolos_administrasi' | 'lolos_ukk' | 'tidak_lolos_ukk'
  | 'lolos_wawancara' | 'tidak_lolos_wawancara' | 'ditetapkan'

export interface Profile {
  id:            string
  nip?:          string
  nama_lengkap:  string
  email:         string
  role:          UserRole
  unit_kerja?:   string
  jabatan?:      string
  no_hp?:        string
  avatar_url?:   string
  status:        UserStatus
  tahun_aktif?:  number
  expired_at?:   string
  last_login_at?: string
  created_at:    string
  updated_at:    string
}

export interface Bumd {
  id:           string
  kode:         string
  nama:         string
  singkatan?:   string
  jenis:        BumdType
  alamat?:      string
  telepon?:     string
  email?:       string
  direktur?:    string
  aktif:        boolean
}

export interface Blud {
  id:         string
  kode:       string
  nama:       string
  singkatan?: string
  jenis?:     string
  direktur?:  string
  aktif:      boolean
}

export interface LaporanKinerjaBumd {
  id:                   string
  bumd_id:              string
  tahun:                number
  triwulan:             number
  target_pendapatan?:   number
  realisasi_pendapatan?: number
  target_laba?:         number
  realisasi_laba?:      number
  total_aset?:          number
  total_kewajiban?:     number
  dividen?:             number
  skor_kesehatan?:      number
  level_kesehatan?:     HealthLevel
  opini_auditor?:       AuditorOpinion
  catatan?:             string
  submitted_at?:        string
  bumd?:                Bumd
}

export interface ProsesSeleksi {
  id:                   string
  kode:                 string
  judul:                string
  bumd_id?:             string
  blud_id?:             string
  jabatan:              string
  kuota:                number
  status:               SeleksiStatus
  buka_pendaftaran?:    string
  tutup_pendaftaran?:   string
  jadwal_ukk?:          string
  jadwal_wawancara?:    string
  pengumuman_at?:       string
  syarat_umum?:         string
  syarat_khusus?:       string
  bumd?:                Bumd
  blud?:                Blud
  created_at:           string
}

export interface PesertaSeleksi {
  id:               string
  seleksi_id:       string
  nama_lengkap:     string
  nik:              string
  email?:           string
  no_hp?:           string
  pendidikan?:      string
  pengalaman_tahun?: number
  status:           PesertaStatus
  nilai_administrasi?: number
  nilai_ukk?:       number
  nilai_wawancara?: number
  nilai_akhir?:     number
  ranking?:         number
  registered_at:    string
}

export interface AuditLog {
  id:          string
  user_id?:    string
  action:      string
  modul?:      string
  deskripsi:   string
  ip_address?: string
  created_at:  string
  profiles?:   Pick<Profile, 'nama_lengkap' | 'role'>
}

// Supabase Database type map (untuk typed queries)
export interface Database {
  public: {
    Tables: {
      profiles:               { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> }
      bumd:                   { Row: Bumd;    Insert: Partial<Bumd>;    Update: Partial<Bumd> }
      blud:                   { Row: Blud;    Insert: Partial<Blud>;    Update: Partial<Blud> }
      laporan_kinerja_bumd:   { Row: LaporanKinerjaBumd; Insert: Partial<LaporanKinerjaBumd>; Update: Partial<LaporanKinerjaBumd> }
      proses_seleksi:         { Row: ProsesSeleksi; Insert: Partial<ProsesSeleksi>; Update: Partial<ProsesSeleksi> }
      peserta_seleksi:        { Row: PesertaSeleksi; Insert: Partial<PesertaSeleksi>; Update: Partial<PesertaSeleksi> }
      audit_log:              { Row: AuditLog; Insert: Partial<AuditLog>; Update: Partial<AuditLog> }
    }
  }
}
