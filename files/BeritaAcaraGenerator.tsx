'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export type BAType =
  | 'verifikasi_administrasi'
  | 'penetapan_lolos_administrasi'
  | 'ukk'
  | 'wawancara_kpm'
  | 'wawancara_rups'
  | 'penetapan_terpilih'
  | 'serah_terima'

interface BACandidate {
  name: string
  nik: string
  reg_number: string
  position: string
  score?: number
  status: string
  notes?: string
}

interface BeritaAcaraData {
  type: BAType
  nomor_ba: string
  kota: string
  tanggal: string
  bumd_name: string
  bumd_short: string
  period_label: string
  ketua_panitia: string
  jabatan_ketua: string
  candidates: BACandidate[]
  dasar_hukum?: string[]
  notes?: string
}

const BA_LABELS: Record<BAType, string> = {
  verifikasi_administrasi:    'Verifikasi Administrasi',
  penetapan_lolos_administrasi: 'Penetapan Peserta Lolos Administrasi',
  ukk:                        'Uji Kompetensi dan Kelayakan (UKK)',
  wawancara_kpm:              'Wawancara KPM',
  wawancara_rups:             'Wawancara RUPS',
  penetapan_terpilih:         'Penetapan Calon Terpilih',
  serah_terima:               'Serah Terima Jabatan',
}

