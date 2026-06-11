import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProtectedLayout from '@/components/layout/ProtectedLayout'
import { formatDate } from '@/lib/utils'

export default async function PendaftaranPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: seleksiTerbuka } = await supabase
    .from('proses_seleksi')
    .select('*, bumd(nama, singkatan), blud(nama, singkatan)')
    .eq('status', 'dibuka')
    .order('tutup_pendaftaran', { ascending: true })

  return (
    <ProtectedLayout>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Hero */}
        <div style={{
          background: 'linear-gradient(135deg, #1E3A5F 0%, #185FA5 100%)',
          borderRadius: '12px', padding: '28px 32px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
            <i className="ti ti-user-plus" style={{ fontSize: '28px', color: '#fff' }} />
            <div>
              <h1 style={{ color: '#fff', fontSize: '18px', fontWeight: '600', margin: 0 }}>
                Portal Pendaftaran Seleksi
              </h1>
              <p style={{ color: 'rgba(255,255,255,.65)', fontSize: '12px', margin: '4px 0 0' }}>
                Seleksi Direksi BUMD/BLUD Pemerintah Kota Batu
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '16px', marginTop: '16px' }}>
            {[
              { icon: 'ti-clipboard-check', label: 'Seleksi Terbuka',  value: seleksiTerbuka?.length ?? 0 },
              { icon: 'ti-calendar-event',  label: 'Tahun',             value: new Date().getFullYear() },
              { icon: 'ti-shield-check',    label: 'Sistem Terverifikasi', value: 'RLS' },
            ].map(s => (
              <div key={s.label} style={{
                background: 'rgba(255,255,255,.12)', borderRadius: '10px',
                padding: '10px 16px', flex: 1, textAlign: 'center',
              }}>
                <i className={`ti ${s.icon}`} style={{ fontSize: '18px', color: '#fff', display: 'block', marginBottom: '4px' }} />
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#fff' }}>{s.value}</div>
                <div style={{ fontSize: '10px', color: 'rgba(255,255,255,.6)' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Seleksi terbuka */}
        <div>
          <h2 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 12px', color: '#1a1a1a' }}>
            Seleksi Sedang Dibuka
          </h2>

          {(seleksiTerbuka ?? []).length === 0 ? (
            <div style={{
              background: '#fff', borderRadius: '12px', border: '0.5px solid #e5e7eb',
              padding: '48px', textAlign: 'center',
            }}>
              <i className="ti ti-calendar-off" style={{ fontSize: '40px', color: '#e5e7eb', display: 'block', marginBottom: '12px' }} />
              <div style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280' }}>
                Tidak ada seleksi yang sedang dibuka
              </div>
              <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                Pantau terus portal ini untuk informasi seleksi berikutnya
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
              {(seleksiTerbuka ?? []).map(s => {
                const tutup = s.tutup_pendaftaran ? new Date(s.tutup_pendaftaran) : null
                const now = new Date()
                const sisa = tutup ? Math.ceil((tutup.getTime() - now.getTime()) / 86400000) : null

                return (
                  <div key={s.id} style={{
                    background: '#fff', borderRadius: '12px',
                    border: '0.5px solid #e5e7eb', overflow: 'hidden',
                  }}>
                    <div style={{ padding: '4px 12px', background: '#1E3A5F', textAlign: 'center' }}>
                      <span style={{ fontSize: '10px', fontWeight: '500', color: '#fff' }}>
                        PENDAFTARAN DIBUKA
                      </span>
                    </div>
                    <div style={{ padding: '16px' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: '600', margin: '0 0 4px', color: '#1a1a1a' }}>
                        {s.jabatan}
                      </h3>
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                        {(s.bumd as any)?.nama ?? (s.blud as any)?.nama ?? '—'}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
                        {[
                          { icon: 'ti-calendar', label: 'Buka', val: formatDate(s.buka_pendaftaran) },
                          { icon: 'ti-calendar-x', label: 'Tutup', val: formatDate(s.tutup_pendaftaran) },
                          { icon: 'ti-users', label: 'Kuota', val: `${s.kuota} posisi` },
                        ].map(r => (
                          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                            <i className={`ti ${r.icon}`} style={{ fontSize: '13px', color: '#1E3A5F', flexShrink: 0 }} />
                            <span style={{ color: '#9ca3af', width: '36px' }}>{r.label}</span>
                            <span style={{ fontWeight: '500', color: '#374151' }}>{r.val}</span>
                          </div>
                        ))}
                      </div>

                      {sisa != null && (
                        <div style={{
                          background: sisa <= 3 ? '#FCEBEB' : sisa <= 7 ? '#FAEEDA' : '#EAF3DE',
                          borderRadius: '8px', padding: '8px 12px',
                          fontSize: '11px', fontWeight: '500',
                          color: sisa <= 3 ? '#791F1F' : sisa <= 7 ? '#633806' : '#27500A',
                          display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px',
                        }}>
                          <i className="ti ti-clock" style={{ fontSize: '13px' }} />
                          {sisa <= 0 ? 'Pendaftaran berakhir hari ini' : `Sisa ${sisa} hari lagi`}
                        </div>
                      )}

                      <button style={{
                        width: '100%', padding: '9px',
                        background: '#1E3A5F', color: '#fff',
                        border: 'none', borderRadius: '8px',
                        fontSize: '12px', fontWeight: '500', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      }}>
                        <i className="ti ti-user-plus" style={{ fontSize: '14px' }} />
                        Daftar Sekarang
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedLayout>
  )
}
