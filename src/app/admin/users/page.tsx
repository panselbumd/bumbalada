import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProtectedLayout from '@/components/layout/ProtectedLayout'
import { formatDateTime, roleName } from '@/lib/utils'

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  aktif:    { bg: '#EAF3DE', text: '#27500A', label: 'Aktif' },
  nonaktif: { bg: '#FCEBEB', text: '#791F1F', label: 'Nonaktif' },
  pending:  { bg: '#FAEEDA', text: '#633806', label: 'Pending' },
}
const ROLE_CONFIG: Record<string, { bg: string; text: string }> = {
  superadmin:       { bg: '#1E3A5F', text: '#fff' },
  admin:            { bg: '#EBF2F9', text: '#0C447C' },
  panitia_seleksi:  { bg: '#FAEEDA', text: '#633806' },
  penilai:          { bg: '#EAF3DE', text: '#27500A' },
  viewer_eksekutif: { bg: '#f1f5f9', text: '#6b7280' },
  bumd_operator:    { bg: '#EEEDFE', text: '#3C3489' },
}

export default async function AdminUsersPage({ searchParams }: { searchParams: { role?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: meRaw } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const me = meRaw as { role: string } | null
  if (!me || !['superadmin','admin'].includes(me.role)) redirect('/dashboard')

  let query = supabase.from('profiles').select('*').order('created_at', { ascending: false })
  if (searchParams.role && searchParams.role !== 'semua') {
    query = query.eq('role', searchParams.role)
  }
  const { data: users } = await query

  const counts = {
    total:    users?.length ?? 0,
    aktif:    users?.filter(u => u.status === 'aktif').length ?? 0,
    nonaktif: users?.filter(u => u.status === 'nonaktif').length ?? 0,
    pending:  users?.filter(u => u.status === 'pending').length ?? 0,
  }

  return (
    <ProtectedLayout>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Manajemen User</h1>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Kelola akun pengguna SIMBUMD</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', border: '0.5px solid #e5e7eb', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', background: '#fff' }}>
              <i className="ti ti-upload" style={{ fontSize: '13px' }} />Import Excel
            </button>
            <button style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 14px', background: '#1E3A5F', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: '500', cursor: 'pointer' }}>
              <i className="ti ti-plus" style={{ fontSize: '13px' }} />Tambah User
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
          {[
            { l:'Total User', v: counts.total, c:'#1E3A5F' },
            { l:'Aktif', v: counts.aktif, c:'#27500A' },
            { l:'Nonaktif', v: counts.nonaktif, c:'#791F1F' },
            { l:'Pending', v: counts.pending, c:'#633806' },
          ].map(s => (
            <div key={s.l} style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e5e7eb', padding: '12px 14px' }}>
              <div style={{ fontSize: '11px', color: '#9ca3af' }}>{s.l}</div>
              <div style={{ fontSize: '22px', fontWeight: '500', color: s.c, marginTop: '3px' }}>{s.v}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['semua','superadmin','admin','panitia_seleksi','penilai','viewer_eksekutif','bumd_operator'].map(r => (
            <a key={r} href={`/admin/users${r !== 'semua' ? `?role=${r}` : ''}`} style={{ textDecoration: 'none' }}>
              <span style={{
                display: 'inline-block', fontSize: '11px', fontWeight: '500',
                padding: '4px 12px', borderRadius: '20px', cursor: 'pointer',
                background: (searchParams.role ?? 'semua') === r ? '#1E3A5F' : '#fff',
                color:      (searchParams.role ?? 'semua') === r ? '#fff' : '#6b7280',
                border:     `0.5px solid ${(searchParams.role ?? 'semua') === r ? '#1E3A5F' : '#e5e7eb'}`,
              }}>
                {r === 'semua' ? 'Semua' : roleName(r)}
              </span>
            </a>
          ))}
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: '30px' }}><input type="checkbox" style={{ width: '12px', height: '12px' }} /></th>
                  <th>Nama / Email</th>
                  <th>NIP</th>
                  <th>Role</th>
                  <th>Unit Kerja</th>
                  <th>Login Terakhir</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {(users ?? []).map(u => {
                  const roleConf = ROLE_CONFIG[u.role] ?? { bg: '#f1f5f9', text: '#6b7280' }
                  const statConf = STATUS_CONFIG[u.status] ?? STATUS_CONFIG.pending
                  const initials = u.nama_lengkap?.split(' ').slice(0,2).map((n: string) => n[0]).join('').toUpperCase()

                  return (
                    <tr key={u.id}>
                      <td><input type="checkbox" style={{ width: '12px', height: '12px' }} /></td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '28px', height: '28px', borderRadius: '50%',
                            background: '#EBF2F9', color: '#1E3A5F',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '10px', fontWeight: '600', flexShrink: 0,
                          }}>{initials}</div>
                          <div>
                            <div style={{ fontSize: '11px', fontWeight: '500' }}>{u.nama_lengkap}</div>
                            <div style={{ fontSize: '10px', color: '#9ca3af' }}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ fontSize: '11px', color: '#9ca3af' }}>{u.nip ?? '—'}</td>
                      <td>
                        <span style={{
                          fontSize: '10px', fontWeight: '500', padding: '2px 8px', borderRadius: '20px',
                          background: roleConf.bg, color: roleConf.text,
                        }}>
                          {roleName(u.role)}
                        </span>
                      </td>
                      <td style={{ fontSize: '11px', color: '#6b7280' }}>{u.unit_kerja ?? '—'}</td>
                      <td style={{ fontSize: '10px', color: '#9ca3af' }}>{formatDateTime(u.last_login_at)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          fontSize: '10px', fontWeight: '500', padding: '2px 8px', borderRadius: '20px',
                          background: statConf.bg, color: statConf.text,
                        }}>
                          {statConf.label}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {[
                            { icon: 'ti-edit',      title: 'Edit' },
                            { icon: 'ti-lock-open', title: 'Reset sandi' },
                            { icon: 'ti-ban',       title: 'Nonaktifkan' },
                          ].map(a => (
                            <button key={a.icon} title={a.title} style={{
                              padding: '3px 7px', border: '0.5px solid #e5e7eb',
                              borderRadius: '5px', fontSize: '10px', cursor: 'pointer', background: '#fff',
                            }}>
                              <i className={`ti ${a.icon}`} style={{ fontSize: '12px' }} />
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ProtectedLayout>
  )
}
