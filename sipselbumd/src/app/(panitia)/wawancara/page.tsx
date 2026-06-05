'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface AppForInterview {
  id: string
  reg_number: string | null
  status: string
  is_carry_over: boolean
  participants: { full_name: string; nik: string } | null
  positions:    { label: string; bumd_type: string } | null
  period:       { period_label: string; bumd_short: string; bumd_type: string } | null
  interview_results: InterviewRow[]
}

interface InterviewRow {
  id: string
  interview_type: string
  version: number
  score: number | null
  is_pass: boolean | null
  recommendation: string | null
  is_latest: boolean
  interviewed_at: string | null
  created_at: string
}

type InterviewType = 'kpm' | 'rups'

const INTERVIEW_CRITERIA = {
  kpm: [
    { key: 'visi_misi',      label: 'Visi dan Misi',               weight: 20 },
    { key: 'kompetensi',     label: 'Kompetensi & Pengalaman',     weight: 25 },
    { key: 'komunikasi',     label: 'Kemampuan Komunikasi',        weight: 20 },
    { key: 'integritas',     label: 'Integritas & Profesionalisme', weight: 20 },
    { key: 'strategi',       label: 'Strategi Pengembangan BUMD',  weight: 15 },
  ],
  rups: [
    { key: 'business_acumen', label: 'Pemahaman Bisnis',           weight: 25 },
    { key: 'financial',       label: 'Literasi Keuangan',          weight: 20 },
    { key: 'leadership',      label: 'Kepemimpinan',               weight: 25 },
    { key: 'governance',      label: 'Tata Kelola Perusahaan',     weight: 20 },
    { key: 'track_record',    label: 'Track Record',               weight: 10 },
  ],
}

const STATUS_FOR_INTERVIEW = ['lolos_ukk', 'ikut_wawancara', 'lolos_wawancara', 'tidak_lolos_wawancara']

