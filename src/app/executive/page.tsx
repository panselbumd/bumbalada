import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProtectedLayout from '@/components/layout/ProtectedLayout'
import { formatRupiah, formatPct, pctColor, healthBadgeClass, opinionBadgeClass } from '@/lib/utils'
import ExecCharts from '@/components/charts/ExecCharts'

export default async function ExecutivePage({
  searchParams,
}: {
  searchParams: { tahun?: string; triwulan?: string }
}) {
  const supabase  = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const tahun     = Number(searchParams.tahun    ?? new Date().getFullYear())
  const triwulan  = Number(searchParams.triwulan ?? Math.ceil((new Date().getMonth() + 1) / 3))

  const [bumdRes, bludRes, laporanBumdRes, laporanBludRes, kpiRes] = await Promise.all([
    supabase.from('bumd').select('*').eq('aktif', true),
    supabase.from('blud').select('*').eq('aktif', true),
    supabase.from('laporan_kinerja_bumd')
      .select('*, bumd(*)')
      .eq('tahun', tahun).eq('triwulan', triwulan),
    supabase.from('laporan_kinerja_blud')
      .select('*, blud(*)')
      .eq('tahun', tahun).eq('triwulan', triwulan),
    supabase.from('kpi_bumd')
      .select('*, bumd(nama, singkatan)')
      .eq('tahun', tahun).eq('triwulan', triwulan),
  ])

  const bumdList    = bumdRes.data    ?? []
  const bludList    = bludRes.data    ?? []
  const laporanBumd = laporanBumdRes.data ?? []
  const laporanBlud = laporanBludRes.data ?? []
  const kpiList     = kpiRes.data     ?? []

  const totalPAD = laporanBumd.reduce((s, l) => s + (l.dividen ?? 0), 0)
  const submitted = laporanBumd.filter(l => l.submitted_at).length
  const totalOrg  = bumdList.length + bludList.length

  const healthCount = {
    sehat:        laporanBumd.filter(l => l.level_kesehatan === 'sehat').length,
    kurang_sehat: laporanBumd.filter(l => l.level_kesehatan === 'kurang_sehat').length,
    tidak_sehat:  laporanBumd.filter(l => l.level_kesehatan === 'tidak_sehat').length,
  }

  const TRIWULAN = ['I','II','III','IV']

  return (
    <ProtectedLayout>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Topbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>
              Dashboard Eksekutif – Pembinaan BUMD/BLUD
            </h1>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
              Pemerintah Kota Batu · Triwulan {TRIWULAN[triwulan - 1]} {tahun}
            </div>
          </div>
          <form method="GET" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
            <select name="tahun" defaultValue={tahun} style={{ fontSize: '11px', padding: '5px 8px', border: '0.5px solid #e5e7eb', borderRadius: '8px', background: '#fff' }}>
              {[2026,2025,2024,2023].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select name="triwulan" defaultValue={triwulan} style={{ fontSize: '11px', padding: '5px 8px', border: '0.5px solid #e5e7eb', borderRadius: '8px', background: '#fff' }}>
              {[1,2,3,4].map(q => <option key={q} value={q}>TW {TRIWULAN[q-1]}</option>)}
            </select>
            <button type="submit" style={{ padding: '5px 12px', background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '11px', cursor: 'pointer' }}>
              Terapkan
            </button>
          </form>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
          {[
            { label: 'Total BUMD Aktif', value: bumdList.length, sub: 'Perseroda + Perumda', color: '#1E3A5F' },
            { label: 'Total BLUD',       value: bludList.length, sub: 'RS + Puskesmas BLUD', color: '#1E3A5F' },
            { label: 'Total Dividen/PAD',value: formatRupiah(totalPAD, true), sub: `TW ${TRIWULAN[triwulan-1]} ${tahun}`, color: '#27500A' },
            { label: 'Laporan Tersubmit',value: `${submitted}/${totalOrg}`, sub: `${totalOrg - submitted} belum submit`, color: '#0C447C' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e5e7eb', padding: '12px 14px' }}>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>{s.label}</div>
              <div style={{ fontSize: '22px', fontWeight: '500', color: s.color, margin: '4px 0 2px' }}>{s.value}</div>
              <div style={{ fontSize: '10px', color: '#9ca3af' }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* BUMD & BLUD Tables */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {/* BUMD */}
          <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', fontWeight: '500' }}>
              Rekap Kinerja BUMD
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>BUMD</th>
                    <th style={{ textAlign: 'right' }}>Revenue</th>
                    <th style={{ textAlign: 'right' }}>RKAP%</th>
                    <th style={{ textAlign: 'center' }}>Kesehatan</th>
                    <th style={{ textAlign: 'center' }}>Opini</th>
                  </tr>
                </thead>
                <tbody>
                  {bumdList.map(b => {
                    const lap = laporanBumd.find(l => l.bumd_id === b.id)
                    const rkap = lap?.target_pendapatan && lap?.realisasi_pendapatan
                      ? Math.round(lap.realisasi_pendapatan / lap.target_pendapatan * 100)
                      : null
                    return (
                      <tr key={b.id}>
                        <td>
                          <div style={{ fontSize: '11px', fontWeight: '500' }}>{b.singkatan ?? b.nama}</div>
                          <div style={{ fontSize: '10px', color: '#9ca3af' }}>{b.jenis}</div>
                        </td>
                        <td style={{ textAlign: 'right', fontSize: '11px', fontWeight: '500' }}>
                          {lap ? formatRupiah(lap.realisasi_pendapatan, true) : '—'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          {rkap != null ? (
                            <>
                              <div style={{ fontSize: '11px', fontWeight: '500', color: pctColor(rkap) }}>{rkap}%</div>
                              <div style={{ height: '3px', background: '#f1f5f9', borderRadius: '2px', marginTop: '2px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${Math.min(rkap, 100)}%`, background: pctColor(rkap), borderRadius: '2px' }} />
                              </div>
                            </>
                          ) : <span style={{ color: '#9ca3af', fontSize: '11px' }}>—</span>}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {lap?.level_kesehatan
                            ? <span className={healthBadgeClass(lap.level_kesehatan)}>
                                {lap.level_kesehatan === 'sehat' ? 'Sehat' : lap.level_kesehatan === 'kurang_sehat' ? 'Kurang Sehat' : 'Tidak Sehat'}
                              </span>
                            : <span style={{ color: '#9ca3af', fontSize: '10px' }}>—</span>}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {lap?.opini_auditor && lap.opini_auditor !== 'belum'
                            ? <span className={opinionBadgeClass(lap.opini_auditor)}>{lap.opini_auditor}</span>
                            : <span style={{ color: '#9ca3af', fontSize: '10px' }}>—</span>}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* BLUD */}
          <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', fontWeight: '500' }}>
              Rekap Kinerja BLUD
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>BLUD</th>
                    <th style={{ textAlign: 'right' }}>RBA Real</th>
                    <th style={{ textAlign: 'center' }}>RBA%</th>
                    <th style={{ textAlign: 'center' }}>CRR</th>
                  </tr>
                </thead>
                <tbody>
                  {bludList.map(b => {
                    const lap = laporanBlud.find(l => l.blud_id === b.id)
                    const pct = lap?.rba_target && lap?.rba_realisasi
                      ? Math.round(lap.rba_realisasi / lap.rba_target * 100) : null
                    return (
                      <tr key={b.id}>
                        <td style={{ fontSize: '11px', fontWeight: '500' }}>{b.singkatan ?? b.nama}</td>
                        <td style={{ textAlign: 'right', fontSize: '11px' }}>
                          {lap ? formatRupiah(lap.rba_realisasi, true) : '—'}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          {pct != null ? (
                            <span style={{ fontSize: '11px', fontWeight: '500', color: pctColor(pct) }}>{pct}%</span>
                          ) : '—'}
                        </td>
                        <td style={{ textAlign: 'center', fontSize: '11px', fontWeight: '500', color: pctColor(lap?.cost_recovery ?? 0) }}>
                          {lap?.cost_recovery != null ? `${lap.cost_recovery}%` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Health summary + KPI */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', fontWeight: '500' }}>
              Tingkat Kesehatan BUMD
            </div>
            <div style={{ padding: '12px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '8px', borderBottom: '0.5px solid #f1f5f9' }}>
              {[
                { l:'Sehat',        val: healthCount.sehat,        bg:'#EAF3DE', c:'#27500A' },
                { l:'Kurang Sehat', val: healthCount.kurang_sehat, bg:'#FAEEDA', c:'#633806' },
                { l:'Tidak Sehat',  val: healthCount.tidak_sehat,  bg:'#FCEBEB', c:'#791F1F' },
              ].map(h => (
                <div key={h.l} style={{ background: h.bg, borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', fontWeight: '500', color: h.c }}>{h.val}</div>
                  <div style={{ fontSize: '10px', color: h.c, marginTop: '2px' }}>{h.l}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {bumdList.map(b => {
                const lap = laporanBumd.find(l => l.bumd_id === b.id)
                const score = lap?.skor_kesehatan ?? 0
                const color = score >= 70 ? '#639922' : score >= 50 ? '#BA7517' : '#A32D2D'
                return (
                  <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', flex: 1, fontWeight: '500' }}>{b.singkatan ?? b.nama}</span>
                    <div style={{ flex: 2, height: '5px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${score}%`, background: color, borderRadius: '3px' }} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '500', color, width: '28px', textAlign: 'right' }}>{score || '—'}</span>
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '12px', fontWeight: '500' }}>
              KPI BUMD – TW {TRIWULAN[triwulan-1]} {tahun}
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead><tr><th>BUMD</th><th>Indikator</th><th style={{ textAlign:'center' }}>Target</th><th style={{ textAlign:'center' }}>Realisasi</th><th style={{ textAlign:'center' }}>Status</th></tr></thead>
                <tbody>
                  {kpiList.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign:'center', color:'#9ca3af', padding:'20px' }}>Belum ada data KPI</td></tr>
                  ) : kpiList.map(k => {
                    const sc: Record<string,string> = { melebihi_target:'badge-sehat', tercapai:'badge-wtp', tidak_tercapai:'badge-tidak' }
                    const sl: Record<string,string> = { melebihi_target:'Melebihi', tercapai:'Tercapai', tidak_tercapai:'Tidak Tercapai' }
                    return (
                      <tr key={k.id}>
                        <td style={{ fontSize:'11px', fontWeight:'500' }}>{(k.bumd as any)?.singkatan}</td>
                        <td style={{ fontSize:'11px' }}>{k.indikator}</td>
                        <td style={{ textAlign:'center', fontSize:'11px' }}>{k.target}</td>
                        <td style={{ textAlign:'center', fontSize:'11px', fontWeight:'500' }}>{k.realisasi ?? '—'}</td>
                        <td style={{ textAlign:'center' }}>
                          {k.status ? <span className={sc[k.status]}>{sl[k.status]}</span> : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Charts */}
        <ExecCharts laporanBumd={laporanBumd} bumdList={bumdList} />
      </div>
    </ProtectedLayout>
  )
}
