import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProtectedLayout from '@/components/layout/ProtectedLayout'
import { formatDate, pesertaStatusLabel } from '@/lib/utils'
import Link from 'next/link'

const STATUS_COLOR: Record<string, string> = {
  draft: '#9ca3af', dibuka: '#1E3A5F', seleksi_administrasi: '#633806',
  ukk: '#185FA5', wawancara: '#27500A', selesai: '#27500A', dibatalkan: '#791F1F',
}
const STATUS_LABEL: Record<string, string> = {
  draft: 'Draft', dibuka: 'Dibuka', seleksi_administrasi: 'Adm.',
  ukk: 'UKK', wawancara: 'Wawancara', selesai: 'Selesai', dibatalkan: 'Dibatalkan',
}

export default async function PanitiaPage({ searchParams }: { searchParams: { seleksi?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: seleksiList } = await supabase
    .from('proses_seleksi')
    .select('*, bumd(nama, singkatan), blud(nama, singkatan)')
    .order('created_at', { ascending: false })

  const activeSeleksiId = searchParams.seleksi ?? seleksiList?.[0]?.id
  const activeSeleksi = seleksiList?.find(s => s.id === activeSeleksiId)

  const { data: pesertaList } = activeSeleksiId
    ? await supabase
        .from('peserta_seleksi')
        .select('*')
        .eq('seleksi_id', activeSeleksiId)
        .order('registered_at', { ascending: false })
    : { data: [] }

  const counts = {
    total: pesertaList?.length ?? 0,
    lolos_adm: pesertaList?.filter(p => p.status === 'lolos_administrasi').length ?? 0,
    lolos_ukk: pesertaList?.filter(p => p.status === 'lolos_ukk').length ?? 0,
    ditetapkan: pesertaList?.filter(p => p.status === 'ditetapkan').length ?? 0,
  }

  const pesertaStatusColor: Record<string, string> = {
    terdaftar: '#9ca3af', review_dokumen: '#633806',
    lolos_administrasi: '#27500A', tidak_lolos_administrasi: '#791F1F',
    lolos_ukk: '#185FA5', tidak_lolos_ukk: '#791F1F',
    lolos_wawancara: '#27500A', tidak_lolos_wawancara: '#791F1F',
    ditetapkan: '#27500A',
  }

  return (
    <ProtectedLayout>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Panitia Seleksi</h1>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Kelola proses seleksi Direksi BUMD/BLUD</div>
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px', background: '#1E3A5F', color: '#fff',
            border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '500', cursor: 'pointer',
          }}>
            <i className="ti ti-plus" style={{ fontSize: '14px' }} />
            Buat Seleksi Baru
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '12px', alignItems: 'start' }}>
          {/* Seleksi list */}
          <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #f1f5f9', fontSize: '11px', fontWeight: '500', color: '#6b7280' }}>
              DAFTAR SELEKSI
            </div>
            {(seleksiList ?? []).map(s => (
              <Link key={s.id} href={`/seleksi/panitia?seleksi=${s.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '10px 14px', borderBottom: '0.5px solid #f9fafb', cursor: 'pointer',
                  background: s.id === activeSeleksiId ? '#EBF2F9' : '#fff',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '500', color: '#1a1a1a' }}>{s.jabatan}</span>
                    <span style={{
                      fontSize: '10px', fontWeight: '500', padding: '1px 6px', borderRadius: '20px',
                      background: STATUS_COLOR[s.status] + '20', color: STATUS_COLOR[s.status],
                    }}>{STATUS_LABEL[s.status]}</span>
                  </div>
                  <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                    {(s.bumd as any)?.singkatan ?? (s.blud as any)?.singkatan ?? '—'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#9ca3af' }}>Dibuka: {formatDate(s.buka_pendaftaran)}</div>
                </div>
              </Link>
            ))}
          </div>

          {/* Detail seleksi */}
          {activeSeleksi ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Info card */}
              <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e5e7eb', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <h2 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px' }}>{activeSeleksi.jabatan}</h2>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                      {(activeSeleksi.bumd as any)?.nama ?? (activeSeleksi.blud as any)?.nama ?? '—'} · Kode: {activeSeleksi.kode}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '11px', fontWeight: '500', padding: '3px 10px', borderRadius: '20px',
                    background: STATUS_COLOR[activeSeleksi.status] + '20', color: STATUS_COLOR[activeSeleksi.status],
                  }}>{STATUS_LABEL[activeSeleksi.status]}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
                  {[
                    { l:'Total Peserta', v: counts.total },
                    { l:'Lolos Administrasi', v: counts.lolos_adm },
                    { l:'Lolos UKK', v: counts.lolos_ukk },
                    { l:'Ditetapkan', v: counts.ditetapkan },
                  ].map(c => (
                    <div key={c.l} style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: '500', color: '#1E3A5F' }}>{c.v}</div>
                      <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>{c.l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Peserta table */}
              <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: '0.5px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '12px', fontWeight: '500' }}>Daftar Peserta</span>
                  <button style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', border: '0.5px solid #e5e7eb', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', background: '#fff' }}>
                    <i className="ti ti-download" style={{ fontSize: '13px' }} />Export
                  </button>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '30px' }}>#</th>
                        <th>Nama Peserta</th>
                        <th>Pendidikan</th>
                        <th style={{ textAlign: 'center' }}>Pengalaman</th>
                        <th style={{ textAlign: 'center' }}>Adm.</th>
                        <th style={{ textAlign: 'center' }}>UKK</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(pesertaList ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', color: '#9ca3af', padding: '24px' }}>
                            Belum ada peserta terdaftar
                          </td>
                        </tr>
                      ) : (pesertaList ?? []).map((p, i) => (
                        <tr key={p.id}>
                          <td style={{ color: '#9ca3af' }}>{i + 1}</td>
                          <td>
                            <div style={{ fontSize: '11px', fontWeight: '500' }}>{p.nama_lengkap}</div>
                            <div style={{ fontSize: '10px', color: '#9ca3af' }}>{p.email}</div>
                          </td>
                          <td style={{ fontSize: '11px' }}>{p.pendidikan ?? '—'}</td>
                          <td style={{ textAlign: 'center', fontSize: '11px' }}>{p.pengalaman_tahun ?? '—'} thn</td>
                          <td style={{ textAlign: 'center', fontSize: '11px', fontWeight: '500', color: p.nilai_administrasi != null ? '#1E3A5F' : '#9ca3af' }}>
                            {p.nilai_administrasi ?? '—'}
                          </td>
                          <td style={{ textAlign: 'center', fontSize: '11px', fontWeight: '500', color: p.nilai_ukk != null ? '#1E3A5F' : '#9ca3af' }}>
                            {p.nilai_ukk ?? '—'}
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <span style={{
                              fontSize: '10px', fontWeight: '500', padding: '2px 7px', borderRadius: '20px',
                              background: (pesertaStatusColor[p.status] ?? '#9ca3af') + '20',
                              color: pesertaStatusColor[p.status] ?? '#9ca3af',
                            }}>
                              {pesertaStatusLabel(p.status)}
                            </span>
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              <button style={{ padding: '3px 8px', border: '0.5px solid #e5e7eb', borderRadius: '5px', fontSize: '10px', cursor: 'pointer', background: '#fff' }}>
                                <i className="ti ti-eye" style={{ fontSize: '12px' }} />
                              </button>
                              <button style={{ padding: '3px 8px', border: '0.5px solid #e5e7eb', borderRadius: '5px', fontSize: '10px', cursor: 'pointer', background: '#fff' }}>
                                <i className="ti ti-edit" style={{ fontSize: '12px' }} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e5e7eb', padding: '60px', textAlign: 'center' }}>
              <i className="ti ti-clipboard-list" style={{ fontSize: '48px', color: '#e5e7eb', display: 'block', marginBottom: '12px' }} />
              <div style={{ fontSize: '13px', color: '#9ca3af' }}>Pilih proses seleksi dari daftar sebelah kiri</div>
            </div>
          )}
        </div>
      </div>
    </ProtectedLayout>
  )
}
