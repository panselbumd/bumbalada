import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const tahun    = Number(searchParams.get('tahun')    ?? new Date().getFullYear())
  const triwulan = Number(searchParams.get('triwulan') ?? Math.ceil((new Date().getMonth() + 1) / 3))

  const [bumdCount, bludCount, seleksiCount, laporanRes] = await Promise.all([
    supabase.from('bumd').select('id', { count: 'exact' }).eq('aktif', true),
    supabase.from('blud').select('id', { count: 'exact' }).eq('aktif', true),
    supabase.from('proses_seleksi').select('id', { count: 'exact' }).not('status', 'in', '("selesai","dibatalkan")'),
    supabase.from('laporan_kinerja_bumd')
      .select('realisasi_pendapatan, dividen, level_kesehatan, submitted_at')
      .eq('tahun', tahun)
      .eq('triwulan', triwulan),
  ])

  const laporan = laporanRes.data ?? []
  const totalPAD = laporan.reduce((s, l) => s + (l.dividen ?? 0), 0)

  return NextResponse.json({
    bumd_count:    bumdCount.count   ?? 0,
    blud_count:    bludCount.count   ?? 0,
    seleksi_aktif: seleksiCount.count ?? 0,
    total_pad:     totalPAD,
    laporan_submitted: laporan.filter(l => l.submitted_at).length,
    health_summary: {
      sehat:        laporan.filter(l => l.level_kesehatan === 'sehat').length,
      kurang_sehat: laporan.filter(l => l.level_kesehatan === 'kurang_sehat').length,
      tidak_sehat:  laporan.filter(l => l.level_kesehatan === 'tidak_sehat').length,
    },
    tahun,
    triwulan,
  })
}
