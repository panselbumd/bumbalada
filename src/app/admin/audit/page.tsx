import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProtectedLayout from '@/components/layout/ProtectedLayout'
import { formatDateTime } from '@/lib/utils'

const ACTION_ICON: Record<string, { icon: string; bg: string; color: string }> = {
  login:           { icon: 'ti-login',         bg: '#EBF2F9', color: '#1E3A5F' },
  logout:          { icon: 'ti-logout',         bg: '#f1f5f9', color: '#6b7280' },
  create:          { icon: 'ti-plus',           bg: '#EAF3DE', color: '#27500A' },
  update:          { icon: 'ti-edit',           bg: '#FAEEDA', color: '#633806' },
  delete:          { icon: 'ti-trash',          bg: '#FCEBEB', color: '#791F1F' },
  export:          { icon: 'ti-download',       bg: '#EEEDFE', color: '#3C3489' },
  submit_laporan:  { icon: 'ti-send',           bg: '#EAF3DE', color: '#27500A' },
  reset_password:  { icon: 'ti-lock-open',      bg: '#FAEEDA', color: '#633806' },
  change_role:     { icon: 'ti-shield-lock',    bg: '#EBF2F9', color: '#0C447C' },
}

export default async function AuditPage({ searchParams }: { searchParams: { action?: string; limit?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: me } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!me || !['superadmin','admin'].includes(me.role)) redirect('/dashboard')

  const limit = Number(searchParams.limit ?? 50)
  let query = supabase
    .from('audit_log')
    .select('*, profiles(nama_lengkap, role)')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (searchParams.action) {
    query = query.eq('action', searchParams.action)
  }

  const { data: logs } = await query

  return (
    <ProtectedLayout>
      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontSize: '16px', fontWeight: '600', margin: 0 }}>Log Aktivitas</h1>
            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>Rekam jejak aksi seluruh pengguna sistem</div>
          </div>
          <button style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', border: '0.5px solid #e5e7eb', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', background: '#fff' }}>
            <i className="ti ti-download" style={{ fontSize: '13px' }} />Export Log
          </button>
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['semua','login','logout','create','update','delete','export','submit_laporan'].map(a => (
            <a key={a} href={`/admin/audit${a !== 'semua' ? `?action=${a}` : ''}`} style={{ textDecoration: 'none' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: '4px',
                fontSize: '11px', fontWeight: '500', padding: '4px 10px', borderRadius: '20px',
                cursor: 'pointer',
                background: (searchParams.action ?? 'semua') === a ? '#1E3A5F' : '#fff',
                color:      (searchParams.action ?? 'semua') === a ? '#fff' : '#6b7280',
                border:     `0.5px solid ${(searchParams.action ?? 'semua') === a ? '#1E3A5F' : '#e5e7eb'}`,
              }}>
                {a !== 'semua' && (
                  <i className={`ti ${ACTION_ICON[a]?.icon ?? 'ti-activity'}`} style={{ fontSize: '12px' }} />
                )}
                {a === 'semua' ? 'Semua' : a.replace('_',' ')}
              </span>
            </a>
          ))}
        </div>

        <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', borderBottom: '0.5px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', fontWeight: '500' }}>Riwayat Aktivitas ({logs?.length ?? 0})</span>
            <select
              style={{ fontSize: '11px', padding: '4px 8px', border: '0.5px solid #e5e7eb', borderRadius: '6px', background: '#fff' }}
              defaultValue={limit}
              onChange={e => window.location.href = `/admin/audit?limit=${e.target.value}`}
            >
              {[25, 50, 100, 200].map(n => <option key={n} value={n}>Tampilkan {n}</option>)}
            </select>
          </div>
          <div style={{ padding: '8px 0' }}>
            {(logs ?? []).map((l: any) => {
              const cfg = ACTION_ICON[l.action] ?? { icon: 'ti-activity', bg: '#f1f5f9', color: '#6b7280' }
              return (
                <div key={l.id} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  padding: '10px 16px', borderBottom: '0.5px solid #f9fafb',
                }}>
                  <div style={{
                    width: '30px', height: '30px', borderRadius: '8px', flexShrink: 0,
                    background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <i className={`ti ${cfg.icon}`} style={{ fontSize: '14px', color: cfg.color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a1a1a' }}>{l.deskripsi}</div>
                    <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                      {l.profiles?.nama_lengkap ?? 'System'} ·{' '}
                      <span style={{
                        background: cfg.bg, color: cfg.color,
                        padding: '1px 6px', borderRadius: '10px', fontSize: '10px',
                      }}>{l.action}</span>
                      {l.modul && ` · ${l.modul}`}
                    </div>
                  </div>
                  <div style={{ fontSize: '10px', color: '#9ca3af', flexShrink: 0, paddingTop: '2px' }}>
                    {formatDateTime(l.created_at)}
                  </div>
                </div>
              )
            })}
            {(logs ?? []).length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '12px' }}>
                Tidak ada log ditemukan
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedLayout>
  )
}
