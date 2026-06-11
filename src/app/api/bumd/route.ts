import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const tahun    = searchParams.get('tahun')    ?? String(new Date().getFullYear())
  const triwulan = searchParams.get('triwulan') ?? String(Math.ceil((new Date().getMonth() + 1) / 3))

  const [bumdRes, laporanRes] = await Promise.all([
    supabase.from('bumd').select('*').eq('aktif', true),
    supabase.from('laporan_kinerja_bumd')
      .select('*, bumd(*)')
      .eq('tahun', Number(tahun))
      .eq('triwulan', Number(triwulan)),
  ])

  return NextResponse.json({
    bumd:    bumdRes.data    ?? [],
    laporan: laporanRes.data ?? [],
  })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { error } = await supabase
    .from('laporan_kinerja_bumd')
    .upsert({ ...body, submitted_by: user.id, submitted_at: new Date().toISOString() },
      { onConflict: 'bumd_id,tahun,triwulan' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('audit_log').insert({
    user_id:   user.id,
    action:    'submit_laporan',
    modul:     'laporan_bumd',
    deskripsi: `Submit laporan BUMD TW${body.triwulan}/${body.tahun}`,
  })

  return NextResponse.json({ success: true })
}
