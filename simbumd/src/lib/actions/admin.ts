'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { UserRole } from '@/types/database'

// Buat Supabase admin client dengan service role
function createAdminClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    }
  )
}

export async function getUsers() {
  const supabase = createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
  return data ?? []
}

export async function createUser(formData: FormData) {
  const supabase  = createClient()
  const admin     = createAdminClient()
  const { data: { user: me } } = await supabase.auth.getUser()
  if (!me) throw new Error('Unauthorized')

  const email        = formData.get('email') as string
  const namaLengkap  = formData.get('nama_lengkap') as string
  const role         = formData.get('role') as UserRole
  const unitKerja    = formData.get('unit_kerja') as string
  const nip          = formData.get('nip') as string

  // Generate temp password
  const tempPassword = `SIMBUMD-${Math.random().toString(36).slice(2, 10).toUpperCase()}`

  // Buat user di Supabase Auth
  const { data: newUser, error } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { nama_lengkap: namaLengkap },
  })

  if (error) throw error

  // Update profile
  await supabase.from('profiles').update({
    nip,
    nama_lengkap: namaLengkap,
    role,
    unit_kerja:   unitKerja,
    status:       'aktif',
  }).eq('id', newUser.user.id)

  await supabase.from('audit_log').insert({
    user_id:   me.id,
    action:    'create',
    modul:     'admin_users',
    deskripsi: `Buat user baru: ${email} (${role})`,
  })

  revalidatePath('/admin/users')
  return { success: true, tempPassword }
}

export async function updateUserRole(userId: string, role: UserRole) {
  const supabase = createClient()
  const { data: { user: me } } = await supabase.auth.getUser()
  if (!me) throw new Error('Unauthorized')

  await supabase.from('profiles').update({ role }).eq('id', userId)

  await supabase.from('audit_log').insert({
    user_id:   me.id,
    action:    'change_role',
    modul:     'admin_users',
    deskripsi: `Ubah role user ${userId} → ${role}`,
  })

  revalidatePath('/admin/users')
  revalidatePath('/admin/roles')
}

export async function toggleUserStatus(userId: string, aktif: boolean) {
  const supabase = createClient()
  const { data: { user: me } } = await supabase.auth.getUser()
  if (!me) throw new Error('Unauthorized')

  const status = aktif ? 'aktif' : 'nonaktif'
  await supabase.from('profiles').update({ status }).eq('id', userId)

  await supabase.from('audit_log').insert({
    user_id:   me.id,
    action:    'update',
    modul:     'admin_users',
    deskripsi: `${aktif ? 'Aktifkan' : 'Nonaktifkan'} akun user ${userId}`,
  })

  revalidatePath('/admin/users')
}

export async function resetPassword(userId: string) {
  const supabase = createClient()
  const admin    = createAdminClient()
  const { data: { user: me } } = await supabase.auth.getUser()
  if (!me) throw new Error('Unauthorized')

  const newPassword = `SIMBUMD-${Math.random().toString(36).slice(2, 10).toUpperCase()}`

  await admin.auth.admin.updateUserById(userId, { password: newPassword })

  await supabase.from('audit_log').insert({
    user_id:   me.id,
    action:    'reset_password',
    modul:     'admin_users',
    deskripsi: `Reset kata sandi user ${userId}`,
  })

  return { success: true, newPassword }
}

export async function getAuditLogs(limit = 100) {
  const supabase = createClient()
  const { data } = await supabase
    .from('audit_log')
    .select('*, profiles(nama_lengkap, role)')
    .order('created_at', { ascending: false })
    .limit(limit)
  return data ?? []
}
