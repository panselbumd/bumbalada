'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { inputUKKResult } from '@/lib/actions/dashboard'

interface AppForUKK {
  id: string
  reg_number: string | null
  status: string
  is_carry_over: boolean
  participants: { full_name: string; nik: string } | null
  positions:    { label: string } | null
  ukk_results:  UKKResultRow[]
}

interface UKKResultRow {
  id: string
  version: number
  score_technical: number
  score_psychology: number
  score_paper: number
  score_interview: number
  total_score: number
  is_pass: boolean | null
  is_latest: boolean
  notes: string | null
  created_at: string
}

export default function UKKDashboard() {
  const [apps, setApps]               = useState<AppForUKK[]>([])
  const [selectedApp, setSelectedApp] = useState<AppForUKK | null>(null)
  const [loading, setLoading]         = useState(true)
  const [submitting, setSubmitting]   = useState(false)
  const [view, setView]               = useState<'list' | 'input' | 'history'>('list')
  const [searchTerm, setSearch]       = useState('')

  // Form state
  const [scores, setScores] = useState({
    technical: 0, psychology: 0, paper: 0, interview: 0,
  })
  const [isPass, setIsPass] = useState<boolean | null>(null)
  const [notes, setNotes]   = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [formSuccess, setFormSuccess] = useState(false)

  useEffect(() => { loadApps() }, [])

  async function loadApps() {
    setLoading(true)
    const { data } = await supabase
      .from('applications')
      .select(`
        id, reg_number, status, is_carry_over,
        participants(full_name, nik),
        positions(label),
        ukk_results(id,version,score_technical,score_psychology,score_paper,score_interview,total_score,is_pass,is_latest,notes,created_at)
      `)
      .in('status', ['ikut_ukk', 'lolos_ukk', 'tidak_lolos_ukk'])
      .order('created_at')
    if (data) setApps(data as AppForUKK[])
    setLoading(false)
  }

  const totalScore = Number(
    (scores.technical * 0.3 + scores.psychology * 0.2 + scores.paper * 0.2 + scores.interview * 0.3).toFixed(2)
  )

  function openInput(app: AppForUKK) {
    setSelectedApp(app)
    setScores({ technical: 0, psychology: 0, paper: 0, interview: 0 })
    setIsPass(null); setNotes(''); setFormError(null); setFormSuccess(false)
    setView('input')
  }

  function openHistory(app: AppForUKK) {
    setSelectedApp(app)
    setView('history')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedApp) return
    if (isPass === null) { setFormError('Tentukan apakah peserta lulus atau tidak.'); return }

    setSubmitting(true)
    setFormError(null)

    try {
      await inputUKKResult({
        application_id: selectedApp.id,
        score_technical: scores.technical,
        score_psychology: scores.psychology,
        score_paper: scores.paper,
        score_interview: scores.interview,
        is_pass: isPass,
        notes: notes || undefined,
      })

      // Update application status
      await supabase
        .from('applications')
        .update({ status: isPass ? 'lolos_ukk' : 'tidak_lolos_ukk' })
        .eq('id', selectedApp.id)

      setFormSuccess(true)
      loadApps()
      setTimeout(() => { setView('list'); setFormSuccess(false) }, 2000)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Gagal menyimpan nilai.')
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = apps.filter(a =>
    !searchTerm ||
    a.participants?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.participants?.nik?.includes(searchTerm) ||
    a.reg_number?.includes(searchTerm)
  )

  const latestResult = (app: AppForUKK) => app.ukk_results.find(r => r.is_latest)
  const passingGrade = 70

  if (loading) return (
    <div className="h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-[#1E40AF]/20 border-t-[#1E40AF] rounded-full animate-spin" />
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
            <div className="text-white/40 text-[9.5px] uppercase tracking-wide">Panel Tim UKK</div>
          </div>
        </div>
        <button onClick={() => setView('list')} className="text-[12px] text-white/50 hover:text-white transition-colors">
          {view !== 'list' && '← Kembali ke Daftar'}
        </button>
      </div>

      <div className="max-w-[900px] mx-auto px-6 py-8">

        {/* ── LIST VIEW ── */}
        {view === 'list' && (
          <>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-[20px] font-extrabold text-[#0F172A]">Input Nilai UKK</h1>
                <p className="text-[12.5px] text-[#64748B] mt-0.5">
                  {apps.length} peserta · {apps.filter(a => latestResult(a)).length} sudah diinput · Nilai tidak dapat dihapus, hanya bisa direvisi (versioning)
                </p>
              </div>
              <div className="flex items-center gap-3">
                <input type="text" value={searchTerm} onChange={e => setSearch(e.target.value)}
                  placeholder="Cari peserta..." className="px-3 py-2 border border-[#E2E8F0] rounded-xl text-[13px] bg-white outline-none w-52 focus:border-[#1E40AF]" />
              </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Total Peserta UKK',    val: apps.length,                                   color: '#1E40AF', bg: '#EFF6FF' },
                { label: 'Sudah Diinput',         val: apps.filter(a => latestResult(a)).length,      color: '#10B981', bg: '#ECFDF5' },
                { label: 'Belum Diinput',         val: apps.filter(a => !latestResult(a)).length,     color: '#F59E0B', bg: '#FFFBEB' },
              ].map(s => (
                <div key={s.label} className="bg-white border border-[#E2E8F0] rounded-xl p-4">
                  <div className="text-[11px] text-[#64748B] mb-1">{s.label}</div>
                  <div className="text-[28px] font-extrabold" style={{ color: s.color }}>{s.val}</div>
                </div>
              ))}
            </div>

            {/* Immutability notice */}
            <div className="mb-5 flex items-start gap-3 p-3.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl">
              <svg className="w-4 h-4 text-[#1E40AF] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p className="text-[12px] text-[#1E40AF]">
                <strong>Catatan Penting:</strong> Nilai UKK yang sudah diinput <strong>tidak dapat dihapus</strong>. Jika ada koreksi, gunakan tombol <em>"Revisi Nilai"</em> — sistem akan menyimpan versi baru dan mempertahankan riwayat semua versi sebelumnya untuk keperluan audit.
              </p>
            </div>

            {/* Participant list */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1.5fr_1fr_1fr_120px_160px] gap-4 px-5 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10.5px] font-bold text-[#94A3B8] uppercase tracking-wide">
                <span>Peserta</span>
                <span>No. Reg.</span>
                <span>Nilai / Status</span>
                <span>Versi</span>
                <span>Aksi</span>
              </div>
              {filtered.map(app => {
                const latest = latestResult(app)
                return (
                  <div key={app.id} className={`grid grid-cols-[1.5fr_1fr_1fr_120px_160px] gap-4 px-5 py-3.5 border-b border-[#F8FAFC] items-center hover:bg-[#FAFAFA] ${app.is_carry_over ? 'bg-amber-50/30' : ''}`}>
                    <div>
                      <div className="text-[12.5px] font-semibold text-[#0F172A] flex items-center gap-1.5">
                        {app.participants?.full_name}
                        {app.is_carry_over && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">🔄</span>}
                      </div>
                      <div className="text-[11px] text-[#94A3B8]">{app.participants?.nik}</div>
                    </div>
                    <div className="text-[12px] font-mono text-[#64748B]">{app.reg_number ?? '—'}</div>
                    <div>
                      {latest ? (
                        <div>
                          <div className="text-[14px] font-extrabold" style={{ color: latest.total_score >= passingGrade ? '#10B981' : '#EF4444' }}>
                            {latest.total_score.toFixed(1)}
                          </div>
                          <div className={`text-[10px] font-bold ${latest.is_pass ? 'text-green-600' : 'text-red-500'}`}>
                            {latest.is_pass ? '✓ LULUS' : '✗ TIDAK LULUS'}
                          </div>
                        </div>
                      ) : (
                        <span className="text-[11px] text-[#F59E0B] font-medium">Belum diinput</span>
                      )}
                    </div>
                    <div className="text-[12px] text-[#94A3B8]">
                      {app.ukk_results.length > 0 ? (
                        <span className="font-bold text-[#0F172A]">v{app.ukk_results.length}</span>
                      ) : '—'}
                    </div>
                    <div className="flex gap-1.5">
                      <button onClick={() => openInput(app)}
                        className="px-2.5 py-1.5 text-[10.5px] font-bold bg-[#1E40AF] text-white rounded-lg hover:bg-[#1d4ed8] transition-colors whitespace-nowrap">
                        {latest ? '✏️ Revisi' : '+ Input'}
                      </button>
                      {app.ukk_results.length > 0 && (
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

        {/* ── INPUT / REVISI VIEW ── */}
        {view === 'input' && selectedApp && (
          <div className="max-w-[620px]">
            <div className="mb-5 flex items-start gap-3 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
              <div className="flex-1">
                <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide mb-1">Peserta</div>
                <div className="text-[15px] font-extrabold text-[#0F172A]">{selectedApp.participants?.full_name}</div>
                <div className="text-[12px] text-[#64748B] mt-0.5">{selectedApp.participants?.nik} · {selectedApp.reg_number}</div>
                {selectedApp.is_carry_over && (
                  <div className="mt-2 text-[11px] bg-amber-100 text-amber-700 px-2 py-1 rounded-lg inline-block">
                    🔄 Peserta Carry-over dari periode 2025
                  </div>
                )}
              </div>
              {selectedApp.ukk_results.length > 0 && (
                <div className="text-right">
                  <div className="text-[10px] text-[#94A3B8]">Riwayat input</div>
                  <div className="text-[20px] font-extrabold text-[#1E40AF]">v{selectedApp.ukk_results.length}</div>
                  <div className="text-[10px] text-[#94A3B8]">versi sebelumnya</div>
                </div>
              )}
            </div>

            {latestResult(selectedApp) && (
              <div className="mb-4 p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-[12px] text-amber-700">
                <strong>Revisi nilai</strong> — versi sebelumnya: Total {latestResult(selectedApp)!.total_score.toFixed(1)} (v{latestResult(selectedApp)!.version}). Versi lama akan tetap tersimpan dalam riwayat.
              </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white border border-[#E2E8F0] rounded-xl p-6">
              <h2 className="text-[15px] font-extrabold text-[#0F172A] mb-5">
                {selectedApp.ukk_results.length > 0 ? '✏️ Revisi Nilai UKK' : '+ Input Nilai UKK'}
              </h2>

              {formError   && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 text-[12.5px] rounded-xl">{formError}</div>}
              {formSuccess  && <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-600 text-[12.5px] rounded-xl">✓ Nilai berhasil disimpan! Mengalihkan...</div>}

              {/* Score inputs */}
              <div className="grid grid-cols-2 gap-4 mb-5">
                {[
                  { key: 'technical',   label: 'Kompetensi Teknis',   weight: 30 },
                  { key: 'psychology',  label: 'Tes Psikologi',        weight: 20 },
                  { key: 'paper',       label: 'Presentasi Makalah',   weight: 20 },
                  { key: 'interview',   label: 'Wawancara UKK',        weight: 30 },
                ].map(({ key, label, weight }) => {
                  const val = scores[key as keyof typeof scores]
                  return (
                    <div key={key} className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[11.5px] font-bold text-[#374151]">{label}</label>
                        <span className="text-[10px] text-[#94A3B8] bg-white border border-[#E2E8F0] px-1.5 py-0.5 rounded-full">Bobot {weight}%</span>
                      </div>
                      <input
                        type="number" min={0} max={100} step={0.01}
                        value={val || ''}
                        onChange={e => setScores(s => ({ ...s, [key]: Math.min(100, Math.max(0, Number(e.target.value))) }))}
                        className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-lg text-[20px] font-extrabold text-center text-[#0F172A] bg-white outline-none focus:border-[#1E40AF]"
                        placeholder="0"
                      />
                      <div className="mt-2 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                        <div className="h-full bg-[#1E40AF] rounded-full transition-all" style={{ width: `${val}%` }} />
                      </div>
                      <div className="text-[10px] text-right text-[#94A3B8] mt-1">Kontribusi: {(val * weight / 100).toFixed(1)}</div>
                    </div>
                  )
                })}
              </div>

              {/* Total score display */}
              <div className={`flex items-center gap-4 p-4 rounded-xl border-2 mb-5 ${
                totalScore >= passingGrade ? 'border-green-300 bg-green-50' : 'border-red-200 bg-red-50'
              }`}>
                <div className="flex-1">
                  <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wide mb-1">Total Nilai (Tertimbang)</div>
                  <div className="text-[36px] font-extrabold" style={{ color: totalScore >= passingGrade ? '#10B981' : '#EF4444' }}>
                    {totalScore.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-[#94A3B8]">Nilai minimal lulus: {passingGrade}</div>
                </div>
                <div className="text-right">
                  <div className={`text-[14px] font-extrabold ${totalScore >= passingGrade ? 'text-green-600' : 'text-red-500'}`}>
                    {totalScore >= passingGrade ? '✓ Di atas batas' : '✗ Di bawah batas'}
                  </div>
                </div>
              </div>

              {/* Pass/Fail decision */}
              <div className="mb-5">
                <label className="block text-[11.5px] font-bold text-[#374151] mb-2">Keputusan Akhir Tim UKK <span className="text-red-500">*</span></label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setIsPass(true)}
                    className={`py-3 rounded-xl border-2 font-bold text-[13px] transition-all ${isPass === true ? 'bg-green-100 border-green-400 text-green-700' : 'border-[#E2E8F0] text-[#94A3B8] hover:border-green-300'}`}>
                    ✓ Dinyatakan LULUS
                  </button>
                  <button type="button" onClick={() => setIsPass(false)}
                    className={`py-3 rounded-xl border-2 font-bold text-[13px] transition-all ${isPass === false ? 'bg-red-100 border-red-400 text-red-600' : 'border-[#E2E8F0] text-[#94A3B8] hover:border-red-300'}`}>
                    ✗ Dinyatakan TIDAK LULUS
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div className="mb-5">
                <label className="block text-[11.5px] font-bold text-[#374151] mb-2">Catatan Tim UKK (opsional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3}
                  placeholder="Catatan khusus, rekomendasi, atau alasan keputusan..."
                  className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] text-[#0F172A] outline-none focus:border-[#1E40AF] resize-none" />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setView('list')}
                  className="flex-1 py-3 border border-[#E2E8F0] text-[#64748B] font-semibold rounded-xl hover:bg-[#F8FAFC]">
                  Batal
                </button>
                <button type="submit" disabled={submitting || isPass === null || formSuccess}
                  className="flex-[2] py-3 bg-[#0F172A] text-white font-bold rounded-xl disabled:opacity-40 hover:bg-[#1E293B] transition-colors">
                  {submitting ? 'Menyimpan...' : `Simpan Nilai (v${selectedApp.ukk_results.length + 1})`}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── HISTORY VIEW ── */}
        {view === 'history' && selectedApp && (
          <div className="max-w-[700px]">
            <div className="mb-5 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
              <div className="text-[15px] font-extrabold text-[#0F172A]">{selectedApp.participants?.full_name}</div>
              <div className="text-[12px] text-[#64748B]">{selectedApp.participants?.nik} · {selectedApp.reg_number}</div>
            </div>

            <div className="mb-4 flex items-center gap-2 p-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl">
              <svg className="w-4 h-4 text-[#1E40AF] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              <p className="text-[12px] text-[#1E40AF]">Semua versi nilai tersimpan permanen dan tidak dapat dihapus. Hanya versi terbaru yang digunakan sebagai nilai resmi.</p>
            </div>

            <div className="flex flex-col gap-3">
              {[...selectedApp.ukk_results].sort((a,b) => b.version - a.version).map(r => (
                <div key={r.id} className={`bg-white border rounded-xl p-5 ${r.is_latest ? 'border-[#1E40AF] ring-1 ring-[#1E40AF]' : 'border-[#E2E8F0]'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-extrabold text-[#0F172A]">Versi {r.version}</span>
                      {r.is_latest && <span className="text-[10px] bg-[#1E40AF] text-white px-2 py-0.5 rounded-full font-bold">VERSI AKTIF</span>}
                    </div>
                    <div className="text-[11px] text-[#94A3B8]">
                      {new Date(r.created_at).toLocaleString('id-ID', { day:'2-digit', month:'long', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    {[
                      { label: 'Teknis',      val: r.score_technical  },
                      { label: 'Psikologi',   val: r.score_psychology },
                      { label: 'Makalah',     val: r.score_paper      },
                      { label: 'Wawancara',   val: r.score_interview  },
                    ].map(s => (
                      <div key={s.label} className="text-center p-3 bg-[#F8FAFC] rounded-xl">
                        <div className="text-[10.5px] text-[#94A3B8] mb-1">{s.label}</div>
                        <div className="text-[18px] font-extrabold text-[#0F172A]">{s.val.toFixed(1)}</div>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-[#94A3B8]">Total: </span>
                      <span className="text-[16px] font-extrabold" style={{ color: r.total_score >= passingGrade ? '#10B981' : '#EF4444' }}>
                        {r.total_score.toFixed(2)}
                      </span>
                    </div>
                    <span className={`text-[11px] font-bold px-3 py-1 rounded-full ${r.is_pass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                      {r.is_pass ? '✓ LULUS' : '✗ TIDAK LULUS'}
                    </span>
                  </div>
                  {r.notes && <div className="mt-3 text-[11.5px] text-[#64748B] italic border-t border-[#F1F5F9] pt-3">Catatan: {r.notes}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
