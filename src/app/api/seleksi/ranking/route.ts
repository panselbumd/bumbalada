import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const seleksiId = body.seleksi_id

  if (!seleksiId) {
    return NextResponse.json({ error: 'seleksi_id diperlukan' }, { status: 400 })
  }

  const { data: peserta } = await supabase
    .from('peserta_seleksi')
    .select('id, nilai_administrasi, nilai_ukk, nilai_wawancara')
    .eq('seleksi_id', seleksiId)
    .not('nilai_ukk', 'is', null)

  if (!peserta || peserta.length === 0) {
    return NextResponse.json({ error: 'Tidak ada peserta dengan nilai UKK' }, { status: 400 })
  }

  const ranked = peserta
    .map(p => ({
      ...p,
      nilai_akhir: Math.round(
        ((p.nilai_administrasi ?? 0) * 0.20 +
         (p.nilai_ukk ?? 0)         * 0.50 +
         (p.nilai_wawancara ?? 0)   * 0.30) * 100
      ) / 100,
    }))
    .sort((a, b) => b.nilai_akhir - a.nilai_akhir)

  for (let i = 0; i < ranked.length; i++) {
    await supabase
      .from('peserta_seleksi')
      .update({ nilai_akhir: ranked[i].nilai_akhir, ranking: i + 1 })
      .eq('id', ranked[i].id)
  }

  await supabase.from('audit_log').insert({
    user_id: user.id, action: 'update', modul: 'seleksi',
    deskripsi: `Hitung ulang ranking seleksi ${seleksiId} (${ranked.length} peserta)`,
  })

  return NextResponse.json({ success: true, count: ranked.length, data: ranked })
}
