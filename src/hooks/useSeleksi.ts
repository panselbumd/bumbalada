'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ProsesSeleksi, PesertaSeleksi } from '@/types/database'

export function useSeleksiList() {
  const [data, setData]       = useState<ProsesSeleksi[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: res, error: err } = await supabase
      .from('proses_seleksi')
      .select('*, bumd(nama, singkatan), blud(nama, singkatan)')
      .order('created_at', { ascending: false })

    if (err) setError(err.message)
    else setData(res as ProsesSeleksi[] ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  return { data, loading, error, refetch: fetch }
}

export function usePesertaBySeleksi(seleksiId: string | null) {
  const [data, setData]       = useState<PesertaSeleksi[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!seleksiId) return
    setLoading(true)

    const supabase = createClient()
    supabase
      .from('peserta_seleksi')
      .select('*')
      .eq('seleksi_id', seleksiId)
      .order('ranking', { ascending: true, nullsFirst: false })
      .then(({ data: res }) => {
        setData(res as PesertaSeleksi[] ?? [])
        setLoading(false)
      })
  }, [seleksiId])

  return { data, loading }
}
