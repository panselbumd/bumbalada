import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProtectedLayout from '@/components/layout/ProtectedLayout'

const ROLES = [
  { key: 'superadmin',       label: 'Superadmin',        desc: 'Akses penuh ke semua modul' },
  { key: 'admin',            label: 'Admin',             desc: 'Kelola user, konfigurasi, laporan' },
  { key: 'panitia_seleksi',  label: 'Panitia Seleksi',  desc: 'Kelola proses seleksi BUMD/BLUD' },
  { key: 'penilai',          label: 'Penilai',           desc: 'Input nilai & rekomendasi peserta' },
  { key: 'viewer_eksekutif', label: 'Viewer Eksekutif',  desc: 'Lihat data & unduh laporan' },
  { key: 'bumd_operator',    label: 'Operator BUMD',     desc: 'Submit laporan kinerja BUMD' },
]

const MODULES = [
  'Dashboard Eksekutif',
  'Manajemen Seleksi',
  'Penilaian & UKK',
  'Portal Pendaftaran',
  'KPI & Target BUMD',
  'Laporan & PAD',
  'Admin & User',
]

// Matrix: [lihat, buat, edit, hapus, ekspor]
const PERMS: Record<string, boolean[][]> = {
  superadmin:       MODULES.map(() => [true, true, true, true, true]),
  admin:            [
    [true, true, true, false, true],
    [true, true, true, false, true],
    [true, true, true, false, true],
    [true, true, true, false, true],
    [true, true, true, false, true],
    [true, true, false, false, true],
    [true, true, true, true, false],
  ],
  panitia_seleksi:  [
    [true, false, false, false, false],
    [true, true, true, false, true],
    [true, false, true, false, false],
    [true, true, true, false, false],
    [false, false, false, false, false],
    [true, false, false, false, true],
    [false, false, false, false, false],
  ],
  penilai:          [
    [true, false, false, false, false],
    [true, false, false, false, false],
    [true, true, true, false, true],
    [false, false, false, false, false],
    [false, false, false, false, false],
    [false, false, false, false, false],
    [false, false, false, false, false],
  ],
  viewer_eksekutif: [
    [true, false, false, false, true],
    [false, false, false, false, false],
    [false, false, false, false, false],
    [false, false, false, false, false],
    [true, false, false, false, false],
    [true, false, false, false, true],
    [false, false, false, false, false],
  ],
  bumd_operator:    [
    [true, false, false, false, false],
    [false, false, false, false, false],
    [false, false, false, false, false],
    [false, false, false, false, false],
    [true, true, true, false, false],
    [true, true, false, false, true],
    [false, false, false, false, false],
  ],
}

const ROLE_BADGE: Record<string, { bg: string; text: string }> = {
  superadmin:       { bg: '#1E3A5F', text: '#fff' },
  admin:            { bg: '#EBF2F9', text: '#0C447C' },
  panitia_seleksi:  { bg: '#FAEEDA', text: '#633806' },
  penilai:          { bg: '#EAF3DE', text: '#27500A' },
  viewer_eksekutif: { bg: '#f1f5f9', text: '#6b7280' },
  bumd_operator:    { bg: '#EEEDFE', text: '#3C3489' },
}

const PERM_LABELS = ['Lihat', 'Buat', 'Edit', 'Hapus', 'Ekspor']