export default function BeritaAcaraGenerator() {
  const [baType, setBaType]           = useState<BAType>('verifikasi_administrasi')
  const [nomorBA, setNomorBA]         = useState('')
  const [kota, setKota]               = useState('')
  const [tanggal, setTanggal]         = useState(new Date().toISOString().split('T')[0])
  const [bumdName, setBumdName]       = useState('')
  const [bumdShort, setBumdShort]     = useState('')
  const [periodLabel, setPeriodLabel] = useState('')
  const [ketuaPanitia, setKetuaPanitia]     = useState('')
  const [jabatanKetua, setJabatanKetua]     = useState('')
  const [notes, setNotes]             = useState('')
  const [candidates, setCandidates]   = useState<BACandidate[]>([])
  const [generating, setGenerating]   = useState(false)
  const [generated, setGenerated]     = useState(false)
  const [loadingCandidates, setLoadingCandidates] = useState(false)

  // Load candidates from DB for selected period/type
  async function loadCandidatesFromDB(periodId: string, statusFilter: string[]) {
    setLoadingCandidates(true)
    const { data } = await supabase
      .from('applications')
      .select(`
        id, reg_number, status,
        participants(full_name, nik),
        positions(label),
        ukk_results(total_score, is_pass, is_latest)
      `)
      .eq('period_id', periodId)
      .in('status', statusFilter)
      .order('created_at')

    if (data) {
      setCandidates(data.map(a => ({
        name:       (a.participants as any)?.full_name ?? '',
        nik:        (a.participants as any)?.nik ?? '',
        reg_number: a.reg_number ?? '',
        position:   (a.positions as any)?.label ?? '',
        score:      (a.ukk_results as any[])?.find((r: any) => r.is_latest)?.total_score,
        status:     a.status,
      })))
    }
    setLoadingCandidates(false)
  }

  function addManualCandidate() {
    setCandidates(prev => [...prev, {
      name: '', nik: '', reg_number: '', position: '', status: 'lolos_administrasi',
    }])
  }

  function updateCandidate(idx: number, field: keyof BACandidate, value: string | number) {
    setCandidates(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c))
  }

  function removeCandidate(idx: number) {
    setCandidates(prev => prev.filter((_, i) => i !== idx))
  }

  function generatePDFContent(): string {
    const tgl = new Date(tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const baLabel = BA_LABELS[baType]

    const candidateRows = candidates.map((c, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${c.name}</td>
        <td>${c.nik}</td>
        <td>${c.reg_number || '-'}</td>
        <td>${c.position}</td>
        ${baType === 'ukk' ? `<td>${c.score !== undefined ? c.score.toFixed(2) : '-'}</td>` : ''}
        <td style="color:${c.status.includes('lolos') || c.status === 'terpilih' ? '#059669' : '#DC2626'};font-weight:700">
          ${c.status.includes('tidak_lolos') ? 'Tidak Lolos' : c.status === 'terpilih' ? 'Terpilih' : 'Lolos'}
        </td>
        <td>${c.notes ?? ''}</td>
      </tr>
    `).join('')

    return `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<style>
  @page { size: A4; margin: 2.5cm 3cm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; color: #000; line-height: 1.5; }
  .header { text-align: center; border-bottom: 3px double #000; padding-bottom: 12px; margin-bottom: 20px; }
  .header .logo-row { display: flex; align-items: center; justify-content: center; gap: 20px; margin-bottom: 8px; }
  .header .logo-placeholder { width: 60px; height: 60px; border: 1px solid #000; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8pt; text-align: center; }
  .header h1 { font-size: 13pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .header h2 { font-size: 11pt; font-weight: 400; }
  .header h3 { font-size: 10pt; font-weight: 400; }
  .title-block { text-align: center; margin: 24px 0 20px; }
  .title-block .ba-title { font-size: 13pt; font-weight: 700; text-transform: uppercase; text-decoration: underline; }
  .title-block .ba-number { font-size: 11pt; margin-top: 4px; }
  .section { margin-bottom: 16px; }
  .section p { text-align: justify; margin-bottom: 8px; text-indent: 40px; }
  .section ol { padding-left: 40px; }
  .section ol li { margin-bottom: 4px; }
  .section ul { padding-left: 40px; }
  .section ul li { margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 10pt; }
  table th { background: #f0f0f0; border: 1px solid #000; padding: 6px 8px; text-align: center; font-weight: 700; }
  table td { border: 1px solid #000; padding: 5px 8px; vertical-align: top; }
  .sign-block { margin-top: 40px; display: flex; justify-content: space-between; }
  .sign-col { text-align: center; width: 220px; }
  .sign-col .role { font-weight: 700; margin-bottom: 60px; }
  .sign-col .name { font-weight: 700; text-decoration: underline; }
  .sign-col .nip { font-size: 10pt; }
  .page-break { page-break-before: always; }
  .bold { font-weight: 700; }
  .center { text-align: center; }
</style>
</head>
<body>

<!-- KOP SURAT -->
<div class="header">
  <div class="logo-row">
    <div class="logo-placeholder">LOGO<br>PEMDA</div>
    <div>
      <h1>PEMERINTAH DAERAH</h1>
      <h2>PANITIA SELEKSI ${bumdShort.toUpperCase()}</h2>
      <h3>${periodLabel}</h3>
    </div>
    <div class="logo-placeholder">LOGO<br>${bumdShort}</div>
  </div>
</div>

<!-- JUDUL BA -->
<div class="title-block">
  <div class="ba-title">Berita Acara ${baLabel}</div>
  <div class="ba-number">Nomor: ${nomorBA || '[Nomor BA]'}</div>
</div>

<!-- PEMBUKA -->
<div class="section">
  <p>Pada hari ini, tanggal <span class="bold">${tgl}</span>, bertempat di <span class="bold">${kota}</span>, kami yang bertanda tangan di bawah ini, Panitia Seleksi ${BA_LABELS[baType].toLowerCase()} ${periodLabel}, telah melaksanakan kegiatan ${baLabel} dengan uraian sebagai berikut:</p>
</div>

<!-- DASAR HUKUM -->
<div class="section">
  <p class="bold">I. DASAR HUKUM</p>
  <ol>
    <li>Undang-Undang Nomor 23 Tahun 2014 tentang Pemerintahan Daerah;</li>
    <li>Peraturan Pemerintah Nomor 54 Tahun 2017 tentang Badan Usaha Milik Daerah;</li>
    <li>Peraturan Menteri Dalam Negeri Nomor 37 Tahun 2018 tentang Pengangkatan dan Pemberhentian Anggota Dewan Pengawas atau Anggota Komisaris dan Anggota Direksi Badan Usaha Milik Daerah;</li>
    <li>Keputusan Kepala Daerah tentang Pembentukan Panitia Seleksi ${bumdShort}.</li>
  </ol>
</div>

<!-- HASIL -->
<div class="section">
  <p class="bold">II. HASIL ${baLabel.toUpperCase()}</p>
  <p>Berdasarkan pelaksanaan ${baLabel.toLowerCase()} yang telah dilaksanakan, diperoleh hasil sebagai berikut:</p>

  <table>
    <thead>
      <tr>
        <th style="width:30px">No.</th>
        <th>Nama</th>
        <th>NIK</th>
        <th>No. Reg.</th>
        <th>Jabatan</th>
        ${baType === 'ukk' ? '<th>Nilai</th>' : ''}
        <th>Keterangan</th>
        <th>Catatan</th>
      </tr>
    </thead>
    <tbody>
      ${candidateRows}
    </tbody>
  </table>
</div>

<!-- KESIMPULAN -->
<div class="section">
  <p class="bold">III. KESIMPULAN</p>
  <p>Berdasarkan hasil ${baLabel.toLowerCase()} sebagaimana tersebut di atas, Panitia Seleksi menyimpulkan bahwa:</p>
  <ol>
    <li>Jumlah peserta yang mengikuti: <span class="bold">${candidates.length} (${angkaTerbilang(candidates.length)}) orang</span>;</li>
    <li>Jumlah peserta yang dinyatakan lolos: <span class="bold">${candidates.filter(c => !c.status.includes('tidak_lolos')).length} orang</span>;</li>
    <li>Jumlah peserta yang tidak lolos: <span class="bold">${candidates.filter(c => c.status.includes('tidak_lolos')).length} orang</span>.</li>
  </ol>
  ${notes ? `<p>${notes}</p>` : ''}
</div>

<!-- PENUTUP -->
<div class="section">
  <p>Demikian Berita Acara ini dibuat dengan sebenar-benarnya untuk dapat dipergunakan sebagaimana mestinya.</p>
</div>

<!-- TANDA TANGAN -->
<div class="sign-block">
  <div class="sign-col">
    <p>${kota}, ${tgl}</p>
    <p class="role">Mengetahui,<br>Kepala Daerah / KPM</p>
    <p class="name">[Nama Kepala Daerah]</p>
    <p class="nip">NIP. _______________</p>
  </div>
  <div class="sign-col">
    <p>&nbsp;</p>
    <p class="role">Ketua Panitia Seleksi</p>
    <p class="name">${ketuaPanitia || '[Nama Ketua Panitia]'}</p>
    <p class="nip">${jabatanKetua || 'NIP. _______________'}</p>
  </div>
</div>

<!-- QR VERIFIKASI -->
<div style="margin-top:40px;padding-top:12px;border-top:1px solid #000;font-size:9pt;color:#555;display:flex;justify-content:space-between;align-items:flex-end;">
  <div>
    <p>Dokumen ini diterbitkan secara digital oleh SIPSELBUMD.</p>
    <p>Kode verifikasi: <span class="bold">[QR-${Date.now().toString(36).toUpperCase()}]</span></p>
    <p>Verifikasi di: https://sipselbumd.go.id/verifikasi</p>
  </div>
  <div style="width:64px;height:64px;border:2px solid #000;display:flex;align-items:center;justify-content:center;font-size:7pt;text-align:center;">
    QR Code<br>Verifikasi
  </div>
</div>

</body>
</html>`
  }

  async function handleGenerate() {
    setGenerating(true)
    const htmlContent = generatePDFContent()

    // Open in new window for printing/saving as PDF
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(htmlContent)
      win.document.close()
      setTimeout(() => win.print(), 500)
    }

    // Save record to DB
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('audit_logs').insert({
      user_id:    user?.id,
      action:     'GENERATE_BERITA_ACARA',
      table_name: 'berita_acara',
      new_data:   { type: baType, nomor: nomorBA, tanggal, candidates: candidates.length },
    })

    setGenerated(true)
    setGenerating(false)
    setTimeout(() => setGenerated(false), 3000)
  }

  return (
    <div className="max-w-[800px]">
      <div className="mb-6">
        <h1 className="text-[20px] font-extrabold text-[#0F172A] mb-1">Generator Berita Acara</h1>
        <p className="text-[13px] text-[#64748B]">Buat Berita Acara seleksi secara otomatis dengan format resmi. Dokumen akan dapat dicetak sebagai PDF.</p>
      </div>

      {/* Type selector */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 mb-4">
        <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wide mb-3">Jenis Berita Acara</label>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(BA_LABELS) as [BAType, string][]).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setBaType(key)}
              className={`px-3 py-2.5 rounded-xl border text-left transition-all text-[12.5px] font-medium ${
                baType === key
                  ? 'border-[#1E40AF] bg-[#EFF6FF] text-[#1E40AF]'
                  : 'border-[#E2E8F0] text-[#64748B] hover:border-[#1E40AF]/30 hover:text-[#374151]'
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* BA metadata */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 mb-4">
        <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wide mb-4">Informasi Dokumen</div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nomor BA">
            <input value={nomorBA} onChange={e => setNomorBA(e.target.value)}
              placeholder="000/BA-PANSEL/I/2026"
              className="field-input" />
          </Field>
          <Field label="Tanggal">
            <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} className="field-input" />
          </Field>
          <Field label="Kota / Tempat">
            <input value={kota} onChange={e => setKota(e.target.value)} placeholder="Nama Kota" className="field-input" />
          </Field>
          <Field label="Nama BUMD">
            <input value={bumdName} onChange={e => setBumdName(e.target.value)} placeholder="PT. Banjar Wisata Raya" className="field-input" />
          </Field>
          <Field label="Singkatan BUMD">
            <input value={bumdShort} onChange={e => setBumdShort(e.target.value)} placeholder="PT. BWR" className="field-input" />
          </Field>
          <Field label="Label Periode">
            <input value={periodLabel} onChange={e => setPeriodLabel(e.target.value)} placeholder="Seleksi Direksi PT. BWR 2026" className="field-input" />
          </Field>
          <Field label="Ketua Panitia">
            <input value={ketuaPanitia} onChange={e => setKetuaPanitia(e.target.value)} placeholder="Nama Lengkap" className="field-input" />
          </Field>
          <Field label="Jabatan Ketua">
            <input value={jabatanKetua} onChange={e => setJabatanKetua(e.target.value)} placeholder="NIP. / Jabatan" className="field-input" />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Catatan Tambahan (opsional)">
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Catatan khusus yang perlu dicantumkan dalam BA..."
              className="field-input resize-none" />
          </Field>
        </div>
      </div>

      {/* Candidates */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wide">Daftar Peserta</div>
          <button onClick={addManualCandidate}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] rounded-lg hover:bg-[#DBEAFE] transition-colors">
            + Tambah Manual
          </button>
        </div>

        {candidates.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-[#E2E8F0] rounded-xl">
            <p className="text-[13px] text-[#94A3B8] mb-3">Belum ada peserta ditambahkan</p>
            <button onClick={addManualCandidate}
              className="px-4 py-2 text-[12.5px] font-bold text-[#1E40AF] border border-[#BFDBFE] bg-[#EFF6FF] rounded-xl hover:bg-[#DBEAFE] transition-colors">
              + Tambah Peserta
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr className="border-b border-[#F1F5F9]">
                  <th className="text-left px-2 py-2 text-[10px] font-bold text-[#94A3B8] uppercase">No</th>
                  <th className="text-left px-2 py-2 text-[10px] font-bold text-[#94A3B8] uppercase">Nama</th>
                  <th className="text-left px-2 py-2 text-[10px] font-bold text-[#94A3B8] uppercase">NIK</th>
                  <th className="text-left px-2 py-2 text-[10px] font-bold text-[#94A3B8] uppercase">No. Reg</th>
                  {baType === 'ukk' && <th className="text-left px-2 py-2 text-[10px] font-bold text-[#94A3B8] uppercase">Nilai</th>}
                  <th className="text-left px-2 py-2 text-[10px] font-bold text-[#94A3B8] uppercase">Status</th>
                  <th className="px-2 py-2 w-8"></th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c, i) => (
                  <tr key={i} className="border-b border-[#F8FAFC] hover:bg-[#FAFAFA]">
                    <td className="px-2 py-2 text-[#94A3B8] font-medium">{i + 1}</td>
                    <td className="px-2 py-2">
                      <input value={c.name} onChange={e => updateCandidate(i, 'name', e.target.value)}
                        placeholder="Nama lengkap" className="mini-input w-full" />
                    </td>
                    <td className="px-2 py-2">
                      <input value={c.nik} onChange={e => updateCandidate(i, 'nik', e.target.value)}
                        placeholder="NIK 16 digit" className="mini-input w-28 font-mono" />
                    </td>
                    <td className="px-2 py-2">
                      <input value={c.reg_number} onChange={e => updateCandidate(i, 'reg_number', e.target.value)}
                        placeholder="SEL-2026-XXXX" className="mini-input w-28" />
                    </td>
                    {baType === 'ukk' && (
                      <td className="px-2 py-2">
                        <input type="number" value={c.score ?? ''} onChange={e => updateCandidate(i, 'score', Number(e.target.value))}
                          placeholder="0–100" min={0} max={100} className="mini-input w-16 text-center" />
                      </td>
                    )}
                    <td className="px-2 py-2">
                      <select value={c.status} onChange={e => updateCandidate(i, 'status', e.target.value)}
                        className="mini-input">
                        <option value="lolos_administrasi">Lolos Adm.</option>
                        <option value="tidak_lolos_administrasi">Tidak Lolos Adm.</option>
                        <option value="lolos_ukk">Lolos UKK</option>
                        <option value="tidak_lolos_ukk">Tidak Lolos UKK</option>
                        <option value="lolos_wawancara">Lolos Wawancara</option>
                        <option value="tidak_lolos_wawancara">Tidak Lolos Waw.</option>
                        <option value="terpilih">Terpilih</option>
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <button onClick={() => removeCandidate(i)}
                        className="w-6 h-6 flex items-center justify-center text-[#EF4444] hover:bg-red-50 rounded transition-colors">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {candidates.length > 0 && (
          <div className="mt-3 flex items-center gap-4 text-[11.5px] text-[#64748B]">
            <span>Total: <strong className="text-[#0F172A]">{candidates.length}</strong></span>
            <span>Lolos: <strong className="text-[#10B981]">{candidates.filter(c => !c.status.includes('tidak_lolos')).length}</strong></span>
            <span>Tidak lolos: <strong className="text-[#EF4444]">{candidates.filter(c => c.status.includes('tidak_lolos')).length}</strong></span>
          </div>
        )}
      </div>

      {/* Generate button */}
      <div className="flex items-center gap-3">
        <button onClick={handleGenerate}
          disabled={generating || !nomorBA || !kota || !ketuaPanitia || candidates.length === 0}
          className="flex-1 py-4 bg-[#0F172A] text-white font-extrabold text-[14px] rounded-xl hover:bg-[#1E293B] disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
          {generating ? (
            <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Membuat Dokumen...</>
          ) : generated ? (
            <><span>✓</span> Berita Acara Dibuat! Jendela Print Terbuka</>
          ) : (
            <><span>📄</span> Generate Berita Acara PDF</>
          )}
        </button>
      </div>

      {(!nomorBA || !kota || !ketuaPanitia || candidates.length === 0) && (
        <p className="mt-2 text-[11.5px] text-[#94A3B8] text-center">
          Lengkapi: {[!nomorBA && 'Nomor BA', !kota && 'Kota', !ketuaPanitia && 'Ketua Panitia', candidates.length === 0 && 'minimal 1 peserta'].filter(Boolean).join(', ')}
        </p>
      )}

      <style>{`
        .field-input { width:100%; padding:9px 12px; border:1px solid #E2E8F0; border-radius:10px; font-size:13px; color:#0F172A; background:white; outline:none; font-family:inherit; transition:all .15s; }
        .field-input:focus { border-color:#1E40AF; box-shadow:0 0 0 3px rgba(30,64,175,.08); }
        .mini-input { padding:5px 8px; border:1px solid #E2E8F0; border-radius:7px; font-size:12px; color:#0F172A; background:white; outline:none; font-family:inherit; transition:all .15s; }
        .mini-input:focus { border-color:#1E40AF; }
      `}</style>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-[#374151] mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function angkaTerbilang(n: number): string {
  const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan',
    'sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas', 'enam belas',
    'tujuh belas', 'delapan belas', 'sembilan belas']
  if (n < 20) return satuan[n]
  if (n < 100) return `${satuan[Math.floor(n / 10)]} puluh${n % 10 ? ' ' + satuan[n % 10] : ''}`
  return n.toString()
}
