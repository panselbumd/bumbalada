import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: me } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!me || !['superadmin', 'admin'].includes(me.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const role   = searchParams.get('role')
  const status = searchParams.get('status')

  let query = supabase.from('profiles').select('*').order('created_at', { ascending: false })
  if (role)   query = query.eq('role', role)
  if (status) query = query.eq('status', status)

  const { data } = await query
  return NextResponse.json(data ?? [])
}

export async function PATCH(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: me } = await supabase
    .from('profiles').select('role').eq('id', user.id).single()
  if (!me || !['superadmin', 'admin'].includes(me.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { id, ...updates } = body

  // Prevent changing superadmin role unless caller is superadmin
  if (updates.role === 'superadmin' && me.role !== 'superadmin') {
    return NextResponse.json({ error: 'Hanya Superadmin yang bisa menetapkan role Superadmin' }, { status: 403 })
  }

  const { error } = await supabase.from('profiles').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await supabase.from('audit_log').insert({
    user_id: user.id, action: 'update', modul: 'admin_users',
    deskripsi: `Update profil user ${id}: ${JSON.stringify(updates)}`,
  })

  return NextResponse.json({ success: true })
}
