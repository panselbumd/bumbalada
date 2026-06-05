// ============================================================
// SIPSELBUMD — Supabase Client & Utilities
// ============================================================

import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// Server-side client (uses service role for admin operations)
export const createServerSupabaseClient = () => {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}

// ============================================================
// AUDIT LOGGER
// ============================================================

export async function logAudit({
  action,
  tableName,
  recordId,
  oldData,
  newData,
}: {
  action: string
  tableName?: string
  recordId?: string
  oldData?: Record<string, unknown>
  newData?: Record<string, unknown>
}) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  await supabase.from('audit_logs').insert({
    user_id: user?.id,
    action,
    table_name: tableName,
    record_id: recordId,
    old_data: oldData,
    new_data: newData,
  })
}

// ============================================================
// STORAGE HELPERS
// ============================================================

export const STORAGE_BUCKET = 'sipselbumd-documents'

export async function uploadDocument(
  file: File,
  applicationId: string,
  docType: string
): Promise<string | null> {
  const ext = file.name.split('.').pop()
  const fileName = `${applicationId}/${docType}_${Date.now()}.${ext}`

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('Upload error:', error)
    return null
  }

  const { data: urlData } = supabase.storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

export async function getSignedUrl(path: string, expiresIn = 3600): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(path, expiresIn)

  if (error) return null
  return data.signedUrl
}
