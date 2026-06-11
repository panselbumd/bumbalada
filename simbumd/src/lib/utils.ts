import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatRupiah(value: number | null | undefined, short = false): string {
  if (!value) return 'Rp 0'
  if (short) {
    if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toFixed(1)}M`
    if (value >= 1_000_000)     return `Rp ${(value / 1_000_000).toFixed(1)}Jt`
    if (value >= 1_000)         return `Rp ${(value / 1_000).toFixed(0)}K`
  }
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value)
}

export function formatPct(value: number | null | undefined, decimals = 1): string {
  if (value == null) return '—'
  return `${value.toFixed(decimals)}%`
}

export function pctColor(pct: number): string {
  if (pct >= 90) return '#27500A'
  if (pct >= 75) return '#633806'
  return '#791F1F'
}

export function healthBadgeClass(level: string): string {
  const map: Record<string, string> = {
    sehat:         'badge-sehat',
    kurang_sehat:  'badge-kurang',
    tidak_sehat:   'badge-tidak',
  }
  return map[level] ?? 'badge-kurang'
}

export function opinionBadgeClass(op: string): string {
  const map: Record<string, string> = {
    WTP: 'badge-wtp', WTP_DPP: 'badge-wtp',
    WDP: 'badge-wdp',
    TMP: 'badge-tmp', belum: 'badge-tmp',
  }
  return map[op] ?? 'badge-tmp'
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  }).format(new Date(iso))
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso))
}

export const TRIWULAN_LABEL = ['', 'Triwulan I', 'Triwulan II', 'Triwulan III', 'Triwulan IV']

export function roleName(role: string): string {
  const map: Record<string, string> = {
    superadmin:       'Superadmin',
    admin:            'Admin',
    panitia_seleksi:  'Panitia Seleksi',
    penilai:          'Penilai',
    viewer_eksekutif: 'Viewer Eksekutif',
    bumd_operator:    'Operator BUMD',
  }
  return map[role] ?? role
}

export function pesertaStatusLabel(s: string): string {
  const map: Record<string, string> = {
    terdaftar:               'Terdaftar',
    review_dokumen:          'Review Dokumen',
    lolos_administrasi:      'Lolos Administrasi',
    tidak_lolos_administrasi:'Tidak Lolos Administrasi',
    lolos_ukk:               'Lolos UKK',
    tidak_lolos_ukk:         'Tidak Lolos UKK',
    lolos_wawancara:         'Lolos Wawancara',
    tidak_lolos_wawancara:   'Tidak Lolos Wawancara',
    ditetapkan:              'Ditetapkan',
  }
  return map[s] ?? s
}
