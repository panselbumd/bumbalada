'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function getDashboardStats(tahun: number, triwulan: number) {
  const supabase = createClient()

  const [bumdRes, bludRes, laporanRes] = await Promise.all([
    supabase.from('bumd').select('*').eq('aktif', true),
    supabase.from('blud').select('*').eq('aktif', true),
    supabase.from('laporan_kinerja_bumd')
      .select('*, bumd(*)')
      .eq('tahun', tahun)
      .eq('triwulan', triwulan),
  ])

  return {
    bumd:    bumdRes.data    ?? [],
    blud:    bludRes.data    ?? [],
    laporan: laporanRes.data ?? [],
  }
}

export async function getLaporanBumd(tahun: number, triwulan: number) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('laporan_kinerja_bumd')
    .select('*, bumd(*)')
    .eq('tahun', tahun)
    .eq('triwulan', triwulan)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function submitLaporan(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const payload = {
    bumd_id:              formData.get('bumd_id') as string,
    tahun:                Number(formData.get('tahun')),
    triwulan:             Number(formData.get('triwulan')),
    target_pendapatan:    Number(formData.get('target_pendapatan')),
    realisasi_pendapatan: Number(formData.get('realisasi_pendapatan')),
    target_laba:          Number(formData.get('target_laba')),
    realisasi_laba:       Number(formData.get('realisasi_laba')),
    total_aset:           Number(formData.get('total_aset')),
    total_kewajiban:      Number(formData.get('total_kewajiban')),
    dividen:              Number(formData.get('dividen')),
    opini_auditor:        formData.get('opini_auditor') as string,
    catatan:              formData.get('catatan') as string,
    submitted_at:         new Date().toISOString(),
    submitted_by:         user.id,
  }

  const { error } = await supabase
    .from('laporan_kinerja_bumd')
    .upsert(payload, { onConflict: 'bumd_id,tahun,triwulan' })

  if (error) throw error

  await supabase.from('audit_log').insert({
    user_id:   user.id,
    action:    'submit_laporan',
    modul:     'laporan_bumd',
    deskripsi: `Submit laporan BUMD TW${payload.triwulan}/${payload.tahun}`,
  })

  revalidatePath('/executive')
  return { success: true }
}

export async function getKpiData(tahun: number, triwulan: number) {
  const supabase = createClient()
  const { data } = await supabase
    .from('kpi_bumd')
    .select('*, bumd(nama, singkatan)')
    .eq('tahun', tahun)
    .eq('triwulan', triwulan)
  return data ?? []
}
