'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface MyApplication {
  id: string
  reg_number: string | null
  status: string
  is_carry_over: boolean
  carry_over_note: string | null
  submitted_at: string | null
  positions: { label: string; bumd_type: string } | null
  period:    { period_label: string; bumd_short: string } | null
}

interface Document {
  id: string
  doc_type: string
  file_name: string
  status: string
  verified_at: string | null
  notes: string | null
}

const DOC_LABELS: Record<string, string> = {
  ktp: 'KTP', pas_foto: 'Pas Foto 4×6', cv: 'CV / Riwayat Hidup',
  ijazah: 'Ijazah Terlegalisir', npwp: 'NPWP', skck: 'SKCK',
  surat_kesehatan: 'Surat Keterangan Sehat', pakta_integritas: 'Pakta Integritas',
  dok_pendukung: 'Dokumen Pendukung',
}

const STATUS_STEPS = [
  { key: 'submitted',                label: 'Pendaftaran Diterima',   desc: 'Dokumen Anda telah diterima sistem' },
  { key: 'lolos_administrasi',       label: 'Lolos Administrasi',     desc: 'Dokumen Anda dinyatakan lengkap dan valid' },
  { key: 'ikut_ukk',                 label: 'Mengikuti UKK',          desc: 'Anda telah terdaftar sebagai peserta UKK' },
  { key: 'lolos_ukk',                label: 'Lolos UKK',              desc: 'Anda dinyatakan memenuhi kualifikasi UKK' },
  { key: 'ikut_wawancara',           label: 'Wawancara',              desc: 'Anda dijadwalkan mengikuti wawancara' },
  { key: 'lolos_wawancara',          label: 'Lolos Wawancara',        desc: 'Anda dinyatakan lolos tahap wawancara' },
  { key: 'terpilih',                 label: 'Calon Terpilih',         desc: 'Anda ditetapkan sebagai calon terpilih' },
  { key: 'kontrak',                  label: 'Kontrak Kinerja',        desc: 'Kontrak kinerja telah ditandatangani' },
  { key: 'diangkat',                 label: 'Pengangkatan',           desc: 'SK Pengangkatan telah diterbitkan' },
]

const STATUS_ORDER = ['draft','submitted','lolos_administrasi','tidak_lolos_administrasi','ikut_ukk','tidak_lolos_ukk','lolos_ukk','ikut_wawancara','tidak_lolos_wawancara','lolos_wawancara','terpilih','tidak_terpilih','kontrak','diangkat']

