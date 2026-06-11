'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { PesertaStatus } from '@/types/database'

export async function getProsesSeleksi() {
  const supabase = createClient()
  const { data } = await supabase
    .from('proses_seleksi')
    .select('*, bumd(nama, singkatan), blud(nama, singkatan)')
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function getPesertaBySeleksi(seleksiId: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('peserta_seleksi')
    .select('*')
    .eq('seleksi_id', seleksiId)
    .order('ranking', { ascending: true, nullsFirst: false })
  return data ?? []
}

export async function updateStatusPeserta(pesertaId: string, status: PesertaStatus) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { error } = await supabase
    .from('peserta_seleksi')
    .update({ status })
    .eq('id', pesertaId)

  if (error) throw error

  await supabase.from('audit_log').insert({
    user_id:   user.id,
    action:    'update',
    modul:     'seleksi',
    deskripsi: `Update status peserta ${pesertaId} → ${status}`,
  })

  revalidatePath('/seleksi/panitia')
}

export async function inputNilaiUKK(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const pesertaId = formData.get('peserta_id') as string
  const payload = {
    peserta_id:              pesertaId,
    penilai_id:              user.id,
    nilai_kompetensi_teknis: Number(formData.get('kompetensi_teknis')),
    nilai_kepemimpinan:      Number(formData.get('kepemimpinan')),
    nilai_manajemen:         Number(formData.get('manajemen')),
    nilai_integritas:        Number(formData.get('integritas')),
    nilai_inovasi:           Number(formData.get('inovasi')),
    rekomendasi:             formData.get('rekomendasi') as string,
  }

  const { error } = await supabase
    .from('penilaian_ukk')
    .upsert(payload, { onConflict: 'peserta_id,penilai_id' })

  if (error) throw error

  // Hitung nilai rata-rata dari semua penilai
  const { data: allNilai } = await supabase
    .from('penilaian_ukk')
    .select('nilai_total')
    .eq('peserta_id', pesertaId)

  if (allNilai && allNilai.length > 0) {
    const avg = allNilai.reduce((s, n) => s + (n.nilai_total ?? 0), 0) / allNilai.length
    await supabase
      .from('peserta_seleksi')
      .update({ nilai_ukk: Math.round(avg * 100) / 100 })
      .eq('id', pesertaId)
  }

  revalidatePath('/seleksi/ukk-ranking')
  return { success: true }
}

export async function hitungRanking(seleksiId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  // Ambil semua peserta lolos UKK
  const { data: peserta } = await supabase
    .from('peserta_seleksi')
    .select('id, nilai_administrasi, nilai_ukk, nilai_wawancara')
    .eq('seleksi_id', seleksiId)
    .not('nilai_ukk', 'is', null)

  if (!peserta) return

  // Hitung nilai akhir & ranking
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

  // Update ranking ke DB
  for (let i = 0; i < ranked.length; i++) {
    await supabase
      .from('peserta_seleksi')
      .update({ nilai_akhir: ranked[i].nilai_akhir, ranking: i + 1 })
      .eq('id', ranked[i].id)
  }

  await supabase.from('audit_log').insert({
    user_id:   user.id,
    action:    'update',
    modul:     'seleksi',
    deskripsi: `Hitung ulang ranking seleksi ${seleksiId}`,
  })

  revalidatePath('/seleksi/ukk-ranking')
}