export default async function RolesPage({
  searchParams,
}: {
  searchParams: { role?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: meRaw } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  const me = meRaw as { role: string } | null
  if (!me || !['superadmin', 'admin'].includes(me.role)) redirect('/dashboard')

  // Count users per role
  const { data: allUsersRaw } = await supabase.from('profiles').select('role, status')
  const allUsers = allUsersRaw as Array<{ role: string; status: string }> | null
  const roleCounts: Record<string, number> = {}
  ROLES.forEach(r => {
    roleCounts[r.key] = allUsers?.filter(u => u.role === r.key).length ?? 0
  })

  const activeRole = searchParams.role ?? 'superadmin'
  const perms = PERMS[activeRole] ?? PERMS.superadmin

  return (
    <ProtectedLayout>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Role & Hak Akses</h1>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
              Konfigurasi izin akses per role pengguna
            </div>
          </div>
          {me.role === 'superadmin' && (
            <button style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '7px 14px', background: '#1E3A5F', color: '#fff',
              border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '500', cursor: 'pointer',
            }}>
              <i className="ti ti-plus" aria-hidden />Buat Role Kustom
            </button>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '12px', alignItems: 'start' }}>
          {/* Role list */}
          <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{
              padding: '10px 14px', borderBottom: '0.5px solid #f1f5f9',
              fontSize: '11px', fontWeight: '500', color: '#6b7280',
            }}>
              DAFTAR ROLE
            </div>
            {ROLES.map(r => {
              const badge = ROLE_BADGE[r.key]
              const isActive = activeRole === r.key
              return (
                <a
                  key={r.key}
                  href={`/admin/roles?role=${r.key}`}
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    padding: '10px 14px', borderBottom: '0.5px solid #f9fafb',
                    background: isActive ? '#EBF2F9' : '#fff', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                        <span style={{
                          fontSize: '10px', fontWeight: '500',
                          padding: '2px 8px', borderRadius: '20px',
                          background: badge.bg, color: badge.text,
                        }}>
                          {r.label}
                        </span>
                      </div>
                      <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                        {roleCounts[r.key]} pengguna
                      </div>
                      <div style={{ fontSize: '10px', color: '#9ca3af' }}>{r.desc}</div>
                    </div>
                    <i
                      className="ti ti-chevron-right"
                      style={{ fontSize: '14px', color: isActive ? '#1E3A5F' : '#d1d5db' }}
                      aria-hidden
                    />
                  </div>
                </a>
              )
            })}
          </div>

          {/* Permission matrix */}
          <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
            <div style={{
              padding: '12px 16px', borderBottom: '0.5px solid #f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600' }}>
                  {ROLES.find(r => r.key === activeRole)?.label}
                </div>
                <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                  {ROLES.find(r => r.key === activeRole)?.desc}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{
                  fontSize: '10px', fontWeight: '500',
                  padding: '2px 8px', borderRadius: '20px',
                  background: ROLE_BADGE[activeRole]?.bg,
                  color: ROLE_BADGE[activeRole]?.text,
                }}>
                  {ROLES.find(r => r.key === activeRole)?.label}
                </span>
                {me.role === 'superadmin' && activeRole !== 'superadmin' && (
                  <button style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '5px 10px', border: '0.5px solid #e5e7eb',
                    borderRadius: '7px', fontSize: '10px', cursor: 'pointer', background: '#fff',
                  }}>
                    <i className="ti ti-edit" style={{ fontSize: '12px' }} aria-hidden />
                    Edit Izin
                  </button>
                )}
              </div>
            </div>

            <div style={{ padding: '16px' }}>
              {/* Header kolom */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr repeat(5, 60px)',
                gap: '4px',
                marginBottom: '8px',
                paddingBottom: '8px',
                borderBottom: '0.5px solid #f1f5f9',
              }}>
                <div style={{ fontSize: '10px', color: '#9ca3af' }}>Modul</div>
                {PERM_LABELS.map(l => (
                  <div key={l} style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center' }}>{l}</div>
                ))}
              </div>

              {/* Matrix rows */}
              {MODULES.map((mod, mi) => (
                <div
                  key={mod}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr repeat(5, 60px)',
                    gap: '4px',
                    padding: '7px 0',
                    borderBottom: mi < MODULES.length - 1 ? '0.5px solid #f9fafb' : 'none',
                    alignItems: 'center',
                  }}
                >
                  <div style={{ fontSize: '12px', color: '#374151' }}>{mod}</div>
                  {(perms[mi] ?? [false, false, false, false, false]).map((allowed, pi) => (
                    <div key={pi} style={{ display: 'flex', justifyContent: 'center' }}>
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '6px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: allowed ? '#EAF3DE' : '#f9fafb',
                        border: `0.5px solid ${allowed ? '#C0DD97' : '#e5e7eb'}`,
                        cursor: me.role === 'superadmin' && activeRole !== 'superadmin' ? 'pointer' : 'default',
                      }}>
                        {allowed ? (
                          <i className="ti ti-check" style={{ fontSize: '12px', color: '#27500A' }} aria-hidden />
                        ) : (
                          <i className="ti ti-minus" style={{ fontSize: '12px', color: '#d1d5db' }} aria-hidden />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div style={{
              padding: '12px 16px', borderTop: '0.5px solid #f1f5f9',
              display: 'flex', gap: '16px', alignItems: 'center',
            }}>
              <div style={{ fontSize: '10px', color: '#9ca3af' }}>Keterangan:</div>
              {[
                { bg: '#EAF3DE', border: '#C0DD97', icon: 'ti-check', c: '#27500A', label: 'Diizinkan' },
                { bg: '#f9fafb', border: '#e5e7eb', icon: 'ti-minus', c: '#d1d5db', label: 'Tidak Diizinkan' },
              ].map(lg => (
                <div key={lg.label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: '20px', height: '20px', borderRadius: '5px',
                    background: lg.bg, border: `0.5px solid ${lg.border}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <i className={`ti ${lg.icon}`} style={{ fontSize: '11px', color: lg.c }} aria-hidden />
                  </div>
                  <span style={{ fontSize: '10px', color: '#6b7280' }}>{lg.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Info box */}
        {activeRole === 'superadmin' && (
          <div style={{
            background: '#EBF2F9', border: '0.5px solid #B5D4F4',
            borderRadius: '10px', padding: '12px 16px',
            display: 'flex', gap: '10px', alignItems: 'flex-start',
          }}>
            <i className="ti ti-shield-check" style={{ fontSize: '16px', color: '#1E3A5F', flexShrink: 0, marginTop: '1px' }} aria-hidden />
            <div style={{ fontSize: '11px', color: '#0C447C' }}>
              <strong>Superadmin</strong> memiliki akses penuh ke seluruh sistem dan tidak dapat dikurangi izinnya.
              Pastikan hanya personel terpercaya yang mendapatkan role ini.
              Saat ini terdapat <strong>{roleCounts.superadmin} akun</strong> dengan role Superadmin.
            </div>
          </div>
        )}
      </div>
    </ProtectedLayout>
  )
}
