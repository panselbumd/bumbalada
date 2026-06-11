import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProtectedLayout from '@/components/layout/ProtectedLayout'
import Link from 'next/link'
import { pesertaStatusLabel } from '@/lib/utils'

const MEDAL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' }

export default async function UKKRankingPage({ searchParams }: { searchParams: { seleksi?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: seleksiList } = await supabase
    .from('proses_seleksi')
    .select('id, judul, jabatan, kuota, status, bumd(singkatan), blud(singkatan)')
    .in('status', ['ukk', 'wawancara', 'selesai'])
    .order('created_at', { ascending: false })

  const activeId = searchParams.seleksi ?? seleksiList?.[0]?.id
  const activeSeleksi = seleksiList?.find(s => s.id === activeId)

  const { data: pesertaList } = activeId
    ? await supabase
        .from('peserta_seleksi')
        .select('*')
        .eq('seleksi_id', activeId)
        .order('ranking', { ascending: true, nullsFirst: false })
    : { data: [] }

  const maxNilai = Math.max(...(pesertaList?.map(p => p.nilai_akhir ?? 0) ?? [0]))

  return (
    <ProtectedLayout>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>UKK & Ranking</h1>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Penilaian UKK dan peringkat akhir peserta seleksi</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '12px', alignItems: 'start' }}>
          {/* Seleksi picker */}
          <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '11px', fontWeight: '500', color: '#6b7280' }}>
              SELEKSI AKTIF
            </div>
            {(seleksiList ?? []).length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', fontSize: '11px', color: '#9ca3af' }}>
                Tidak ada seleksi pada tahap UKK
              </div>
            ) : (seleksiList ?? []).map(s => (
              <Link key={s.id} href={`/seleksi/ukk-ranking?seleksi=${s.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '10px 14px', borderBottom: '0.5px solid #f9fafb',
                  background: s.id === activeId ? '#EBF2F9' : '#fff', cursor: 'pointer',
                }}>
                  <div style={{ fontSize: '11px', fontWeight: '500', color: '#1a1a1a' }}>{s.jabatan}</div>
                  <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                    {(s.bumd as any)?.singkatan ?? (s.blud as any)?.singkatan} · Kuota: {s.kuota}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Ranking table */}
          {activeSeleksi ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e5e7eb', padding: '14px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h2 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 2px' }}>{activeSeleksi.jabatan}</h2>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                      Kuota: {activeSeleksi.kuota} · {(activeSeleksi.bumd as any)?.singkatan ?? (activeSeleksi.blud as any)?.singkatan}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <form action="/api/ranking/hitung" method="POST">
                      <input type="hidden" name="seleksi_id" value={activeId} />
                      <button type="submit" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', border: '0.5px solid #e5e7eb', borderRadius: '7px', fontSize: '11px', cursor: 'pointer', background: '#fff' }}>
                        <i className="ti ti-refresh" style={{ fontSize: '13px' }} />Hitung Ulang Ranking
                      </button>
                    </form>
                    <button style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: '7px', fontSize: '11px', cursor: 'pointer' }}>
                      <i className="ti ti-file-export" style={{ fontSize: '13px' }} />Export Ranking
                    </button>
                  </div>
                </div>
              </div>

              {/* Bobot */}
              <div style={{ background: '#EBF2F9', borderRadius: '10px', padding: '12px 16px', display: 'flex', gap: '16px', alignItems: 'center' }}>
                <i className="ti ti-info-circle" style={{ fontSize: '16px', color: '#1E3A5F', flexShrink: 0 }} />
                <div style={{ fontSize: '11px', color: '#1E3A5F' }}>
                  <strong>Bobot Penilaian:</strong> Administrasi 20% + UKK 50% + Wawancara 30%
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '50px', textAlign: 'center' }}>Rank</th>
                        <th>Nama Peserta</th>
                        <th style={{ textAlign: 'center' }}>Adm. (20%)</th>
                        <th style={{ textAlign: 'center' }}>UKK (50%)</th>
                        <th style={{ textAlign: 'center' }}>Wawancara (30%)</th>
                        <th style={{ textAlign: 'center' }}>Nilai Akhir</th>
                        <th style={{ textAlign: 'center', width: '120px' }}>Bar</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(pesertaList ?? []).length === 0 ? (
                        <tr><td colSpan={8} style={{ textAlign: 'center', color: '#9ca3af', padding: '32px' }}>
                          Belum ada data penilaian
                        </td></tr>
                      ) : (pesertaList ?? []).map((p, i) => {
                        const rank = p.ranking ?? (i + 1)
                        const isLolos = rank <= (activeSeleksi.kuota ?? 1)
                        const barWidth = maxNilai > 0 ? ((p.nilai_akhir ?? 0) / maxNilai) * 100 : 0
                        return (
                          <tr key={p.id} style={{ background: isLolos ? '#f0f9f0' : undefined }}>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{ fontSize: '14px' }}>{MEDAL[rank] ?? rank}</span>
                              {isLolos && <div style={{ fontSize: '9px', color: '#27500A', fontWeight: '500' }}>LOLOS</div>}
                            </td>
                            <td>
                              <div style={{ fontSize: '11px', fontWeight: '500' }}>{p.nama_lengkap}</div>
                              <div style={{ fontSize: '10px', color: '#9ca3af' }}>{p.pendidikan}</div>
                            </td>
                            <td style={{ textAlign: 'center', fontSize: '11px' }}>{p.nilai_administrasi ?? '—'}</td>
                            <td style={{ textAlign: 'center', fontSize: '11px', fontWeight: p.nilai_ukk != null ? '500' : '400' }}>
                              {p.nilai_ukk ?? '—'}
                            </td>
                            <td style={{ textAlign: 'center', fontSize: '11px' }}>{p.nilai_wawancara ?? '—'}</td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{
                                fontSize: '13px', fontWeight: '600',
                                color: isLolos ? '#27500A' : '#1E3A5F',
                              }}>
                                {p.nilai_akhir?.toFixed(2) ?? '—'}
                              </span>
                            </td>
                            <td>
                              <div style={{ height: '5px', background: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{
                                  height: '100%', width: `${barWidth}%`,
                                  background: isLolos ? '#639922' : '#185FA5',
                                  borderRadius: '3px', transition: 'width .5s',
                                }} />
                              </div>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span style={{
                                fontSize: '10px', fontWeight: '500', padding: '2px 7px', borderRadius: '20px',
                                background: isLolos ? '#EAF3DE' : '#f1f5f9',
                                color: isLolos ? '#27500A' : '#9ca3af',
                              }}>
                                {pesertaStatusLabel(p.status)}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e5e7eb', padding: '60px', textAlign: 'center' }}>
              <i className="ti ti-trophy" style={{ fontSize: '48px', color: '#e5e7eb', display: 'block', marginBottom: '12px' }} />
              <div style={{ fontSize: '13px', color: '#9ca3af' }}>Pilih seleksi untuk melihat ranking</div>
            </div>
          )}
        </div>
      </div>
    </ProtectedLayout>
  )
}
