'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logout } from '@/lib/actions/auth'
import { Profile } from '@/types/database'
import { cn } from '@/lib/utils'

const NAV = [
  {
    label: 'Utama',
    items: [
      { href: '/dashboard',   icon: 'ti-layout-dashboard', label: 'Dashboard' },
      { href: '/executive',   icon: 'ti-chart-bar',        label: 'Eksekutif' },
    ],
  },
  {
    label: 'Seleksi BUMD',
    items: [
      { href: '/pendaftaran',       icon: 'ti-user-plus',      label: 'Pendaftaran' },
      { href: '/seleksi/panitia',   icon: 'ti-clipboard-check',label: 'Panitia Seleksi' },
      { href: '/seleksi/ukk-ranking', icon: 'ti-trophy',       label: 'UKK & Ranking' },
    ],
  },
  {
    label: 'Admin',
    roles: ['superadmin', 'admin'],
    items: [
      { href: '/admin/users',    icon: 'ti-users',        label: 'Manajemen User' },
      { href: '/admin/roles',    icon: 'ti-shield-lock',  label: 'Hak Akses' },
      { href: '/admin/audit',    icon: 'ti-clipboard-list', label: 'Log Aktivitas' },
      { href: '/admin/sessions', icon: 'ti-device-desktop', label: 'Sesi Aktif' },
      { href: '/admin/config',   icon: 'ti-settings',     label: 'Konfigurasi' },
    ],
  },
]

const ROLE_LABELS: Record<string, string> = {
  superadmin:        'Superadmin',
  admin:             'Admin',
  panitia_seleksi:   'Panitia Seleksi',
  penilai:           'Penilai',
  viewer_eksekutif:  'Viewer Eksekutif',
  bumd_operator:     'Operator BUMD',
}

export default function Sidebar({ profile }: { profile: Profile }) {
  const pathname = usePathname()

  return (
    <aside style={{
      width: '200px', flexShrink: 0,
      background: '#fff',
      borderRight: '0.5px solid #e5e7eb',
      display: 'flex', flexDirection: 'column',
      height: '100vh', position: 'sticky', top: 0,
    }}>
      {/* Logo */}
      <div style={{ padding: '14px', borderBottom: '0.5px solid #f1f5f9' }}>
        <div style={{
          background: '#1E3A5F', color: '#fff',
          fontSize: '11px', fontWeight: '600',
          padding: '4px 8px', borderRadius: '6px',
          display: 'inline-block', letterSpacing: '0.05em',
        }}>SIMBUMD</div>
        <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '3px' }}>
          Pemerintah Kota Batu
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '6px 0' }}>
        {NAV.map(group => {
          // Hide admin group for non-admin roles
          if (group.roles && !group.roles.includes(profile.role)) return null
          return (
            <div key={group.label}>
              <div style={{
                fontSize: '10px', color: '#9ca3af',
                padding: '6px 14px 3px',
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>{group.label}</div>
              {group.items.map(item => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link key={item.href} href={item.href} style={{ textDecoration: 'none' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '6px 14px',
                      fontSize: '12px',
                      color:      active ? '#1E3A5F' : '#6b7280',
                      background: active ? '#EBF2F9' : 'transparent',
                      fontWeight: active ? '500' : '400',
                      cursor: 'pointer',
                      transition: 'background .1s',
                    }}>
                      <i className={`ti ${item.icon}`} style={{ fontSize: '15px' }} aria-hidden />
                      {item.label}
                    </div>
                  </Link>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* User & Logout */}
      <div style={{ padding: '10px 14px', borderTop: '0.5px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{
            width: '28px', height: '28px', borderRadius: '50%',
            background: '#EBF2F9', color: '#1E3A5F',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '11px', fontWeight: '600', flexShrink: 0,
          }}>
            {profile.nama_lengkap?.charAt(0).toUpperCase()}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontSize: '11px', fontWeight: '500', color: '#1a1a1a',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{profile.nama_lengkap}</div>
            <div style={{ fontSize: '10px', color: '#9ca3af' }}>
              {ROLE_LABELS[profile.role] ?? profile.role}
            </div>
          </div>
        </div>
        <form action={logout}>
          <button type="submit" style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: '6px',
            padding: '5px 8px', borderRadius: '6px',
            border: '0.5px solid #e5e7eb', background: '#fff',
            fontSize: '11px', color: '#6b7280', cursor: 'pointer',
          }}>
            <i className="ti ti-logout" style={{ fontSize: '13px' }} aria-hidden />
            Keluar
          </button>
        </form>
      </div>
    </aside>
  )
}
