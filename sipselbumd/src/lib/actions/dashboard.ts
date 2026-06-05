// Dashboard server actions
import { supabase } from '@/lib/supabase'

export async function inputUKKResult(applicationId: string, data: unknown) {
  const result = await supabase
    .from('audit_logs')
    .insert({
      action: 'INPUT_UKK',
      table_name: 'applications',
      record_id: applicationId,
      new_data: data as Record<string, unknown>,
    })
  return result
}
