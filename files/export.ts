// ============================================================
// SIPSELBUMD — Export Utilities
// Excel (XLSX) dan PDF export untuk seluruh hasil seleksi
// ============================================================

import { supabase } from '@/lib/supabase'

// ── Types ──────────────────────────────────────────────────
interface ExportRow {
  [key: string]: string | number | boolean | null | undefined
}

// ── STATUS LABEL MAP ──────────────────────────────────────
const STATUS_LABELS: Record<string, string> = {
  draft:                      'Draft',
  submitted:                  'Menunggu Verifikasi',
  lolos_administrasi:         'Lolos Administrasi',
  tidak_lolos_administrasi:   'Tidak Lolos Administrasi',
  ikut_ukk:                   'Mengikuti UKK',
  lolos_ukk:                  'Lolos UKK',
  tidak_lolos_ukk:            'Tidak Lolos UKK',
  ikut_wawancara:             'Mengikuti Wawancara',
  lolos_wawancara:            'Lolos Wawancara',
  tidak_lolos_wawancara:      'Tidak Lolos Wawancara',
  terpilih:                   'Calon Terpilih',
  tidak_terpilih:             'Tidak Terpilih',
  kontrak:                    'Kontrak Ditandatangani',
  diangkat:                   'Diangkat',
}

// ── FETCH DATA ─────────────────────────────────────────────
export async function fetchExportData(periodId: string) {
  const { data, error } = await supabase
    .from('applications')
    .select(`
      id, reg_number, status, is_carry_over, submitted_at,
      participants(full_name, nik, birth_date, gender, phone, email, address, education_level, education_major, education_school),
      positions(label, name, bumd_type),
      administration_results(status, is_pass, score_completeness, notes, verified_at),
      ukk_results(total_score, score_technical, score_psychology, score_paper, score_interview, is_pass, is_latest, version),
      interview_results(interview_type, score, is_pass, is_latest, interviewed_at),
      performance_contracts(contract_number, signed_date, status),
      appointments(decree_number, appointment_date, status)
    `)
    .eq('period_id', periodId)
    .order('submitted_at')

  if (error) throw error
  return data ?? []
}

