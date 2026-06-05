'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { AccessCode } from '@/types/extended'

interface EnrichedCode extends AccessCode {
  period_label?: string
  bumd_short?: string
  used_by_name?: string
}

export default function AccessCodeManager() {
  const [codes, setCodes]         = useState<EnrichedCode[]>([])
  const [periods, setPeriods]     = useState<{ id: string; period_label: string; bumd_short: string; is_restricted: boolean }[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState('')
  const [generating, setGenerating] = useState(false)
  const [bulkCount, setBulkCount] = useState(1)
  const [label, setLabel]         = useState('')
  const [issuedTo, setIssuedTo]   = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [filterPeriod, setFilterPeriod] = useState('all')
  const [copied, setCopied]       = useState<string | null>(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => { loadAll() }, [])

  async function loadAll() {
    setLoading(true)
    const [{ data: codeData }, { data: periodData }] = await Promise.all([
      supabase.from('access_codes')
        .select(`*, selection_periods(period_label, bumd_short)`)
        .order('created_at', { ascending: false }),
      supabase.from('selection_periods')
        .select('id, period_label, bumd_short, is_restricted')
        .eq('status', 'open')
        .eq('is_restricted', true),
    ])

    if (codeData) {
      setCodes(codeData.map(c => ({
        ...c,
        period_label: (c.selection_periods as any)?.period_label,
        bumd_short:   (c.selection_periods as any)?.bumd_short,
      })))
    }
    if (periodData) setPeriods(periodData)
    setLoading(false)
  }

  function generateCode(prefix = 'INT'): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    const rand = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    return `${prefix}-${rand}`
  }

  async function handleGenerate() {
    if (!selectedPeriod) return
    setGenerating(true)

    const { data: { user } } = await supabase.auth.getUser()
    const period = periods.find(p => p.id === selectedPeriod)
    const prefix = period?.bumd_short?.replace(/[^A-Z]/gi, '').toUpperCase().slice(0, 3) ?? 'INT'

    const newCodes = Array.from({ length: bulkCount }, () => ({
      period_id:  selectedPeriod,
      code:       generateCode(prefix),
      label:      label || null,
      issued_to:  issuedTo || null,
      is_active:  true,
      expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      created_by: user?.id,
    }))

    const { error } = await supabase.from('access_codes').insert(newCodes)
    if (!error) {
      setLabel(''); setIssuedTo(''); setExpiresAt('')
      loadAll()
      // Audit
      await supabase.from('audit_logs').insert({
        user_id:    user?.id,
        action:     'GENERATE_ACCESS_CODES',
        table_name: 'access_codes',
        new_data:   { period_id: selectedPeriod, count: bulkCount },
      })
    }
    setGenerating(false)
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('access_codes').update({ is_active: !current }).eq('id', id)
    loadAll()
  }

  async function copyCode(code: string) {
    await navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  async function exportCSV() {
    const filtered = filterPeriod === 'all' ? codes : codes.filter(c => c.period_id === filterPeriod)
    const rows = [
      ['Kode Akses', 'Periode', 'Label', 'Diterbitkan Untuk', 'Status', 'Digunakan Oleh', 'Waktu Digunakan', 'Kedaluwarsa'],
      ...filtered.map(c => [
        c.code,
        c.period_label ?? '',
        c.label ?? '',
        c.issued_to ?? '',
        c.is_active ? (c.used_by ? 'Sudah Digunakan' : 'Aktif') : 'Nonaktif',
        c.used_by_name ?? (c.used_by ? c.used_by.slice(0, 8) + '...' : ''),
        c.used_at ? new Date(c.used_at).toLocaleString('id-ID') : '',
        c.expires_at ? new Date(c.expires_at).toLocaleString('id-ID') : 'Tidak ada',
      ])
    ]
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href = url; a.download = `kode-akses-${Date.now()}.csv`
    a.click(); URL.revokeObjectURL(url)
  }

  const filtered = filterPeriod === 'all' ? codes : codes.filter(c => c.period_id === filterPeriod)
  const stats = {
    total:    codes.length,
    active:   codes.filter(c => c.is_active && !c.used_by).length,
    used:     codes.filter(c => !!c.used_by).length,
    inactive: codes.filter(c => !c.is_active).length,
  }

  return (
    <div className="max-w-[860px]">
      <div className="mb-6">
        <h1 className="text-[20px] font-extrabold text-[#0F172A] mb-1">Manajemen Kode Akses</h1>
        <p className="text-[13px] text-[#64748B]">
          Kelola kode akses untuk seleksi terbatas (Komisaris & Dewan Pengawas). Setiap kode hanya bisa digunakan satu kali.
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total Kode',  val: stats.total,    color: '#1E40AF', bg: '#EFF6FF' },
          { label: 'Aktif / Belum Digunakan', val: stats.active,   color: '#10B981', bg: '#ECFDF5' },
          { label: 'Sudah Digunakan',         val: stats.used,     color: '#F59E0B', bg: '#FFFBEB' },
          { label: 'Nonaktif',   val: stats.inactive, color: '#94A3B8', bg: '#F1F5F9' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-[#E2E8F0] rounded-xl p-4">
            <div className="text-[10.5px] text-[#64748B] mb-1">{s.label}</div>
            <div className="text-[26px] font-extrabold" style={{ color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_1.6fr] gap-5">

        {/* ── Generator Panel ── */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
          <div className="text-[12px] font-bold text-[#0F172A] mb-4 flex items-center gap-2">
            <span>🔑</span> Generate Kode Baru
          </div>

          {periods.length === 0 ? (
            <div className="text-center py-6 text-[12.5px] text-[#94A3B8]">
              Tidak ada seleksi terbatas yang aktif saat ini.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div>
                <label className="block text-[10.5px] font-bold text-[#64748B] uppercase tracking-wide mb-1.5">Periode Seleksi <span className="text-red-500">*</span></label>
                <select value={selectedPeriod} onChange={e => setSelectedPeriod(e.target.value)}
                  className="gen-input">
                  <option value="">Pilih periode...</option>
                  {periods.map(p => (
                    <option key={p.id} value={p.id}>{p.bumd_short} — {p.period_label.slice(0, 30)}...</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-[#64748B] uppercase tracking-wide mb-1.5">Label / Keterangan</label>
                <input value={label} onChange={e => setLabel(e.target.value)}
                  placeholder="cth: Untuk Kepala Dinas" className="gen-input" />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-[#64748B] uppercase tracking-wide mb-1.5">Diterbitkan Untuk (opsional)</label>
                <input value={issuedTo} onChange={e => setIssuedTo(e.target.value)}
                  placeholder="cth: Ir. Budi Santoso, M.T." className="gen-input" />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-[#64748B] uppercase tracking-wide mb-1.5">Kedaluwarsa (opsional)</label>
                <input type="datetime-local" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} className="gen-input" />
              </div>

              <div>
                <label className="block text-[10.5px] font-bold text-[#64748B] uppercase tracking-wide mb-1.5">Jumlah Kode</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setBulkCount(Math.max(1, bulkCount - 1))}
                    className="w-8 h-8 border border-[#E2E8F0] rounded-lg flex items-center justify-center text-[#64748B] hover:bg-[#F1F5F9] font-bold">−</button>
                  <input type="number" value={bulkCount} min={1} max={50}
                    onChange={e => setBulkCount(Math.max(1, Math.min(50, Number(e.target.value))))}
                    className="gen-input text-center w-16" />
                  <button onClick={() => setBulkCount(Math.min(50, bulkCount + 1))}
                    className="w-8 h-8 border border-[#E2E8F0] rounded-lg flex items-center justify-center text-[#64748B] hover:bg-[#F1F5F9] font-bold">+</button>
                </div>
              </div>

              <button onClick={handleGenerate} disabled={!selectedPeriod || generating}
                className="w-full py-3 bg-[#0F172A] text-white font-bold text-[13px] rounded-xl disabled:opacity-40 hover:bg-[#1E293B] transition-all mt-1">
                {generating ? 'Membuat...' : `🔑 Generate ${bulkCount} Kode`}
              </button>
            </div>
          )}
        </div>

        {/* ── Code list ── */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F1F5F9]">
            <div className="text-[12px] font-bold text-[#0F172A]">Daftar Kode</div>
            <div className="flex items-center gap-2">
              <select value={filterPeriod} onChange={e => setFilterPeriod(e.target.value)}
                className="px-2 py-1.5 border border-[#E2E8F0] rounded-lg text-[11.5px] bg-white outline-none">
                <option value="all">Semua Periode</option>
                {periods.map(p => <option key={p.id} value={p.id}>{p.bumd_short}</option>)}
              </select>
              <button onClick={exportCSV}
                className="px-3 py-1.5 text-[11px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] rounded-lg hover:bg-[#D1FAE5] transition-colors">
                Export CSV
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="w-7 h-7 border-2 border-[#1E40AF]/20 border-t-[#1E40AF] rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 text-[12.5px] text-[#94A3B8]">Belum ada kode akses.</div>
            ) : (
              <div className="divide-y divide-[#F8FAFC]">
                {filtered.map(c => (
                  <div key={c.id} className={`px-5 py-3.5 hover:bg-[#FAFAFA] ${!c.is_active ? 'opacity-50' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Code itself */}
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[15px] font-extrabold font-mono text-[#0F172A] tracking-wider">{c.code}</span>
                          <button onClick={() => copyCode(c.code)}
                            className="w-6 h-6 flex items-center justify-center text-[#94A3B8] hover:text-[#1E40AF] transition-colors">
                            {copied === c.code
                              ? <svg className="w-3.5 h-3.5 text-[#10B981]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                              : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                            }
                          </button>
                        </div>

                        {/* Meta info */}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10.5px] text-[#94A3B8]">
                          {c.period_label && <span>{c.bumd_short}</span>}
                          {c.label && <span>· {c.label}</span>}
                          {c.issued_to && <span>· Untuk: {c.issued_to}</span>}
                          {c.expires_at && <span>· Exp: {new Date(c.expires_at).toLocaleDateString('id-ID')}</span>}
                        </div>

                        {c.used_by && (
                          <div className="mt-1 text-[10.5px] text-[#F59E0B]">
                            ✓ Digunakan pada {c.used_at ? new Date(c.used_at).toLocaleString('id-ID') : '—'}
                          </div>
                        )}
                      </div>

                      {/* Status + action */}
                      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          !c.is_active     ? 'bg-[#F1F5F9] text-[#94A3B8]' :
                          c.used_by        ? 'bg-amber-100 text-amber-700'  :
                                             'bg-green-100 text-green-700'
                        }`}>
                          {!c.is_active ? 'Nonaktif' : c.used_by ? 'Terpakai' : '● Aktif'}
                        </span>
                        {!c.used_by && (
                          <button onClick={() => toggleActive(c.id, c.is_active)}
                            className="text-[10px] text-[#94A3B8] hover:text-[#EF4444] transition-colors">
                            {c.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`.gen-input { width:100%; padding:8px 12px; border:1px solid #E2E8F0; border-radius:9px; font-size:12.5px; color:#0F172A; background:white; outline:none; font-family:inherit; transition:all .15s; } .gen-input:focus { border-color:#1E40AF; }`}</style>
    </div>
  )
}
