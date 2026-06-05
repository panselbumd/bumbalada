'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { exportToExcel, exportRekapPDF } from '@/lib/utils/export'

interface PeriodOption {
  id: string
  period_code: string
  period_label: string
  bumd_short: string
  status: string
  total_applicants: number
  passed_admin: number
  passed_ukk: number
  selected: number
  carry_over_count: number
}

export default function LaporanPage() {
  const [periods, setPeriods]         = useState<PeriodOption[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption | null>(null)
  const [exporting, setExporting]     = useState<string | null>(null)
  const [loading, setLoading]         = useState(true)

  useEffect(() => { loadPeriods() }, [])

  async function loadPeriods() {
    setLoading(true)
    const { data } = await supabase.from('v_period_summary').select('*').order('status')
    if (data) {
      setPeriods(data)
      setSelectedPeriod(data.find(p => p.status === 'open') ?? data[0] ?? null)
    }
    setLoading(false)
  }

  async function handleExport(type: 'excel' | 'pdf' | 'pdf-rekap') {
    if (!selectedPeriod) return
    setExporting(type)
    try {
      if (type === 'excel')     await exportToExcel(selectedPeriod.id, selectedPeriod.period_label)
      if (type === 'pdf-rekap') await exportRekapPDF(selectedPeriod.id, selectedPeriod.period_label)
    } finally {
      setExporting(null)
    }
  }

  const EXPORT_TYPES = [
    {
      id:    'excel',
      icon:  '📊',
      label: 'Export Excel (CSV)',
      desc:  'Seluruh data peserta, nilai UKK, wawancara, status — format CSV yang kompatibel dengan Excel',
      color: '#059669', bg: '#ECFDF5', border: '#A7F3D0',
    },
    {
      id:    'pdf-rekap',
      icon:  '📄',
      label: 'Rekap PDF — Semua Peserta',
      desc:  'Dokumen rekap lengkap seluruh peserta beserta nilai dan status akhir, siap cetak format A4 landscape',
      color: '#1E40AF', bg: '#EFF6FF', border: '#BFDBFE',
    },
    {
      id:    'pdf-lulus',
      icon:  '🏆',
      label: 'Daftar Calon Terpilih (PDF)',
      desc:  'Daftar peserta yang ditetapkan sebagai calon terpilih untuk keperluan penetapan resmi',
      color: '#7C3AED', bg: '#EDE9FE', border: '#C4B5FD',
    },
  ]

  if (loading) return (
    <div className="h-64 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#1E40AF]/20 border-t-[#1E40AF] rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="bg-[#0F172A] px-7 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/></svg>
          </div>
          <div>
            <div className="text-white font-extrabold text-[14px]">SIPSELBUMD</div>
            <div className="text-white/40 text-[9.5px] uppercase tracking-wide">Laporan & Export</div>
          </div>
        </div>
      </div>

      <div className="max-w-[760px] mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-[20px] font-extrabold text-[#0F172A] mb-1">Laporan & Export</h1>
          <p className="text-[13px] text-[#64748B]">
            Export data seleksi dalam format Excel atau PDF untuk keperluan pelaporan dan dokumentasi resmi.
          </p>
        </div>

        {/* Period selector */}
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 mb-6">
          <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wide mb-3">Pilih Periode Seleksi</label>
          <div className="flex flex-col gap-2">
            {periods.map(p => (
              <button key={p.id} type="button"
                onClick={() => setSelectedPeriod(p)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  selectedPeriod?.id === p.id
                    ? 'border-[#1E40AF] bg-[#EFF6FF]'
                    : 'border-[#E2E8F0] hover:border-[#1E40AF]/30'
                }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded-full ${
                        p.status === 'open' ? 'bg-green-100 text-green-700' :
                        p.status === 'completed' ? 'bg-[#F1F5F9] text-[#64748B]' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {p.status === 'open' ? '● AKTIF' : p.status === 'completed' ? 'SELESAI' : p.status.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-[#94A3B8] font-medium">{p.bumd_short}</span>
                    </div>
                    <div className="text-[13.5px] font-bold text-[#0F172A]">{p.period_label}</div>
                  </div>
                  <div className="flex gap-4 text-right text-[11px]">
                    <div><div className="font-bold text-[#0F172A]">{p.total_applicants}</div><div className="text-[#94A3B8]">Pendaftar</div></div>
                    <div><div className="font-bold text-[#10B981]">{p.selected}</div><div className="text-[#94A3B8]">Terpilih</div></div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Selected period stats */}
        {selectedPeriod && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 mb-6">
            <div className="text-[11px] font-bold text-[#64748B] uppercase tracking-wide mb-4">
              Ringkasan — {selectedPeriod.period_label}
            </div>
            <div className="grid grid-cols-5 gap-3">
              {[
                { label: 'Total Pendaftar',    val: selectedPeriod.total_applicants, color: '#1E40AF' },
                { label: 'Carry-over',         val: selectedPeriod.carry_over_count, color: '#F59E0B' },
                { label: 'Lolos Administrasi', val: selectedPeriod.passed_admin,     color: '#0284C7' },
                { label: 'Lolos UKK',          val: selectedPeriod.passed_ukk,       color: '#8B5CF6' },
                { label: 'Calon Terpilih',     val: selectedPeriod.selected,         color: '#10B981' },
              ].map(s => (
                <div key={s.label} className="text-center p-3 bg-[#F8FAFC] rounded-xl">
                  <div className="text-[22px] font-extrabold" style={{ color: s.color }}>{s.val}</div>
                  <div className="text-[9.5px] text-[#94A3B8] mt-0.5 leading-tight">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Export options */}
        <div className="flex flex-col gap-3">
          {EXPORT_TYPES.map(exp => (
            <div key={exp.id} className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex items-center gap-5">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0`}
                style={{ background: exp.bg, border: `1px solid ${exp.border}` }}>
                {exp.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-bold text-[#0F172A] mb-0.5">{exp.label}</div>
                <div className="text-[12px] text-[#64748B]">{exp.desc}</div>
              </div>
              <button
                onClick={() => handleExport(exp.id as any)}
                disabled={!selectedPeriod || exporting === exp.id}
                className="flex-shrink-0 px-4 py-2.5 font-bold text-[12.5px] rounded-xl disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:opacity-90"
                style={{ background: exp.bg, color: exp.color, border: `1px solid ${exp.border}` }}>
                {exporting === exp.id ? (
                  <span className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 border-2 rounded-full animate-spin" style={{ borderColor: `${exp.color}40`, borderTopColor: exp.color }} />
                    Export...
                  </span>
                ) : '↓ Download'}
              </button>
            </div>
          ))}
        </div>

        {/* Note */}
        <div className="mt-6 p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl">
          <div className="flex items-start gap-2.5">
            <svg className="w-4 h-4 text-[#94A3B8] mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <p className="text-[11.5px] text-[#64748B] leading-relaxed">
              Seluruh proses export dicatat dalam <strong>audit trail</strong>. File Excel menggunakan format CSV berenkoding UTF-8 dengan BOM agar kompatibel dengan Microsoft Excel. PDF dibuka di tab baru dan dapat disimpan melalui fitur print browser (Ctrl+P → Save as PDF).
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
