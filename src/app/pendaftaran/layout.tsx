import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/layout/Sidebar'
import { Profile } from '@/types/database'

export default async function SharedLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  const profile = profileData as Profile | null
  if (!profile) redirect('/login')

  if (profile.status === 'nonaktif') {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#F5F6F8',
      }}>
        <div style={{
          background: '#fff', borderRadius: '12px', padding: '32px',
          maxWidth: '360px', textAlign: 'center', border: '0.5px solid #e5e7eb',
        }}>
          <i className="ti ti-ban" style={{ fontSize: '40px', color: '#DC2626', display: 'block', marginBottom: '12px' }} aria-hidden />
          <h2 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 6px' }}>Akun Dinonaktifkan</h2>
          <p style={{ fontSize: '12px', color: '#6b7280' }}>
            Akun Anda dinonaktifkan. Hubungi Admin SIMBUMD untuk informasi lebih lanjut.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F5F6F8' }}>
      <Sidebar profile={profile} />
      <main style={{ flex: 1, minWidth: 0, overflow: 'auto' }}>
        {children}
      </main>
    </div>
  )
}