export default function WawancaraPage() {
  const [apps, setApps]               = useState<AppForInterview[]>([])
  const [selected, setSelected]       = useState<AppForInterview | null>(null)
  const [interviewType, setInterviewType] = useState<InterviewType>('rups')
  const [view, setView]               = useState<'list' | 'input' | 'history'>('list')
  const [loading, setLoading]         = useState(true)
  const [submitting, setSubmitting]   = useState(false)
  const [search, setSearch]           = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Criteria scores
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>({})
  const [recommendation, setRecommendation] = useState('')
  const [interviewDate, setInterviewDate]   = useState(new Date().toISOString().split('T')[0])
  const [isPass, setIsPass]                 = useState<boolean | null>(null)
  const [formError, setFormError]           = useState<string | null>(null)
  const [formSuccess, setFormSuccess]       = useState(false)

  useEffect(() => { loadApps() }, [])

  async function loadApps() {
    setLoading(true)
    const { data } = await supabase
      .from('applications')
      .select(`
        id, reg_number, status, is_carry_over,
        participants(full_name, nik),
        positions(label, bumd_type),
        selection_periods(period_label, bumd_short, bumd_type),
        interview_results(id, interview_type, version, score, is_pass, recommendation, is_latest, interviewed_at, created_at)
      `)
      .in('status', STATUS_FOR_INTERVIEW)
      .order('created_at')
    if (data) setApps(data as AppForInterview[])
    setLoading(false)
  }

  function openInput(app: AppForInterview) {
    setSelected(app)
    // Detect interview type from period/position bumd_type
    const bType = (app.period as any)?.bumd_type ?? (app.positions as any)?.bumd_type ?? 'perseroda'
    setInterviewType(bType === 'perumda' ? 'kpm' : 'rups')
    setCriteriaScores({})
    setRecommendation('')
    setIsPass(null)
    setFormError(null)
    setFormSuccess(false)
    setInterviewDate(new Date().toISOString().split('T')[0])
    setView('input')
  }

  function openHistory(app: AppForInterview) {
    setSelected(app)
    setView('history')
  }

  const criteria = INTERVIEW_CRITERIA[interviewType]
  const totalScore = criteria.reduce((sum, c) => {
    const val = criteriaScores[c.key] ?? 0
    return sum + (val * c.weight / 100)
  }, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    if (isPass === null) { setFormError('Tentukan keputusan akhir wawancara.'); return }
    const incomplete = criteria.filter(c => !(c.key in criteriaScores))
    if (incomplete.length > 0) { setFormError(`Nilai belum diisi: ${incomplete.map(c => c.label).join(', ')}`); return }

    setSubmitting(true); setFormError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Get current version
      const existing = selected.interview_results.filter(r => r.interview_type === interviewType)
      const newVersion = (existing.reduce((max, r) => Math.max(max, r.version), 0)) + 1

      // Mark previous as not latest
      if (existing.length > 0) {
        await supabase.from('interview_results')
          .update({ is_latest: false })
          .eq('application_id', selected.id)
          .eq('interview_type', interviewType)
      }

      // Insert new version
      const { error } = await supabase.from('interview_results').insert({
        application_id: selected.id,
        interview_type: interviewType,
        conducted_by:   user?.id,
        version:        newVersion,
        score:          totalScore,
        is_pass:        isPass,
        recommendation,
        is_latest:      true,
        interviewed_at: interviewDate,
      })
      if (error) throw error

      // Update application status
      await supabase.from('applications')
        .update({ status: isPass ? 'lolos_wawancara' : 'tidak_lolos_wawancara' })
        .eq('id', selected.id)

      // Audit
      await supabase.from('audit_logs').insert({
        user_id:    user?.id,
        action:     'INPUT_INTERVIEW_RESULT',
        table_name: 'interview_results',
        record_id:  selected.id,
        new_data:   { interview_type: interviewType, score: totalScore, is_pass: isPass, version: newVersion },
      })

      setFormSuccess(true)
      loadApps()
      setTimeout(() => { setView('list'); setFormSuccess(false) }, 2000)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan nilai wawancara.')
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = apps.filter(a => {
    const matchSearch = !search ||
      a.participants?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.participants?.nik?.includes(search) ||
      a.reg_number?.includes(search)
    const matchStatus = statusFilter === 'all' || a.status === statusFilter
    return matchSearch && matchStatus
  })

  const latestInterview = (app: AppForInterview, type?: string) =>
    app.interview_results.find(r => r.is_latest && (type ? r.interview_type === type : true))

  const PASSING = 65

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="w-8 h-8 border-2 border-[#1E40AF]/20 border-t-[#1E40AF] rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-[#0F172A] px-7 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/></svg>
          </div>
          <div>
            <div className="text-white font-extrabold text-[14px]">SIPSELBUMD</div>
            <div className="text-white/40 text-[9.5px] uppercase tracking-wide">Input Hasil Wawancara</div>
          </div>
        </div>
        {view !== 'list' && (
          <button onClick={() => setView('list')} className="text-[12px] text-white/50 hover:text-white transition-colors">
            ← Kembali ke Daftar
          </button>
        )}
      </div>

      <div className="max-w-[920px] mx-auto px-6 py-8">

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-[20px] font-extrabold text-[#0F172A]">Wawancara KPM / RUPS</h1>
                <p className="text-[12.5px] text-[#64748B] mt-0.5">
                  {apps.length} peserta siap wawancara · Nilai bersifat immutable (versioning)
                </p>
              </div>
              <div className="flex gap-2">
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Cari peserta..."
                  className="px-3 py-2 border border-[#E2E8F0] rounded-xl text-[12.5px] bg-white outline-none w-44 focus:border-[#1E40AF]" />
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-[#E2E8F0] rounded-xl text-[12.5px] bg-white outline-none focus:border-[#1E40AF]">
                  <option value="all">Semua Status</option>
                  <option value="lolos_ukk">Lolos UKK (Belum Wawancara)</option>
                  <option value="ikut_wawancara">Sedang Wawancara</option>
                  <option value="lolos_wawancara">Lolos Wawancara</option>
                  <option value="tidak_lolos_wawancara">Tidak Lolos Wawancara</option>
                </select>
              </div>
            </div>

            {/* Summary stats */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { label: 'Belum Wawancara', val: apps.filter(a => a.status === 'lolos_ukk').length,                   color: '#F59E0B', bg: '#FFFBEB' },
                { label: 'Sudah Diinput',   val: apps.filter(a => latestInterview(a)).length,                          color: '#0284C7', bg: '#E0F2FE' },
                { label: 'Lolos',           val: apps.filter(a => a.status === 'lolos_wawancara').length,              color: '#10B981', bg: '#ECFDF5' },
                { label: 'Tidak Lolos',     val: apps.filter(a => a.status === 'tidak_lolos_wawancara').length,        color: '#EF4444', bg: '#FEF2F2' },
              ].map(s => (
                <div key={s.label} className="bg-white border border-[#E2E8F0] rounded-xl p-4">
                  <div className="text-[10.5px] text-[#64748B] mb-1">{s.label}</div>
                  <div className="text-[26px] font-extrabold" style={{ color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1.4fr_1fr_1fr_1fr_160px] gap-3 px-5 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10.5px] font-bold text-[#94A3B8] uppercase tracking-wide">
                <span>Peserta</span><span>Jabatan</span><span>Tipe Wawancara</span><span>Nilai / Status</span><span>Aksi</span>
              </div>
              {filtered.map(app => {
                const latest = latestInterview(app)
                const bType  = (app.period as any)?.bumd_type ?? 'perseroda'
                const expectedType: InterviewType = bType === 'perumda' ? 'kpm' : 'rups'
                return (
                  <div key={app.id} className="grid grid-cols-[1.4fr_1fr_1fr_1fr_160px] gap-3 px-5 py-3.5 border-b border-[#F8FAFC] items-center hover:bg-[#FAFAFA]">
                    <div>
                      <div className="text-[12.5px] font-semibold text-[#0F172A] flex items-center gap-1.5">
                        {app.participants?.full_name}
                        {app.is_carry_over && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">🔄</span>}
                      </div>
                      <div className="text-[11px] text-[#94A3B8]">{app.reg_number ?? '—'}</div>
                    </div>
                    <div className="text-[12px] text-[#374151]">{app.positions?.label ?? '—'}</div>
                    <div>
                      <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full ${
                        expectedType === 'kpm'
                          ? 'bg-[#F0FDF4] text-[#059669]'
                          : 'bg-[#EDE9FE] text-[#7C3AED]'
                      }`}>
                        {expectedType === 'kpm' ? '🏛 KPM' : '🏢 RUPS'}
                      </span>
                    </div>
                    <div>
                      {latest ? (
                        <div>
                          <div className="text-[14px] font-extrabold" style={{ color: latest.score! >= PASSING ? '#10B981' : '#EF4444' }}>
                            {latest.score?.toFixed(1) ?? '-'}
                          </div>
                          <div className={`text-[10px] font-bold ${latest.is_pass ? 'text-green-600' : 'text-red-500'}`}>
                            {latest.is_pass ? '✓ LOLOS' : '✗ TIDAK LOLOS'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#F59E0B] font-medium">Belum diinput</span>
                      )}
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => openInput(app)}
                        className="px-2.5 py-1.5 text-[10.5px] font-bold bg-[#1E40AF] text-white rounded-lg hover:bg-[#1d4ed8] transition-colors whitespace-nowrap">
                        {latest ? '✏️ Revisi' : '+ Input'}
                      </button>
                      {app.interview_results.length > 0 && (
                        <button onClick={() => openHistory(app)}
                          className="px-2.5 py-1.5 text-[10.5px] font-bold bg-[#F1F5F9] text-[#475569] rounded-lg hover:bg-[#E2E8F0] transition-colors">
                          Riwayat
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <div className="text-center py-12 text-[13px] text-[#94A3B8]">Tidak ada data.</div>
              )}
            </div>
          </>
        )}

        {/* ── INPUT VIEW ── */}
        {view === 'input' && selected && (
          <div className="max-w-[680px]">
            {/* Candidate info */}
            <div className="mb-5 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-start justify-between">
              <div>
                <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide mb-1">Peserta Wawancara</div>
                <div className="text-[16px] font-extrabold text-[#0F172A]">{selected.participants?.full_name}</div>
                <div className="text-[12px] text-[#64748B]">{selected.participants?.nik} · {selected.reg_number}</div>
                {selected.is_carry_over && (
                  <div className="mt-1.5 text-[11px] bg-amber-100 text-amber-700 px-2 py-1 rounded-lg inline-block">
                    🔄 Peserta Carry-over 2025
                  </div>
                )}
              </div>
              {selected.interview_results.length > 0 && (
                <div className="text-right">
                  <div className="text-[10px] text-[#94A3B8]">Riwayat input</div>
                  <div className="text-[20px] font-extrabold text-[#1E40AF]">v{selected.interview_results.length}</div>
                </div>
              )}
            </div>

            {/* Interview type selector */}
            <div className="mb-5">
              <label className="block text-[11px] font-bold text-[#374151] mb-2 uppercase tracking-wide">Jenis Wawancara</label>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => setInterviewType('kpm')}
                  className={`py-3 px-4 rounded-xl border-2 font-bold text-[13px] transition-all ${
                    interviewType === 'kpm'
                      ? 'border-[#059669] bg-[#F0FDF4] text-[#059669]'
                      : 'border-[#E2E8F0] text-[#94A3B8] hover:border-[#059669]/30'
                  }`}>
                  🏛 Wawancara KPM
                  <div className="text-[10px] font-normal mt-0.5">Kepala Daerah / Perumda</div>
                </button>
                <button type="button" onClick={() => setInterviewType('rups')}
                  className={`py-3 px-4 rounded-xl border-2 font-bold text-[13px] transition-all ${
                    interviewType === 'rups'
                      ? 'border-[#7C3AED] bg-[#EDE9FE] text-[#7C3AED]'
                      : 'border-[#E2E8F0] text-[#94A3B8] hover:border-[#7C3AED]/30'
                  }`}>
                  🏢 Wawancara RUPS
                  <div className="text-[10px] font-normal mt-0.5">Pemegang Saham / Perseroda</div>
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="bg-white border border-[#E2E8F0] rounded-xl p-6">
              <h2 className="text-[15px] font-extrabold text-[#0F172A] mb-5">
                Penilaian Wawancara {interviewType.toUpperCase()}
                {selected.interview_results.length > 0 && (
                  <span className="ml-2 text-[11px] text-[#F59E0B] font-bold bg-amber-100 px-2 py-0.5 rounded-full">
                    Revisi (v{selected.interview_results.length + 1})
                  </span>
                )}
              </h2>

              {formError   && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-[12.5px] rounded-xl">{formError}</div>}
              {formSuccess  && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-600 text-[12.5px] rounded-xl">✓ Nilai berhasil disimpan!</div>}

              {/* Tanggal */}
              <div className="mb-5">
                <label className="block text-[11px] font-bold text-[#374151] mb-1.5 uppercase tracking-wide">Tanggal Wawancara</label>
                <input type="date" value={interviewDate} onChange={e => setInterviewDate(e.target.value)}
                  className="px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] bg-white outline-none focus:border-[#1E40AF] w-full" />
              </div>

              {/* Criteria scoring */}
              <div className="mb-5">
                <div className="text-[11px] font-bold text-[#374151] mb-3 uppercase tracking-wide">Nilai per Kriteria</div>
                <div className="flex flex-col gap-3">
                  {criteria.map(c => {
                    const val = criteriaScores[c.key] ?? 0
                    return (
                      <div key={c.key} className="flex items-center gap-4 p-3.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                        <div className="flex-1 min-w-0">
                          <div className="text-[12.5px] font-semibold text-[#0F172A]">{c.label}</div>
                          <div className="text-[10.5px] text-[#94A3B8]">Bobot {c.weight}% · Kontribusi: {(val * c.weight / 100).toFixed(1)}</div>
                          {/* Slider */}
                          <div className="mt-2 relative">
                            <input type="range" min={0} max={100} step={1}
                              value={val}
                              onChange={e => setCriteriaScores(s => ({ ...s, [c.key]: Number(e.target.value) }))}
                              className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                              style={{
                                background: `linear-gradient(to right, ${val >= 70 ? '#10B981' : val >= 50 ? '#F59E0B' : '#EF4444'} 0%, ${val >= 70 ? '#10B981' : val >= 50 ? '#F59E0B' : '#EF4444'} ${val}%, #E2E8F0 ${val}%, #E2E8F0 100%)`
                              }}
                            />
                          </div>
                        </div>
                        <div className="flex-shrink-0 w-16">
                          <input type="number" min={0} max={100} value={val || ''}
                            onChange={e => setCriteriaScores(s => ({ ...s, [c.key]: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                            className="w-full px-2 py-2 border border-[#E2E8F0] rounded-xl text-[16px] font-extrabold text-center text-[#0F172A] bg-white outline-none focus:border-[#1E40AF]"
                            placeholder="0"
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Total score */}
              <div className={`flex items-center gap-4 p-4 rounded-xl border-2 mb-5 ${
                totalScore >= PASSING ? 'border-green-300 bg-green-50' : 'border-red-200 bg-red-50'
              }`}>
                <div className="flex-1">
                  <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wide mb-1">Nilai Total Tertimbang</div>
                  <div className="text-[36px] font-extrabold" style={{ color: totalScore >= PASSING ? '#10B981' : '#EF4444' }}>
                    {totalScore.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-[#94A3B8]">Passing grade: {PASSING}</div>
                </div>
                <div className="text-right">
                  <div className={`text-[13px] font-extrabold ${totalScore >= PASSING ? 'text-green-600' : 'text-red-500'}`}>
                    {totalScore >= PASSING ? '✓ Di atas batas' : '✗ Di bawah batas'}
                  </div>
                  {/* Donut-style indicator */}
                  <svg width="56" height="56" viewBox="0 0 56 56" className="mt-2">
                    <circle cx="28" cy="28" r="22" fill="none" stroke="#E2E8F0" strokeWidth="6"/>
                    <circle cx="28" cy="28" r="22" fill="none"
                      stroke={totalScore >= PASSING ? '#10B981' : '#EF4444'}
                      strokeWidth="6"
                      strokeDasharray={`${(totalScore / 100) * 138.2} 138.2`}
                      strokeLinecap="round"
                      transform="rotate(-90 28 28)"
                    />
                    <text x="28" y="33" textAnchor="middle" fontSize="11" fontWeight="800" fill={totalScore >= PASSING ? '#10B981' : '#EF4444'}>
                      {Math.round(totalScore)}
                    </text>
                  </svg>
                </div>
              </div>

              {/* Pass/Fail */}
              <div className="mb-5">
                <label className="block text-[11.5px] font-bold text-[#374151] mb-2">Keputusan Wawancara <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setIsPass(true)}
                    className={`py-3 rounded-xl border-2 font-bold text-[13px] transition-all ${
                      isPass === true ? 'bg-green-100 border-green-400 text-green-700' : 'border-[#E2E8F0] text-[#94A3B8] hover:border-green-300'
                    }`}>
                    ✓ Dinyatakan LOLOS
                  </button>
                  <button type="button" onClick={() => setIsPass(false)}
                    className={`py-3 rounded-xl border-2 font-bold text-[13px] transition-all ${
                      isPass === false ? 'bg-red-100 border-red-400 text-red-600' : 'border-[#E2E8F0] text-[#94A3B8] hover:border-red-300'
                    }`}>
                    ✗ Dinyatakan TIDAK LOLOS
                  </button>
                </div>
              </div>

              {/* Recommendation */}
              <div className="mb-5">
                <label className="block text-[11.5px] font-bold text-[#374151] mb-2">Catatan / Rekomendasi</label>
                <textarea value={recommendation} onChange={e => setRecommendation(e.target.value)}
                  rows={3} placeholder="Catatan atau rekomendasi dari pewawancara..."
                  className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#1E40AF] resize-none" />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setView('list')}
                  className="flex-1 py-3 border border-[#E2E8F0] text-[#64748B] font-semibold rounded-xl hover:bg-[#F8FAFC]">
                  Batal
                </button>
                <button type="submit" disabled={submitting || isPass === null || formSuccess}
                  className="flex-[2] py-3 bg-[#0F172A] text-white font-bold rounded-xl disabled:opacity-40 hover:bg-[#1E293B] transition-colors">
                  {submitting ? 'Menyimpan...' : `Simpan Nilai Wawancara (v${selected.interview_results.length + 1})`}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── HISTORY VIEW ── */}
        {view === 'history' && selected && (
          <div className="max-w-[680px]">
            <div className="mb-5 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
              <div className="text-[15px] font-extrabold text-[#0F172A]">{selected.participants?.full_name}</div>
              <div className="text-[12px] text-[#64748B]">{selected.reg_number}</div>
            </div>

            <div className="mb-4 flex items-center gap-2 p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl">
              <svg className="w-4 h-4 text-[#1E40AF] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p className="text-[12px] text-[#1E40AF]">Semua versi nilai tersimpan permanen. Hanya versi terbaru yang digunakan sebagai nilai resmi.</p>
            </div>

            {['kpm','rups'].map(type => {
              const typeResults = [...selected.interview_results]
                .filter(r => r.interview_type === type)
                .sort((a, b) => b.version - a.version)
              if (typeResults.length === 0) return null
              return (
                <div key={type} className="mb-4">
                  <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide mb-3">
                    {type === 'kpm' ? '🏛 Wawancara KPM' : '🏢 Wawancara RUPS'} — {typeResults.length} versi
                  </div>
                  {typeResults.map(r => (
                    <div key={r.id} className={`bg-white border rounded-xl p-5 mb-3 ${r.is_latest ? 'border-[#1E40AF] ring-1 ring-[#1E40AF]' : 'border-[#E2E8F0]'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-extrabold text-[#0F172A]">Versi {r.version}</span>
                          {r.is_latest && <span className="text-[10px] bg-[#1E40AF] text-white px-2 py-0.5 rounded-full font-bold">AKTIF</span>}
                        </div>
                        <div className="text-[11px] text-[#94A3B8]">
                          {r.interviewed_at && `Wawancara: ${new Date(r.interviewed_at).toLocaleDateString('id-ID')} · `}
                          Input: {new Date(r.created_at).toLocaleString('id-ID', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[11px] text-[#94A3B8]">Nilai Total: </span>
                          <span className="text-[20px] font-extrabold" style={{ color: (r.score ?? 0) >= PASSING ? '#10B981' : '#EF4444' }}>
                            {r.score?.toFixed(2) ?? '-'}
                          </span>
                        </div>
                        <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${r.is_pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                          {r.is_pass ? '✓ LOLOS' : '✗ TIDAK LOLOS'}
                        </span>
                      </div>
                      {r.recommendation && (
                        <div className="mt-3 text-[11.5px] text-[#64748B] italic border-t border-[#F1F5F9] pt-3">
                          Catatan: {r.recommendation}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