export default function PesertaDashboard() {
  const [app, setApp]     = useState<MyApplication | null>(null)
  const [docs, setDocs]   = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab]     = useState<'status' | 'dokumen' | 'jadwal'>('status')
  const [uploading, setUploading] = useState<string | null>(null)
  const [user, setUser]   = useState<{ full_name?: string; email?: string } | null>(null)

  useEffect(() => { loadData() }, [])

  async function loadData() {
    setLoading(true)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    const { data: userRec } = await supabase.from('users').select('full_name,email').eq('id', authUser.id).single()
    setUser(userRec)

    const { data: participant } = await supabase.from('participants').select('id').eq('user_id', authUser.id).single()
    if (!participant) { setLoading(false); return }

    const { data: appData } = await supabase
      .from('applications')
      .select(`id, reg_number, status, is_carry_over, carry_over_note, submitted_at, positions(label,bumd_type), selection_periods(period_label,bumd_short)`)
      .eq('participant_id', participant.id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .single()

    if (appData) {
      setApp(appData as unknown as MyApplication)
      const { data: docData } = await supabase.from('documents').select('*').eq('application_id', appData.id)
      if (docData) setDocs(docData)
    }
    setLoading(false)
  }

  async function handleFileUpload(docType: string, file: File) {
    if (!app) return
    setUploading(docType)
    try {
      const ext = file.name.split('.').pop()
      const path = `${app.id}/${docType}_${Date.now()}.${ext}`
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('sipselbumd-documents').upload(path, file, { upsert: false })
      if (uploadErr) throw uploadErr

      const { data: urlData } = supabase.storage.from('sipselbumd-documents').getPublicUrl(uploadData.path)

      await supabase.from('documents').upsert({
        application_id: app.id,
        doc_type: docType,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        mime_type: file.type,
        status: 'pending',
      }, { onConflict: 'application_id,doc_type' })

      loadData()
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(null)
    }
  }

  const currentStatusIdx = STATUS_ORDER.indexOf(app?.status ?? '')
  const currentStep = STATUS_STEPS.findIndex(s => s.key === app?.status)
  const isTerminated = ['tidak_lolos_administrasi','tidak_lolos_ukk','tidak_lolos_wawancara','tidak_terpilih'].includes(app?.status ?? '')

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="w-8 h-8 border-2 border-[#1E40AF]/20 border-t-[#1E40AF] rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0F172A] to-[#1E3A8A] px-7 py-5">
        <div className="max-w-[860px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/></svg>
            </div>
            <div>
              <div className="text-white font-extrabold text-[14px]">SIPSELBUMD</div>
              <div className="text-white/40 text-[9.5px] uppercase tracking-wide">Portal Peserta</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[13px] font-bold text-white">{user?.full_name ?? user?.email}</div>
            <button className="text-[11px] text-white/40 hover:text-white/70 transition-colors">Keluar</button>
          </div>
        </div>
      </div>

      <div className="max-w-[860px] mx-auto px-6 py-8">

        {/* No application state */}
        {!app && (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-[#EFF6FF] rounded-2xl flex items-center justify-center mx-auto mb-5">
              <svg className="w-8 h-8 text-[#1E40AF]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            </div>
            <h2 className="text-[18px] font-extrabold text-[#0F172A] mb-2">Belum Ada Pendaftaran</h2>
            <p className="text-[13px] text-[#64748B] mb-6">Anda belum mendaftar untuk seleksi apapun.</p>
            <a href="/daftar" className="px-6 py-3 bg-[#1E40AF] text-white font-bold rounded-xl hover:bg-[#1d4ed8] transition-colors inline-block">
              Daftar Seleksi →
            </a>
          </div>
        )}

        {app && (
          <>
            {/* Application card */}
            <div className={`mb-6 p-5 rounded-2xl border-2 ${
              isTerminated ? 'border-red-200 bg-red-50' : 'border-[#1E40AF]/20 bg-white'
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10.5px] font-bold text-[#94A3B8] uppercase tracking-wide mb-1">
                    {app.period?.bumd_short} · {app.positions?.label}
                  </div>
                  <div className="text-[16px] font-extrabold text-[#0F172A]">{app.period?.period_label}</div>
                  <div className="flex items-center gap-3 mt-2">
                    {app.reg_number && (
                      <span className="text-[11.5px] font-mono text-[#64748B] bg-[#F1F5F9] px-2 py-0.5 rounded">
                        {app.reg_number}
                      </span>
                    )}
                    {app.is_carry_over && (
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold">
                        🔄 Carry-over dari periode 2025
                      </span>
                    )}
                  </div>
                  {app.carry_over_note && (
                    <p className="mt-2 text-[11.5px] text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg">
                      {app.carry_over_note}
                    </p>
                  )}
                </div>
                <StatusPill status={app.status} />
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-0 bg-white border border-[#E2E8F0] rounded-xl overflow-hidden mb-6">
              {[
                { key: 'status',  label: '📊 Status Seleksi' },
                { key: 'dokumen', label: '📁 Dokumen Saya' },
                { key: 'jadwal',  label: '📅 Jadwal' },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
                  className={`flex-1 py-3 text-[12.5px] font-semibold transition-all border-b-2 ${
                    tab === t.key
                      ? 'border-[#1E40AF] text-[#1E40AF] bg-[#EFF6FF]/50'
                      : 'border-transparent text-[#94A3B8] hover:text-[#475569]'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* ── STATUS TAB ── */}
            {tab === 'status' && (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
                <h2 className="text-[14px] font-extrabold text-[#0F172A] mb-5">Progres Tahapan Seleksi</h2>
                {isTerminated && (
                  <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="text-[13px] font-bold text-red-600 mb-1">Proses Seleksi Dihentikan</div>
                    <div className="text-[12px] text-red-500">
                      {app.status === 'tidak_lolos_administrasi' && 'Anda tidak lolos seleksi administrasi. Dokumen tidak memenuhi syarat atau tidak lengkap.'}
                      {app.status === 'tidak_lolos_ukk'          && 'Anda tidak lolos tahap UKK. Nilai tidak memenuhi batas minimal.'}
                      {app.status === 'tidak_lolos_wawancara'    && 'Anda tidak lolos tahap wawancara.'}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-0">
                  {STATUS_STEPS.map((step, i) => {
                    const isCurrent = step.key === app.status
                    const isPast    = STATUS_ORDER.indexOf(step.key) < STATUS_ORDER.indexOf(app.status)
                    const isFuture  = !isCurrent && !isPast
                    return (
                      <div key={step.key} className="flex gap-4 relative">
                        {i < STATUS_STEPS.length - 1 && (
                          <div className={`absolute left-[14px] top-[28px] bottom-0 w-[1px] ${isPast ? 'bg-[#10B981]' : 'bg-[#E2E8F0]'}`} />
                        )}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5 border-2 z-[1] ${
                          isPast   ? 'bg-[#10B981] border-[#10B981] text-white' :
                          isCurrent ? 'bg-[#1E40AF] border-[#1E40AF] text-white animate-pulse' :
                                      'bg-white border-[#E2E8F0] text-[#CBD5E1]'
                        }`}>
                          {isPast ? '✓' : i + 1}
                        </div>
                        <div className="pb-6 flex-1">
                          <div className={`text-[13px] font-bold ${isCurrent ? 'text-[#1E40AF]' : isPast ? 'text-[#10B981]' : 'text-[#CBD5E1]'}`}>
                            {step.label}
                            {isCurrent && <span className="ml-2 text-[10px] bg-[#1E40AF] text-white px-2 py-0.5 rounded-full">● Saat ini</span>}
                          </div>
                          <div className={`text-[12px] mt-0.5 ${isFuture ? 'text-[#CBD5E1]' : 'text-[#64748B]'}`}>{step.desc}</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* ── DOKUMEN TAB ── */}
            {tab === 'dokumen' && (
              <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-[#F1F5F9]">
                  <div className="text-[14px] font-extrabold text-[#0F172A] mb-0.5">Dokumen Persyaratan</div>
                  <div className="text-[12px] text-[#64748B]">
                    {docs.filter(d => d.status === 'valid').length}/{Object.keys(DOC_LABELS).length} dokumen terverifikasi
                  </div>
                </div>
                <div className="divide-y divide-[#F8FAFC]">
                  {Object.entries(DOC_LABELS).map(([type, label]) => {
                    const doc = docs.find(d => d.doc_type === type)
                    return (
                      <div key={type} className="flex items-center gap-4 px-5 py-4">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          doc?.status === 'valid'   ? 'bg-green-100' :
                          doc?.status === 'invalid' ? 'bg-red-100'   :
                          doc                       ? 'bg-amber-100'  : 'bg-[#F1F5F9]'
                        }`}>
                          <svg className={`w-4 h-4 ${
                            doc?.status === 'valid'   ? 'text-green-600' :
                            doc?.status === 'invalid' ? 'text-red-500'   :
                            doc                       ? 'text-amber-600'  : 'text-[#CBD5E1]'
                          }`} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                            <polyline points="14 2 14 8 20 8"/>
                          </svg>
                        </div>
                        <div className="flex-1">
                          <div className="text-[13px] font-semibold text-[#0F172A]">{label}</div>
                          {doc ? (
                            <div className="text-[11px] text-[#94A3B8] mt-0.5">{doc.file_name}</div>
                          ) : (
                            <div className="text-[11px] text-[#CBD5E1]">Belum diunggah</div>
                          )}
                          {doc?.notes && <div className="text-[11px] text-red-500 mt-0.5">⚠ {doc.notes}</div>}
                        </div>
                        <div className="flex items-center gap-2">
                          {doc && (
                            <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full ${
                              doc.status === 'valid'        ? 'bg-green-100 text-green-700' :
                              doc.status === 'invalid'      ? 'bg-red-100 text-red-600'     :
                              doc.status === 'need_revision'? 'bg-orange-100 text-orange-600':
                                                              'bg-amber-100 text-amber-700'
                            }`}>
                              {doc.status === 'valid'        ? '✓ Valid' :
                               doc.status === 'invalid'      ? '✗ Tidak Valid' :
                               doc.status === 'need_revision'? '⚠ Perlu Revisi' : '⏳ Menunggu'}
                            </span>
                          )}
                          <label className={`px-3 py-1.5 text-[11px] font-bold rounded-lg cursor-pointer transition-all ${
                            uploading === type
                              ? 'bg-[#E2E8F0] text-[#94A3B8] cursor-wait'
                              : 'bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] hover:bg-[#DBEAFE]'
                          }`}>
                            {uploading === type ? 'Mengunggah...' : doc ? 'Ganti' : '+ Unggah'}
                            <input type="file" className="hidden"
                              accept=".pdf,.jpg,.jpeg,.png"
                              disabled={!!uploading}
                              onChange={e => {
                                const f = e.target.files?.[0]
                                if (f) handleFileUpload(type, f)
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="px-5 py-3 bg-[#F8FAFC] border-t border-[#E2E8F0]">
                  <p className="text-[11px] text-[#94A3B8]">Format file: PDF, JPG, PNG · Ukuran maksimal: 5 MB per file</p>
                </div>
              </div>
            )}

            {/* ── JADWAL TAB ── */}
            {tab === 'jadwal' && (
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-6">
                <h2 className="text-[14px] font-extrabold text-[#0F172A] mb-5">Jadwal Seleksi Anda</h2>
                <div className="flex flex-col gap-3">
                  {[
                    { date: '6–20 Jan 2026', label: 'Pendaftaran Online', done: true },
                    { date: '21–25 Jan 2026', label: 'Verifikasi Administrasi', done: true },
                    { date: '27 Jan 2026', label: 'Pengumuman Lolos Administrasi', done: false, active: true },
                    { date: '3–7 Feb 2026', label: 'Uji Kompetensi & Kelayakan (UKK)', done: false },
                    { date: '10 Feb 2026', label: 'Pengumuman Hasil UKK', done: false },
                    { date: '17–19 Feb 2026', label: 'Wawancara RUPS/KPM', done: false },
                    { date: '24 Feb 2026', label: 'Penetapan Calon Terpilih', done: false },
                    { date: '3 Mar 2026', label: 'Penandatanganan Kontrak Kinerja', done: false },
                    { date: '10 Mar 2026', label: 'Pengangkatan', done: false },
                  ].map((item, i) => (
                    <div key={i} className={`flex items-center gap-4 p-3.5 rounded-xl border ${
                      item.active ? 'border-[#1E40AF] bg-[#EFF6FF]' :
                      item.done   ? 'border-[#E2E8F0] bg-[#F8FAFC]' :
                                    'border-[#E2E8F0] bg-white'
                    }`}>
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        item.active ? 'bg-[#1E40AF]' : item.done ? 'bg-[#10B981]' : 'bg-[#E2E8F0]'
                      }`} />
                      <div className="flex-1 text-[12.5px] font-semibold text-[#0F172A]">{item.label}</div>
                      <div className={`text-[11.5px] font-medium ${item.active ? 'text-[#1E40AF]' : item.done ? 'text-[#10B981]' : 'text-[#94A3B8]'}`}>
                        {item.date}
                      </div>
                      {item.done && <span className="text-[10px] text-[#10B981]">✓</span>}
                      {item.active && <span className="text-[10px] bg-[#1E40AF] text-white px-1.5 py-0.5 rounded-full font-bold">AKTIF</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    submitted:                { label: 'Menunggu Verifikasi', color: '#F59E0B', bg: '#FFFBEB' },
    lolos_administrasi:       { label: 'Lolos Administrasi',  color: '#10B981', bg: '#ECFDF5' },
    tidak_lolos_administrasi: { label: 'Tidak Lolos Adm.',   color: '#EF4444', bg: '#FEF2F2' },
    ikut_ukk:                 { label: 'Mengikuti UKK',       color: '#0284C7', bg: '#E0F2FE' },
    lolos_ukk:                { label: 'Lolos UKK',           color: '#10B981', bg: '#ECFDF5' },
    tidak_lolos_ukk:          { label: 'Tidak Lolos UKK',    color: '#EF4444', bg: '#FEF2F2' },
    ikut_wawancara:           { label: 'Wawancara',           color: '#8B5CF6', bg: '#EDE9FE' },
    lolos_wawancara:          { label: 'Lolos Wawancara',     color: '#10B981', bg: '#ECFDF5' },
    terpilih:                 { label: '🏆 Calon Terpilih',  color: '#1E40AF', bg: '#EFF6FF' },
    kontrak:                  { label: 'Kontrak Ditanda.',    color: '#0F172A', bg: '#F1F5F9' },
    diangkat:                 { label: '🎖 Diangkat',         color: '#059669', bg: '#ECFDF5' },
  }
  const s = map[status] ?? { label: status, color: '#94A3B8', bg: '#F1F5F9' }
  return (
    <span className="px-3 py-1.5 text-[12px] font-bold rounded-xl" style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  )
}