// ── EXCEL EXPORT ───────────────────────────────────────────
export async function exportToExcel(periodId: string, periodLabel: string) {
  const data = await fetchExportData(periodId)

  const rows: ExportRow[] = data.map((a: any, i: number) => {
    const participant = a.participants ?? {}
    const ukk = (a.ukk_results ?? []).find((r: any) => r.is_latest)
    const interview = (a.interview_results ?? []).find((r: any) => r.is_latest)
    const adm = a.administration_results?.[0]
    const contract = a.performance_contracts?.[0]
    const appointment = a.appointments?.[0]

    return {
      'No.':                    i + 1,
      'No. Registrasi':         a.reg_number ?? '-',
      'Carry-over':             a.is_carry_over ? 'Ya' : 'Tidak',
      'NIK':                    participant.nik ?? '',
      'Nama Lengkap':           participant.full_name ?? '',
      'Jenis Kelamin':          participant.gender === 'L' ? 'Laki-laki' : 'Perempuan',
      'Tanggal Lahir':          participant.birth_date ?? '',
      'Pendidikan':             participant.education_level ?? '',
      'Jurusan':                participant.education_major ?? '',
      'Asal Institusi':         participant.education_school ?? '',
      'No. HP':                 participant.phone ?? '',
      'Email':                  participant.email ?? '',
      'Jabatan yang Dilamar':   a.positions?.label ?? '',
      'Status Saat Ini':        STATUS_LABELS[a.status] ?? a.status,
      'Tanggal Daftar':         a.submitted_at ? new Date(a.submitted_at).toLocaleDateString('id-ID') : '',
      // Administrasi
      'Status Administrasi':    adm ? (adm.is_pass ? 'Lolos' : 'Tidak Lolos') : '-',
      'Nilai Kelengkapan Adm.': adm?.score_completeness ?? '-',
      'Tanggal Verifikasi Adm.': adm?.verified_at ? new Date(adm.verified_at).toLocaleDateString('id-ID') : '-',
      'Catatan Adm.':           adm?.notes ?? '-',
      // UKK
      'Nilai Teknis UKK':       ukk?.score_technical ?? '-',
      'Nilai Psikologi UKK':    ukk?.score_psychology ?? '-',
      'Nilai Makalah UKK':      ukk?.score_paper ?? '-',
      'Nilai Wawancara UKK':    ukk?.score_interview ?? '-',
      'Nilai Total UKK':        ukk?.total_score ?? '-',
      'Status UKK':             ukk ? (ukk.is_pass ? 'Lulus' : 'Tidak Lulus') : '-',
      'Versi Input UKK':        ukk?.version ?? '-',
      // Wawancara
      'Jenis Wawancara':        interview?.interview_type?.toUpperCase() ?? '-',
      'Nilai Wawancara':        interview?.score ?? '-',
      'Status Wawancara':       interview ? (interview.is_pass ? 'Lulus' : 'Tidak Lulus') : '-',
      'Tanggal Wawancara':      interview?.interviewed_at ?? '-',
      // Kontrak & Pengangkatan
      'No. Kontrak':            contract?.contract_number ?? '-',
      'Tanggal Kontrak':        contract?.signed_date ?? '-',
      'No. SK Pengangkatan':    appointment?.decree_number ?? '-',
      'Tanggal Pengangkatan':   appointment?.appointment_date ?? '-',
    }
  })

  // Build CSV (fallback when xlsx not available)
  const headers = Object.keys(rows[0] ?? {})
  const csvContent = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  const BOM = '\uFEFF' // UTF-8 BOM for Excel
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  const safeName = periodLabel.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40)
  a.href = url
  a.download = `SIPSELBUMD_${safeName}_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── PDF REKAP EXPORT ───────────────────────────────────────
export async function exportRekapPDF(periodId: string, periodLabel: string) {
  const data = await fetchExportData(periodId)

  const now = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

  const rows = data.map((a: any, i: number) => {
    const p = a.participants ?? {}
    const ukk = (a.ukk_results ?? []).find((r: any) => r.is_latest)
    return `
      <tr class="${i % 2 === 0 ? 'even' : ''}">
        <td>${i + 1}</td>
        <td>${a.reg_number ?? '-'}</td>
        <td>${p.full_name ?? '-'}</td>
        <td>${p.nik ?? '-'}</td>
        <td>${a.positions?.label ?? '-'}</td>
        <td>${a.is_carry_over ? '🔄 Ya' : 'Tidak'}</td>
        <td style="color:${a.status.includes('lolos') || a.status === 'terpilih' || a.status === 'diangkat' ? '#059669' : a.status.includes('tidak_lolos') ? '#DC2626' : '#D97706'};font-weight:600">
          ${STATUS_LABELS[a.status] ?? a.status}
        </td>
        <td style="text-align:center;font-weight:700">${ukk ? ukk.total_score.toFixed(1) : '-'}</td>
      </tr>
    `
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4 landscape; margin: 1.5cm 2cm; }
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Arial',sans-serif; font-size:10pt; color:#000; }
  .header { text-align:center; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:16px; }
  .header h1 { font-size:13pt; font-weight:700; text-transform:uppercase; }
  .header h2 { font-size:11pt; font-weight:400; margin-top:4px; }
  .header p  { font-size:9pt; color:#555; margin-top:2px; }
  table { width:100%; border-collapse:collapse; font-size:9pt; }
  thead tr { background:#1E3A8A; color:white; }
  thead th { padding:7px 6px; text-align:left; font-weight:700; border:1px solid #1E3A8A; }
  tbody td { padding:5px 6px; border:1px solid #ddd; vertical-align:top; }
  tbody tr.even td { background:#f9fafb; }
  tbody tr:hover td { background:#EFF6FF; }
  .footer { margin-top:16px; font-size:8pt; color:#888; display:flex; justify-content:space-between; }
  .summary { margin-bottom:14px; display:flex; gap:20px; }
  .stat-box { background:#F1F5F9; border:1px solid #E2E8F0; border-radius:6px; padding:8px 14px; }
  .stat-box .val { font-size:18pt; font-weight:700; color:#0F172A; }
  .stat-box .lbl { font-size:8pt; color:#64748B; }
</style>
</head>
<body>

<div class="header">
  <h1>Rekap Hasil Seleksi BUMD</h1>
  <h2>${periodLabel}</h2>
  <p>Dicetak: ${now} · Sistem Informasi Seleksi BUMD (SIPSELBUMD)</p>
</div>

<div class="summary">
  ${[
    { val: data.length, lbl: 'Total Pendaftar' },
    { val: data.filter((a: any) => a.status.includes('lolos') || ['terpilih','kontrak','diangkat'].includes(a.status)).length, lbl: 'Lolos Administrasi' },
    { val: data.filter((a: any) => (a.ukk_results ?? []).find((r: any) => r.is_latest && r.is_pass)).length, lbl: 'Lolos UKK' },
    { val: data.filter((a: any) => ['terpilih','kontrak','diangkat'].includes(a.status)).length, lbl: 'Calon Terpilih' },
    { val: data.filter((a: any) => a.is_carry_over).length, lbl: 'Carry-over' },
  ].map(s => `<div class="stat-box"><div class="val">${s.val}</div><div class="lbl">${s.lbl}</div></div>`).join('')}
</div>

<table>
  <thead>
    <tr>
      <th style="width:28px">No.</th>
      <th style="width:110px">No. Reg.</th>
      <th>Nama Lengkap</th>
      <th style="width:130px">NIK</th>
      <th>Jabatan</th>
      <th style="width:60px">Carry-over</th>
      <th style="width:150px">Status Terakhir</th>
      <th style="width:60px;text-align:center">Nilai UKK</th>
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>

<div class="footer">
  <span>SIPSELBUMD — Sistem Informasi Seleksi BUMD | Dokumen ini diterbitkan secara digital</span>
  <span>Halaman 1 dari 1 · ${now}</span>
</div>

</body>
</html>`

  const win = window.open('', '_blank')
  if (win) {
    win.document.write(html)
    win.document.close()
    setTimeout(() => win.print(), 600)
  }
}

// ── AUDIT LOG EXPORT ───────────────────────────────────────
export async function exportAuditLogCSV(startDate?: string, endDate?: string) {
  let q = supabase
    .from('audit_logs')
    .select(`id, action, table_name, record_id, ip_address, created_at, users(email, role)`)
    .order('created_at', { ascending: false })

  if (startDate) q = q.gte('created_at', startDate)
  if (endDate)   q = q.lte('created_at', endDate)

  const { data, error } = await q.limit(5000)
  if (error) throw error

  const rows: ExportRow[] = (data ?? []).map((log: any) => ({
    'Timestamp':    new Date(log.created_at).toLocaleString('id-ID'),
    'Aksi':         log.action,
    'Tabel':        log.table_name ?? '-',
    'ID Record':    log.record_id ?? '-',
    'IP Address':   log.ip_address ?? '-',
    'User Email':   log.users?.email ?? '-',
    'User Role':    log.users?.role ?? '-',
  }))

  const headers = Object.keys(rows[0] ?? {})
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n')

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url
  a.download = `audit-log-${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(a); a.click()
  document.body.removeChild(a); URL.revokeObjectURL(url)
}
