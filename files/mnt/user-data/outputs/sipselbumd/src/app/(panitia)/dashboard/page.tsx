'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { PeriodSummary } from '@/types/extended'

export default function PanitiaDashboard() {
  const [periods, setPeriods]   = useState<PeriodSummary[]>([])
  const [selected, setSelected] = useState<PeriodSummary | null>(null)
  const [apps, setApps]         = useState<ApplicationRow[]>([])
  const [filter, setFilter]     = useState('all')
  const [search, setSearch]     = useState('')
  const [loading, setLoading]   = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'verifikasi' | 'carryover' | 'peserta'>('overview')

  useEffect(() => { loadPeriods() }, [])
  useEffect(() => { if (selected) loadApplications(selected.id) }, [selected])

  async function loadPeriods() {
    setLoading(true)
    const { data } = await supabase.from('v_period_summary').select('*').order('status')
    if (data?.length) {
      setPeriods(data)
      setSelected(data.find(p => p.status === 'open') ?? data[0])
    }
    setLoading(false)
  }

  async function loadApplications(periodId: string) {
    const { data } = await supabase
      .from('applications')
      .select(`
        id, reg_number, status, is_carry_over, carry_over_note, submitted_at,
        participants(full_name, nik, phone, email, gender),
        positions(label, name)
      `)
      .eq('period_id', periodId)
      .order('submitted_at', { ascending: false })
    if (data) setApps(data as ApplicationRow[])
  }

  const filtered = apps.filter(a => {
    const matchSearch = !search ||
      a.participants?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      a.participants?.nik?.includes(search) ||
      a.reg_number?.includes(search)
    const matchFilter = filter === 'all' || a.status === filter || (filter === 'carry_over' && a.is_carry_over)
    return matchSearch && matchFilter
  })

  async function updateStatus(appId: string, newStatus: string) {
    const { error } = await supabase
      .from('applications')
      .update({ status: newStatus })
      .eq('id', appId)
    if (!error && selected) {
      loadApplications(selected.id)
      loadPeriods()
      // Audit
      const { data: { user } } = await supabase.auth.getUser()
      await supabase.from('audit_logs').insert({
        user_id: user?.id, action: 'UPDATE_STATUS',
        table_name: 'applications', record_id: appId,
        new_data: { status: newStatus },
      })
    }
  }

  async function generateAccessCode(periodId: string) {
    const code = `INTERNAL-${Math.random().toString(36).slice(2,8).toUpperCase()}`
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('access_codes').insert({
      period_id: periodId, code, is_active: true, created_by: user?.id,
    })
    alert(`Kode akses baru: ${code}`)
  }

  if (loading) return <LoadingScreen />

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* ── SIDEBAR ── */}
      <aside className="w-[240px] bg-[#0F172A] flex flex-col flex-shrink-0">
        <div className="px-5 py-5 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/></svg>
            </div>
            <div>
              <div className="text-white font-extrabold text-[13px]">SIPSELBUMD</div>
              <div className="text-white/40 text-[9.5px] uppercase tracking-wide">Panel Panitia</div>
            </div>
          </div>
        </div>

        {/* Period selector */}
        <div className="px-4 py-4 border-b border-white/[0.06]">
          <div className="text-[10px] font-bold text-white/30 uppercase tracking-wide mb-2">Periode Seleksi</div>
          {periods.map(p => (
            <button key={p.id} onClick={() => setSelected(p)}
              className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 transition-all ${
                selected?.id === p.id ? 'bg-[#1E40AF] text-white' : 'text-white/50 hover:bg-white/[0.05] hover:text-white'
              }`}>
              <div className="text-[11px] font-bold leading-tight">{p.bumd_short}</div>
              <div className="text-[9.5px] opacity-70 mt-0.5 leading-tight">{p.period_label.replace(/Seleksi /, '').slice(0, 28)}…</div>
            </button>
          ))}
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-4 py-4">
          {[
            { key: 'overview',   label: 'Ringkasan', icon: '📊' },
            { key: 'verifikasi', label: 'Verifikasi Adm.', icon: '✅' },
            { key: 'carryover',  label: 'Carry-over', icon: '🔄' },
            { key: 'peserta',    label: 'Semua Peserta', icon: '👥' },
          ].map(n => (
            <button key={n.key} onClick={() => setActiveTab(n.key as typeof activeTab)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-[12.5px] font-semibold transition-all ${
                activeTab === n.key ? 'bg-white/10 text-white' : 'text-white/45 hover:text-white hover:bg-white/[0.05]'
              }`}>
              <span>{n.icon}</span>{n.label}
            </button>
          ))}

          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            {[
              { label: 'Pengumuman', icon: '📢' },
              { label: 'Jadwal', icon: '📅' },
              { label: 'Input Wawancara', icon: '🎤' },
              { label: 'Berita Acara', icon: '📄' },
              { label: 'Kode Akses', icon: '🔑' },
              { label: 'Laporan & Export', icon: '📈' },
            ].map(n => (
              <button key={n.label}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-[12px] font-medium text-white/40 hover:text-white hover:bg-white/[0.05] transition-all">
                <span>{n.icon}</span>{n.label}
              </button>
            ))}
          </div>
        </nav>

        <div className="px-4 py-4 border-t border-white/[0.06]">
          <button className="w-full text-[11px] text-white/30 hover:text-white/60 transition-colors text-left">
            Keluar →
          </button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main className="flex-1 overflow-auto">
        {/* Top bar */}
        <div className="bg-white border-b border-[#E2E8F0] px-7 py-4 flex items-center justify-between sticky top-0 z-10">
          <div>
            <h1 className="text-[15px] font-extrabold text-[#0F172A]">
              {activeTab === 'overview'   && 'Ringkasan Seleksi'}
              {activeTab === 'verifikasi' && 'Verifikasi Administrasi'}
              {activeTab === 'carryover'  && 'Peserta Carry-over'}
              {activeTab === 'peserta'    && 'Semua Peserta'}
            </h1>
            {selected && (
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full ${
                  selected.is_restricted ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                }`}>
                  {selected.is_restricted ? '⚿ TERBATAS' : '● TERBUKA'}
                </span>
                <span className="text-[11.5px] text-[#64748B]">{selected.period_label}</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {selected?.is_restricted && (
              <button onClick={() => generateAccessCode(selected.id)}
                className="px-3 py-1.5 text-[11.5px] font-bold bg-amber-100 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-200 transition-colors">
                🔑 Buat Kode Akses
              </button>
            )}
            <button className="px-3 py-1.5 text-[11.5px] font-bold bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] rounded-lg hover:bg-[#DBEAFE] transition-colors">
              📊 Export Excel
            </button>
            <button className="px-3 py-1.5 text-[11.5px] font-bold bg-[#0F172A] text-white rounded-lg hover:bg-[#1E293B] transition-colors">
              📄 Export PDF
            </button>
          </div>
        </div>

        <div className="p-7">

          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'overview' && selected && (
            <div>
              {/* Carry-over notice */}
              {selected.carry_over_count > 0 && (
                <div className="mb-5 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <span className="text-lg">🔄</span>
                  <div>
                    <div className="text-[13px] font-bold text-amber-800">
                      {selected.carry_over_count} Peserta Carry-over dari Periode Sebelumnya
                    </div>
                    <div className="text-[12px] text-amber-700 mt-1">
                      Peserta ini otomatis dinyatakan lolos administrasi dan langsung mengikuti tahap UKK tanpa mendaftar ulang.
                    </div>
                  </div>
                </div>
              )}

              {/* Stats grid */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Total Pendaftar',         val: selected.total_applicants, color: '#1E40AF', bg: '#EFF6FF', delta: `${selected.carry_over_count} carry-over` },
                  { label: 'Lolos Administrasi',       val: selected.passed_admin,    color: '#10B981', bg: '#ECFDF5', delta: `${Math.round(selected.passed_admin/Math.max(selected.total_applicants,1)*100)}% dari pendaftar` },
                  { label: 'Lolos UKK',                val: selected.passed_ukk,      color: '#0284C7', bg: '#E0F2FE', delta: `${Math.round(selected.passed_ukk/Math.max(selected.passed_admin,1)*100)}% dari adm.` },
                  { label: 'Calon Terpilih',           val: selected.selected,        color: '#8B5CF6', bg: '#EDE9FE', delta: `Kuota: ${selected.quota_position}` },
                ].map(s => (
                  <div key={s.label} className="bg-white border border-[#E2E8F0] rounded-xl p-5">
                    <div className="text-[11px] text-[#64748B] font-medium mb-1">{s.label}</div>
                    <div className="text-[32px] font-extrabold leading-none mb-2" style={{ color: s.color }}>{s.val}</div>
                    <div className="text-[11px]" style={{ color: s.color, opacity: 0.7 }}>{s.delta}</div>
                    {/* Mini progress bar */}
                    <div className="mt-3 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{
                        width: `${Math.min(100, Math.round(s.val/Math.max(selected.total_applicants,1)*100))}%`,
                        background: s.color
                      }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Quick status breakdown */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[#F1F5F9] flex items-center justify-between">
                  <div className="text-[13px] font-bold text-[#0F172A]">Status Peserta</div>
                  <button onClick={() => setActiveTab('peserta')} className="text-[11.5px] text-[#1E40AF] font-semibold hover:underline">Lihat Semua →</button>
                </div>
                <div className="divide-y divide-[#F8FAFC]">
                  {[
                    { status: 'submitted',              label: 'Menunggu Verifikasi',    color: '#F59E0B', bg: '#FFFBEB' },
                    { status: 'lolos_administrasi',     label: 'Lolos Administrasi',     color: '#10B981', bg: '#ECFDF5' },
                    { status: 'tidak_lolos_administrasi', label: 'Tidak Lolos Adm.',    color: '#EF4444', bg: '#FEF2F2' },
                    { status: 'ikut_ukk',               label: 'Sedang UKK',             color: '#0284C7', bg: '#E0F2FE' },
                    { status: 'lolos_ukk',              label: 'Lolos UKK',              color: '#10B981', bg: '#ECFDF5' },
                    { status: 'terpilih',               label: 'Calon Terpilih',         color: '#8B5CF6', bg: '#EDE9FE' },
                  ].map(row => {
                    const cnt = apps.filter(a => a.status === row.status).length
                    if (cnt === 0) return null
                    return (
                      <div key={row.status} className="flex items-center px-5 py-3 hover:bg-[#FAFAFA]">
                        <span className="w-2 h-2 rounded-full mr-3" style={{ background: row.color }} />
                        <span className="text-[12.5px] text-[#374151] flex-1">{row.label}</span>
                        <span className="text-[13px] font-bold" style={{ color: row.color }}>{cnt}</span>
                        <div className="ml-4 w-24 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${Math.round(cnt/Math.max(apps.length,1)*100)}%`, background: row.color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── VERIFIKASI / PESERTA TAB ── */}
          {(activeTab === 'verifikasi' || activeTab === 'peserta' || activeTab === 'carryover') && (
            <div>
              {/* Filters */}
              <div className="flex items-center gap-3 mb-5">
                <input
                  type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Cari nama, NIK, atau nomor registrasi..."
                  className="flex-1 px-4 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] outline-none focus:border-[#1E40AF] bg-white"
                />
                <select value={filter} onChange={e => setFilter(e.target.value)}
                  className="px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] bg-white outline-none focus:border-[#1E40AF] min-w-[200px]">
                  <option value="all">Semua Status</option>
                  <option value="submitted">Menunggu Verifikasi</option>
                  <option value="lolos_administrasi">Lolos Administrasi</option>
                  <option value="tidak_lolos_administrasi">Tidak Lolos Adm.</option>
                  <option value="carry_over">Carry-over</option>
                  <option value="ikut_ukk">Sedang UKK</option>
                  <option value="lolos_ukk">Lolos UKK</option>
                </select>
              </div>

              {/* Apply smart filter for tab */}
              <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
                <div className="grid grid-cols-[36px_1.5fr_1fr_1fr_1fr_140px] gap-3 px-5 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10.5px] font-bold text-[#94A3B8] uppercase tracking-wide">
                  <span>#</span>
                  <span>Peserta</span>
                  <span>No. Registrasi</span>
                  <span>Jabatan</span>
                  <span>Status</span>
                  <span>Aksi</span>
                </div>
                {filtered
                  .filter(a => {
                    if (activeTab === 'verifikasi') return a.status === 'submitted'
                    if (activeTab === 'carryover')  return a.is_carry_over
                    return true
                  })
                  .slice(0, 50)
                  .map((a, i) => (
                  <div key={a.id} className={`grid grid-cols-[36px_1.5fr_1fr_1fr_1fr_140px] gap-3 px-5 py-3 border-b border-[#F8FAFC] items-center hover:bg-[#FAFAFA] ${a.is_carry_over ? 'bg-amber-50/50' : ''}`}>
                    <span className="text-[12px] text-[#94A3B8] font-medium">{i+1}</span>
                    <div>
                      <div className="text-[12.5px] font-semibold text-[#0F172A] flex items-center gap-1.5">
                        {a.participants?.full_name}
                        {a.is_carry_over && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">🔄 CARRY</span>}
                      </div>
                      <div className="text-[11px] text-[#94A3B8]">{a.participants?.nik}</div>
                    </div>
                    <div className="text-[12px] font-mono text-[#64748B]">{a.reg_number ?? '—'}</div>
                    <div className="text-[12px] text-[#374151]">{a.positions?.label ?? '—'}</div>
                    <div>
                      <StatusBadge status={a.status} />
                    </div>
                    <div className="flex gap-1.5">
                      {a.status === 'submitted' && (
                        <>
                          <button onClick={() => updateStatus(a.id, 'lolos_administrasi')}
                            className="px-2.5 py-1.5 text-[10.5px] font-bold bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors whitespace-nowrap">
                            ✓ Lolos
                          </button>
                          <button onClick={() => updateStatus(a.id, 'tidak_lolos_administrasi')}
                            className="px-2.5 py-1.5 text-[10.5px] font-bold bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition-colors whitespace-nowrap">
                            ✗ Tolak
                          </button>
                        </>
                      )}
                      {a.status === 'lolos_administrasi' && (
                        <button onClick={() => updateStatus(a.id, 'ikut_ukk')}
                          className="px-2.5 py-1.5 text-[10.5px] font-bold bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors whitespace-nowrap">
                          → UKK
                        </button>
                      )}
                      <button className="px-2.5 py-1.5 text-[10.5px] font-bold bg-[#F1F5F9] text-[#475569] rounded-lg hover:bg-[#E2E8F0] transition-colors whitespace-nowrap">
                        Detail
                      </button>
                    </div>
                  </div>
                ))}
                {filtered.length === 0 && (
                  <div className="text-center py-12 text-[13px] text-[#94A3B8]">Tidak ada data yang sesuai filter.</div>
                )}
              </div>
              <div className="mt-3 text-[11px] text-[#94A3B8] text-right">
                Menampilkan {Math.min(filtered.length, 50)} dari {filtered.length} data
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  )
}

// ── Helper types ──
interface ApplicationRow {
  id: string
  reg_number: string | null
  status: string
  is_carry_over: boolean
  carry_over_note: string | null
  submitted_at: string | null
  participants: { full_name: string; nik: string; phone: string; email: string; gender: string } | null
  positions: { label: string; name: string } | null
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    draft:                     { label: 'Draft',            color: '#94A3B8', bg: '#F1F5F9' },
    submitted:                 { label: 'Menunggu Verif.', color: '#F59E0B', bg: '#FFFBEB' },
    lolos_administrasi:        { label: 'Lolos Adm.',       color: '#10B981', bg: '#ECFDF5' },
    tidak_lolos_administrasi:  { label: 'Tidak Lolos Adm.',color: '#EF4444', bg: '#FEF2F2' },
    ikut_ukk:                  { label: 'Sedang UKK',       color: '#0284C7', bg: '#E0F2FE' },
    lolos_ukk:                 { label: 'Lolos UKK',        color: '#10B981', bg: '#ECFDF5' },
    tidak_lolos_ukk:           { label: 'Tidak Lolos UKK', color: '#EF4444', bg: '#FEF2F2' },
    ikut_wawancara:            { label: 'Wawancara',        color: '#8B5CF6', bg: '#EDE9FE' },
    lolos_wawancara:           { label: 'Lolos Wawancara', color: '#10B981', bg: '#ECFDF5' },
    terpilih:                  { label: 'Terpilih',         color: '#1E40AF', bg: '#EFF6FF' },
    kontrak:                   { label: 'Kontrak',          color: '#0F172A', bg: '#F1F5F9' },
    diangkat:                  { label: 'Diangkat',         color: '#059669', bg: '#ECFDF5' },
  }
  const s = map[status] ?? { label: status, color: '#94A3B8', bg: '#F1F5F9' }
  return (
    <span className="inline-block px-2 py-0.5 text-[10.5px] font-bold rounded-full" style={{ color: s.color, background: s.bg }}>
      {s.label}
    </span>
  )
}

function LoadingScreen() {
  return (
    <div className="h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-[#1E40AF]/20 border-t-[#1E40AF] rounded-full animate-spin mx-auto mb-3" />
        <div className="text-[13px] text-[#64748B]">Memuat data...</div>
      </div>
    </div>
  )
}
