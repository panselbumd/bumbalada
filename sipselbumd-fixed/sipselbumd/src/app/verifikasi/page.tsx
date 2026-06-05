'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

interface VerificationResult {
  valid: boolean
  type: 'contract' | 'appointment' | 'announcement' | 'unknown'
  data?: {
    doc_number: string
    candidate_name: string
    position: string
    bumd_name: string
    date: string
    status: string
  }
  error?: string
}

export default function VerifikasiPage() {
  const searchParams = useSearchParams()
  const [code, setCode]       = useState(searchParams.get('code') ?? '')
  const [result, setResult]   = useState<VerificationResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [scanned, setScanned] = useState(false)

  useEffect(() => {
    // Auto-verify if code is in URL
    const urlCode = searchParams.get('code')
    if (urlCode) {
      setCode(urlCode)
      verify(urlCode)
    }
  }, [])

  async function verify(verifyCode?: string) {
    const targetCode = verifyCode ?? code
    if (!targetCode.trim()) return
    setLoading(true)
    setResult(null)

    try {
      // Try performance_contracts
      const { data: contract } = await supabase
        .from('performance_contracts')
        .select(`
          contract_number, signed_date, status,
          applications(
            participants(full_name),
            positions(label),
            selection_periods(bumd_name)
          )
        `)
        .eq('qr_code', targetCode.trim())
        .single()

      if (contract) {
        const app = (contract.applications as any)
        setResult({
          valid: true,
          type: 'contract',
          data: {
            doc_number:     contract.contract_number ?? '-',
            candidate_name: app?.participants?.full_name ?? '-',
            position:       app?.positions?.label ?? '-',
            bumd_name:      app?.selection_periods?.bumd_name ?? '-',
            date:           contract.signed_date ?? '-',
            status:         contract.status ?? '-',
          },
        })
        setLoading(false)
        return
      }

      // Try appointments (SK)
      const { data: appt } = await supabase
        .from('appointments')
        .select(`
          decree_number, appointment_date, status,
          applications(
            participants(full_name),
            positions(label),
            selection_periods(bumd_name)
          )
        `)
        .eq('qr_code', targetCode.trim())
        .single()

      if (appt) {
        const app = (appt.applications as any)
        setResult({
          valid: true,
          type: 'appointment',
          data: {
            doc_number:     appt.decree_number ?? '-',
            candidate_name: app?.participants?.full_name ?? '-',
            position:       app?.positions?.label ?? '-',
            bumd_name:      app?.selection_periods?.bumd_name ?? '-',
            date:           appt.appointment_date ?? '-',
            status:         appt.status ?? '-',
          },
        })
        setLoading(false)
        return
      }

      // Not found
      setResult({ valid: false, type: 'unknown', error: 'Kode QR tidak ditemukan dalam sistem.' })
    } catch {
      setResult({ valid: false, type: 'unknown', error: 'Terjadi kesalahan saat verifikasi.' })
    } finally {
      setLoading(false)
    }
  }

  const TYPE_LABELS = {
    contract:    { label: 'Kontrak Kinerja',  icon: '📋', color: '#1E40AF', bg: '#EFF6FF' },
    appointment: { label: 'SK Pengangkatan',  icon: '🎖', color: '#059669', bg: '#ECFDF5' },
    announcement:{ label: 'Pengumuman',       icon: '📢', color: '#0284C7', bg: '#E0F2FE' },
    unknown:     { label: 'Tidak Diketahui',  icon: '❓', color: '#94A3B8', bg: '#F1F5F9' },
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0F172A] to-[#1E3A8A] px-6 py-5">
        <div className="max-w-[560px] mx-auto flex items-center gap-3">
          <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24"><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/></svg>
          </div>
          <div>
            <div className="text-white font-extrabold text-[14px]">SIPSELBUMD</div>
            <div className="text-white/40 text-[9.5px] uppercase tracking-wide">Verifikasi Dokumen</div>
          </div>
        </div>
      </div>

      <div className="max-w-[560px] mx-auto px-6 py-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#EFF6FF] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#1E40AF]" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="3" height="3"/>
              <rect x="18" y="14" width="3" height="3"/><rect x="14" y="18" width="3" height="3"/>
              <rect x="18" y="18" width="3" height="3"/>
            </svg>
          </div>
          <h1 className="text-[22px] font-extrabold text-[#0F172A] mb-2">Verifikasi Dokumen Seleksi</h1>
          <p className="text-[13px] text-[#64748B] leading-relaxed">
            Masukkan kode verifikasi yang tertera pada dokumen resmi seleksi BUMD untuk memverifikasi keasliannya.
          </p>
        </div>

        {/* Input */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 mb-5">
          <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wide mb-2">
            Kode Verifikasi
          </label>
          <div className="flex gap-2">
            <input
              type="text" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && verify()}
              placeholder="Contoh: QR-L2K4P8XY atau nomor dokumen"
              className="flex-1 px-4 py-3 border border-[#E2E8F0] rounded-xl text-[13.5px] font-mono text-[#0F172A] outline-none focus:border-[#1E40AF] bg-[#F8FAFC] focus:bg-white transition-all"
            />
            <button
              onClick={() => verify()}
              disabled={loading || !code.trim()}
              className="px-5 py-3 bg-[#1E40AF] text-white font-bold text-[13px] rounded-xl disabled:opacity-40 hover:bg-[#1d4ed8] transition-colors whitespace-nowrap">
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Memverifikasi
                </span>
              ) : 'Verifikasi ↗'}
            </button>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-2">
            Kode verifikasi terdapat pada pojok kanan bawah dokumen resmi atau di bawah kode QR.
          </p>
        </div>

        {/* Result */}
        {result && (
          <div className={`rounded-2xl border-2 overflow-hidden ${
            result.valid ? 'border-green-300' : 'border-red-200'
          }`}>
            {/* Result header */}
            <div className={`px-6 py-5 ${result.valid ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${
                  result.valid ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {result.valid ? '✅' : '❌'}
                </div>
                <div>
                  <div className={`text-[15px] font-extrabold ${result.valid ? 'text-green-800' : 'text-red-700'}`}>
                    {result.valid ? 'Dokumen VALID & Terautentikasi' : 'Dokumen TIDAK DITEMUKAN'}
                  </div>
                  <div className={`text-[12px] mt-0.5 ${result.valid ? 'text-green-600' : 'text-red-500'}`}>
                    {result.valid
                      ? `Terdaftar sebagai: ${TYPE_LABELS[result.type].label}`
                      : result.error ?? 'Kode verifikasi tidak valid.'}
                  </div>
                </div>
              </div>
            </div>

            {/* Document details */}
            {result.valid && result.data && (
              <div className="bg-white px-6 py-5">
                <div className="text-[10.5px] font-bold text-[#94A3B8] uppercase tracking-wide mb-4">
                  Detail Dokumen
                </div>
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Nomor Dokumen', val: result.data.doc_number },
                    { label: 'Jenis Dokumen', val: TYPE_LABELS[result.type].label },
                    { label: 'Nama Calon',    val: result.data.candidate_name },
                    { label: 'Jabatan',       val: result.data.position },
                    { label: 'BUMD',          val: result.data.bumd_name },
                    { label: 'Tanggal',       val: result.data.date ? new Date(result.data.date).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric' }) : '-' },
                  ].map(item => (
                    <div key={item.label}>
                      <div className="text-[10.5px] text-[#94A3B8] font-semibold mb-0.5">{item.label}</div>
                      <div className="text-[13px] font-bold text-[#0F172A]">{item.val}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 pt-4 border-t border-[#F1F5F9] flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#10B981] flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  <p className="text-[11.5px] text-[#64748B]">
                    Dokumen ini telah diverifikasi keasliannya melalui sistem SIPSELBUMD pada{' '}
                    <strong>{new Date().toLocaleString('id-ID')}</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info card */}
        {!result && (
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
            <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide mb-3">Dokumen yang Dapat Diverifikasi</div>
            <div className="flex flex-col gap-2">
              {[
                { icon: '📋', label: 'Kontrak Kinerja', desc: 'Dokumen kontrak calon terpilih' },
                { icon: '🎖', label: 'SK Pengangkatan',  desc: 'Surat Keputusan pengangkatan resmi' },
                { icon: '📢', label: 'Pengumuman Hasil', desc: 'Pengumuman resmi hasil seleksi' },
              ].map(d => (
                <div key={d.label} className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-xl">
                  <span className="text-xl">{d.icon}</span>
                  <div>
                    <div className="text-[12.5px] font-semibold text-[#0F172A]">{d.label}</div>
                    <div className="text-[11px] text-[#94A3B8]">{d.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
