import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProtectedLayout from '@/components/layout/ProtectedLayout'
import { formatDateTime, roleName } from '@/lib/utils'

export default async function SessionsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!me || !['superadmin', 'admin'].includes(me.role)) redirect('/dashboard')

  const { data: sessions } = await supabase
    .from('sesi_aktif')
    .select('*, profiles(nama_lengkap, email, role)')
    .order('last_active', { ascending: false })

  const activeSessions = sessions ?? []
  const uniqueUsers = new Set(activeSessions.map(s => s.user_id)).size

  return (
    <ProtectedLayout>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Sesi Aktif</h1>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
              Monitor perangkat yang sedang login ke sistem
            </div>
          </div>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px', background: '#FCEBEB', color: '#791F1F',
            border: '0.5px solid #F7C1C1', borderRadius: '8px',
            fontSize: '11px', fontWeight: '500', cursor: 'pointer',
          }}>
            <i className="ti ti-logout" aria-hidden />Hentikan Semua Sesi
          </button>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {[
            { l: 'Total Sesi Aktif', v: activeSessions.length, icon: 'ti-device-desktop', color: '#1E3A5F' },
            { l: 'User Unik Online', v: uniqueUsers, icon: 'ti-users', color: '#27500A' },
            { l: 'Sesi > 8 jam',    v: activeSessions.filter(s => {
              const diff = Date.now() - new Date(s.last_active).getTime()
              return diff > 8 * 60 * 60 * 1000
            }).length, icon: 'ti-clock-x', color: '#633806' },
          ].map(s => (
            <div key={s.l} style={{
              background: '#fff', borderRadius: '10px',
              border: '0.5px solid #e5e7eb', padding: '12px 16px',
              display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: s.color + '18',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <i className={`ti ${s.icon}`} style={{ fontSize: '18px', color: s.color }} aria-hidden />
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: '500', color: s.color }}>{s.v}</div>
                <div style={{ fontSize: '11px', color: '#9ca3af' }}>{s.l}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Warning jika ada sesi lama */}
        {activeSessions.some(s => {
          const diff = Date.now() - new Date(s.last_active).getTime()
          return diff > 8 * 60 * 60 * 1000
        }) && (
          <div style={{
            background: '#FAEEDA', border: '0.5px solid #FAC775',
            borderRadius: '10px', padding: '12px 16px',
            display: 'flex', gap: '10px', alignItems: 'center',
            fontSize: '11px', color: '#633806',
          }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: '16px', flexShrink: 0 }} aria-hidden />
            <span>
              Terdapat sesi yang tidak aktif lebih dari 8 jam.
              Sesi ini akan dihentikan otomatis pada siklus berikutnya.
            </span>
          </div>
        )}

        {/* Sessions list */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{
            padding: '10px 16px', borderBottom: '0.5px solid #f1f5f9',
            fontSize: '12px', fontWeight: '500',
          }}>
            Daftar Sesi ({activeSessions.length})
          </div>
          <div style={{ padding: '4px 0' }}>
            {activeSessions.length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
                <i className="ti ti-device-desktop-off" style={{ fontSize: '36px', display: 'block', marginBottom: '10px', color: '#e5e7eb' }} aria-hidden />
                Tidak ada sesi aktif
              </div>
            ) : activeSessions.map(s => {
              const profile = s.profiles as any
              const isCurrentUser = s.user_id === user.id
              const lastActive = new Date(s.last_active)
              const diffMs = Date.now() - lastActive.getTime()
              const diffMin = Math.floor(diffMs / 60000)
              const isStale = diffMs > 8 * 60 * 60 * 1000

              const activeLabel = diffMin < 1
                ? 'Baru saja'
                : diffMin < 60
                ? `${diffMin} menit lalu`
                : `${Math.floor(diffMin / 60)} jam lalu`

              // Detect device icon from user agent
              const ua = (s.user_agent ?? '').toLowerCase()
              const deviceIcon = ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')
                ? 'ti-device-mobile'
                : ua.includes('tablet') || ua.includes('ipad')
                ? 'ti-device-tablet'
                : 'ti-device-laptop'

              return (
                <div key={s.id} style={{
                  padding: '12px 16px',
                  borderBottom: '0.5px solid #f9fafb',
                  display: 'flex', alignItems: 'center', gap: '14px',
                  background: isCurrentUser ? '#fafeff' : '#fff',
                }}>
                  {/* Device icon */}
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '10px',
                    background: isCurrentUser ? '#EBF2F9' : '#f9fafb',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <i className={`ti ${deviceIcon}`} style={{ fontSize: '18px', color: isCurrentUser ? '#1E3A5F' : '#9ca3af' }} aria-hidden />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '500', color: '#1a1a1a' }}>
                        {profile?.nama_lengkap ?? 'Unknown'}
                      </span>
                      {isCurrentUser && (
                        <span style={{
                          fontSize: '10px', fontWeight: '500',
                          padding: '1px 7px', borderRadius: '20px',
                          background: '#EAF3DE', color: '#27500A',
                        }}>Sesi Ini</span>
                      )}
                      {isStale && (
                        <span style={{
                          fontSize: '10px', fontWeight: '500',
                          padding: '1px 7px', borderRadius: '20px',
                          background: '#FAEEDA', color: '#633806',
                        }}>Idle</span>
                      )}
                    </div>
                    <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                      {profile?.email} ·{' '}
                      <span style={{
                        background: '#f1f5f9', padding: '1px 6px',
                        borderRadius: '10px', fontSize: '10px',
                      }}>
                        {roleName(profile?.role ?? '')}
                      </span>
                    </div>
                    <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                      <i className="ti ti-map-pin" style={{ fontSize: '11px', marginRight: '3px' }} aria-hidden />
                      {s.ip_address ?? 'IP tidak diketahui'} · Aktif: {activeLabel}
                    </div>
                    <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '1px' }}>
                      Login: {formatDateTime(s.created_at)}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    {!isCurrentUser && (
                      <button style={{
                        display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '5px 10px', border: '0.5px solid #F7C1C1',
                        borderRadius: '7px', fontSize: '10px', cursor: 'pointer',
                        background: '#FCEBEB', color: '#791F1F', fontWeight: '500',
                      }}>
                        <i className="ti ti-logout" style={{ fontSize: '12px' }} aria-hidden />
                        Hentikan
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Security settings */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{
            padding: '10px 16px', borderBottom: '0.5px solid #f1f5f9',
            fontSize: '12px', fontWeight: '500',
          }}>
            Pengaturan Keamanan Sesi
          </div>
          <div style={{ padding: '4px 0' }}>
            {[
              {
                l: 'Batas waktu sesi idle',
                sub: 'Sesi otomatis berakhir setelah tidak aktif',
                type: 'select',
                opts: ['30 menit', '1 jam', '2 jam', '8 jam'],
                val: '1 jam',
              },
            ].map(item => (
              <div key={item.l} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderBottom: '0.5px solid #f9fafb',
              }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '500' }}>{item.l}</div>
                  <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>{item.sub}</div>
                </div>
                <select
                  defaultValue={item.val}
                  style={{
                    fontSize: '11px', padding: '5px 10px',
                    border: '0.5px solid #e5e7eb', borderRadius: '7px', background: '#fff',
                  }}
                >
                  {item.opts.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            ))}

            {[
              { l: 'Verifikasi dua langkah (2FA)', sub: 'Wajib bagi role Superadmin & Admin', on: true },
              { l: 'Login satu perangkat per user', sub: 'Sesi lain otomatis dihentikan saat login baru', on: true },
              { l: 'Notifikasi login mencurigakan', sub: 'Kirim email saat login dari IP baru', on: false },
            ].map(toggle => (
              <div key={toggle.l} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 16px', borderBottom: '0.5px solid #f9fafb',
              }}>
                <div>
                  <div style={{ fontSize: '12px', fontWeight: '500' }}>{toggle.l}</div>
                  <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>{toggle.sub}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{
                    width: '34px', height: '18px', borderRadius: '20px', cursor: 'pointer',
                    background: toggle.on ? '#27AE60' : '#e5e7eb',
                    position: 'relative', transition: 'background .2s',
                  }}>
                    <div style={{
                      position: 'absolute', top: '2px',
                      right: toggle.on ? '2px' : undefined,
                      left: toggle.on ? undefined : '2px',
                      width: '14px', height: '14px',
                      borderRadius: '50%', background: '#fff',
                      transition: 'all .2s',
                    }} />
                  </div>
                  <span style={{ fontSize: '10px', color: '#9ca3af' }}>
                    {toggle.on ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ProtectedLayout>
  )
}
