import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  const [bumdRes, bludRes, seleksiRes, logRes] = await Promise.all([
    supabase.from('bumd').select('id', { count: 'exact' }).eq('aktif', true),
    supabase.from('blud').select('id', { count: 'exact' }).eq('aktif', true),
    supabase.from('proses_seleksi')
      .select('id, judul, status, jabatan, bumd(singkatan), blud(singkatan)')
      .not('status', 'in', '("selesai","dibatalkan")')
      .order('created_at', { ascending: false })
      .limit(4),
    supabase.from('audit_log')
      .select('deskripsi, action, created_at, profiles(nama_lengkap)')
      .order('created_at', { ascending: false })
      .limit(6),
  ])

  const bumdCount   = bumdRes.count ?? 0
  const bludCount   = bludRes.count ?? 0
  const seleksiList = seleksiRes.data ?? []
  const logList     = logRes.data ?? []

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 11 ? 'Selamat Pagi' : hour < 15 ? 'Selamat Siang' : hour < 18 ? 'Selamat Sore' : 'Selamat Malam'

  const statusColor: Record<string, string> = {
    draft:               '#9ca3af',
    dibuka:              '#1E3A5F',
    seleksi_administrasi:'#633806',
    ukk:                 '#185FA5',
    wawancara:           '#27500A',
    selesai:             '#27500A',
    dibatalkan:          '#791F1F',
  }
  const statusLabel: Record<string, string> = {
    draft: 'Draft', dibuka: 'Dibuka', seleksi_administrasi: 'Adm.', ukk: 'UKK', wawancara: 'Wawancara', selesai: 'Selesai', dibatalkan: 'Dibatalkan',
  }
  const logIcon: Record<string, string> = {
    login:'ti-login', logout:'ti-logout', create:'ti-plus', update:'ti-edit', delete:'ti-trash', export:'ti-download', submit_laporan:'ti-send', reset_password:'ti-lock-open', change_role:'ti-shield-lock',
  }

  return (
    <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1E3A5F 0%, #185FA5 100%)',
        borderRadius: '12px', padding: '20px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ color: 'rgba(255,255,255,.65)', fontSize: '12px' }}>{greeting},</div>
          <h1 style={{ color: '#fff', fontSize: '18px', fontWeight: '600', margin: '2px 0 4px' }}>
            {profile?.nama_lengkap}
          </h1>
          <div style={{
            display: 'inline-block', fontSize: '10px', fontWeight: '500',
            background: 'rgba(255,255,255,.15)', color: '#fff',
            padding: '2px 10px', borderRadius: '20px',
          }}>
            {profile?.role?.replace(/_/g,' ')}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ color: 'rgba(255,255,255,.5)', fontSize: '10px' }}>
            {now.toLocaleDateString('id-ID', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}
          </div>
          <div style={{ color: '#fff', fontSize: '24px', fontWeight: '300', marginTop: '4px' }}>
            {now.toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })} WIB
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
        {[
          { label: 'BUMD Aktif',     value: bumdCount,    icon: 'ti-building-factory-2', color: '#1E3A5F', bg: '#EBF2F9' },
          { label: 'BLUD Aktif',     value: bludCount,    icon: 'ti-building-hospital',  color: '#27500A', bg: '#EAF3DE' },
          { label: 'Seleksi Aktif',  value: seleksiList.length, icon: 'ti-clipboard-check', color: '#633806', bg: '#FAEEDA' },
          { label: 'Tahun Anggaran', value: now.getFullYear(), icon: 'ti-calendar',      color: '#0C447C', bg: '#EBF2F9' },
        ].map(s => (
          <div key={s.label} style={{
            background: '#fff', borderRadius: '10px',
            border: '0.5px solid #e5e7eb', padding: '14px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '11px', color: '#6b7280' }}>{s.label}</span>
              <div style={{
                width: '28px', height: '28px', borderRadius: '8px',
                background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <i className={`ti ${s.icon}`} style={{ fontSize: '15px', color: s.color }} />
              </div>
            </div>
            <div style={{ fontSize: '26px', fontWeight: '500', color: s.color, marginTop: '6px' }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Quick Links */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '8px' }}>
        {[
          { href:'/executive',         icon:'ti-chart-bar',         label:'Dashboard Eksekutif' },
          { href:'/pendaftaran',        icon:'ti-user-plus',         label:'Portal Pendaftaran' },
          { href:'/seleksi/panitia',    icon:'ti-clipboard-check',   label:'Panitia Seleksi' },
          { href:'/seleksi/ukk-ranking',icon:'ti-trophy',            label:'UKK & Ranking' },
          { href:'/admin/users',        icon:'ti-users',             label:'Manajemen User' },
        ].map(q => (
          <Link key={q.href} href={q.href} style={{ textDecoration: 'none' }}>
            <div style={{
              background: '#fff', borderRadius: '10px',
              border: '0.5px solid #e5e7eb', padding: '14px 10px',
              textAlign: 'center', cursor: 'pointer',
              transition: 'box-shadow .15s',
            }}>
              <i className={`ti ${q.icon}`} style={{ fontSize: '22px', color: '#1E3A5F', display: 'block', marginBottom: '6px' }} />
              <span style={{ fontSize: '11px', color: '#374151', fontWeight: '500' }}>{q.label}</span>
            </div>
          </Link>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        {/* Proses Seleksi Aktif */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '500' }}>Proses Seleksi Aktif</span>
            <Link href="/seleksi/panitia" style={{ fontSize: '11px', color: '#1E3A5F', textDecoration: 'none' }}>Lihat semua →</Link>
          </div>
          <div style={{ padding: '8px 0' }}>
            {seleksiList.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '11px' }}>
                Tidak ada seleksi aktif
              </div>
            ) : seleksiList.map((s: any) => (
              <div key={s.id} style={{
                padding: '10px 16px', borderBottom: '0.5px solid #f9fafb',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', fontWeight: '500', color: '#1a1a1a' }}>{s.jabatan}</div>
                  <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                    {s.bumd?.singkatan ?? s.blud?.singkatan ?? '—'} · {s.judul}
                  </div>
                </div>
                <span style={{
                  fontSize: '10px', fontWeight: '500', padding: '2px 8px', borderRadius: '20px',
                  background: statusColor[s.status] + '20', color: statusColor[s.status],
                }}>
                  {statusLabel[s.status]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Log Aktivitas */}
        <div style={{ background: '#fff', borderRadius: '10px', border: '0.5px solid #e5e7eb', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '0.5px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '12px', fontWeight: '500' }}>Aktivitas Terakhir</span>
            <Link href="/admin/audit" style={{ fontSize: '11px', color: '#1E3A5F', textDecoration: 'none' }}>Lihat semua →</Link>
          </div>
          <div style={{ padding: '4px 0' }}>
            {logList.map((l: any, i: number) => (
              <div key={i} style={{
                padding: '8px 16px', borderBottom: '0.5px solid #f9fafb',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <div style={{
                  width: '26px', height: '26px', borderRadius: '8px',
                  background: '#EBF2F9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <i className={`ti ${logIcon[l.action] ?? 'ti-activity'}`} style={{ fontSize: '13px', color: '#1E3A5F' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '11px', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {l.deskripsi}
                  </div>
                  <div style={{ fontSize: '10px', color: '#9ca3af' }}>
                    {l.profiles?.nama_lengkap} · {formatDate(l.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
