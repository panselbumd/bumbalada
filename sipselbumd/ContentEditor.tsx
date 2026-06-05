'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ContentPage, ContentMetadata, JadwalItem } from '@/types/extended'

interface Props {
  periodId?: string
  pageType: ContentPage['page_type']
  onClose: () => void
}

export default function ContentEditor({ periodId, pageType, onClose }: Props) {
  const [page, setPage]       = useState<ContentPage | null>(null)
  const [title, setTitle]     = useState('')
  const [content, setContent] = useState('')
  const [jadwalItems, setJadwalItems] = useState<JadwalItem[]>([])
  const [isPublished, setIsPublished] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [activeMode, setActiveMode] = useState<'edit' | 'preview'>('edit')

  const isJadwal = pageType === 'jadwal'

  useEffect(() => {
    loadContent()
  }, [periodId, pageType])

  async function loadContent() {
    let q = supabase
      .from('content_pages')
      .select('*')
      .eq('page_type', pageType)
    if (periodId) q = q.eq('period_id', periodId)
    else          q = q.is('period_id', null)

    const { data } = await q.order('created_at', { ascending: false }).limit(1).single()

    if (data) {
      setPage(data)
      setTitle(data.title)
      setContent(data.content)
      setIsPublished(data.is_published)
      if (data.metadata?.jadwal_items) setJadwalItems(data.metadata.jadwal_items)
    } else {
      // defaults for new page
      setTitle(PAGE_DEFAULTS[pageType]?.title ?? '')
      setContent(PAGE_DEFAULTS[pageType]?.content ?? '')
      setJadwalItems(PAGE_DEFAULTS[pageType]?.jadwal ?? [])
    }
  }

  async function handleSave(publish?: boolean) {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    const metadata: ContentMetadata = isJadwal ? { jadwal_items: jadwalItems } : {}
    const shouldPublish = publish !== undefined ? publish : isPublished

    const payload = {
      period_id:    periodId ?? null,
      page_type:    pageType,
      title,
      content,
      metadata,
      is_published: shouldPublish,
      published_at: shouldPublish ? new Date().toISOString() : null,
      updated_by:   user?.id,
      version:      (page?.version ?? 0) + 1,
    }

    let error
    if (page?.id) {
      const res = await supabase.from('content_pages').update(payload).eq('id', page.id)
      error = res.error
    } else {
      const res = await supabase.from('content_pages').insert(payload)
      error = res.error
    }

    if (!error) {
      setSaved(true)
      setIsPublished(shouldPublish)
      await supabase.from('audit_logs').insert({
        user_id:    user?.id,
        action:     page?.id ? 'UPDATE_CONTENT' : 'CREATE_CONTENT',
        table_name: 'content_pages',
        record_id:  page?.id,
        new_data:   { page_type: pageType, title, version: payload.version },
      })
      setTimeout(() => setSaved(false), 2500)
      loadContent()
    }
    setSaving(false)
  }

  function addJadwalRow() {
    setJadwalItems(prev => [...prev, { no: prev.length + 1, tahapan: '', tanggal: '', keterangan: '' }])
  }

  function updateJadwalRow(idx: number, field: keyof JadwalItem, value: string | number) {
    setJadwalItems(prev => prev.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  function removeJadwalRow(idx: number) {
    setJadwalItems(prev => prev.filter((_, i) => i !== idx).map((r, i) => ({ ...r, no: i + 1 })))
  }

  function moveRow(idx: number, dir: -1 | 1) {
    const next = idx + dir
    if (next < 0 || next >= jadwalItems.length) return
    setJadwalItems(prev => {
      const arr = [...prev]
      ;[arr[idx], arr[next]] = [arr[next], arr[idx]]
      return arr.map((r, i) => ({ ...r, no: i + 1 }))
    })
  }

  const PAGE_LABEL: Record<ContentPage['page_type'], string> = {
    pengumuman: 'Pengumuman',
    persyaratan: 'Persyaratan Pendaftaran',
    jadwal: 'Jadwal Pelaksanaan',
    tahapan: 'Tahapan Seleksi',
    tata_cara: 'Tata Cara Pendaftaran',
    tentang: 'Tentang Seleksi',
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[860px] max-h-[92vh] flex flex-col overflow-hidden">

        {/* ── Modal Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <div>
            <div className="text-[11px] font-bold text-[#94A3B8] uppercase tracking-wide">Edit Konten</div>
            <h2 className="text-[16px] font-extrabold text-[#0F172A]">{PAGE_LABEL[pageType]}</h2>
          </div>
          <div className="flex items-center gap-2">
            {/* Published toggle */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl">
              <span className="text-[11.5px] text-[#64748B] font-medium">Publikasi</span>
              <button
                onClick={() => setIsPublished(p => !p)}
                className={`relative w-9 h-5 rounded-full transition-colors ${isPublished ? 'bg-[#10B981]' : 'bg-[#E2E8F0]'}`}
              >
                <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${isPublished ? 'left-[18px]' : 'left-0.5'}`} />
              </button>
              <span className={`text-[10.5px] font-bold ${isPublished ? 'text-[#10B981]' : 'text-[#94A3B8]'}`}>
                {isPublished ? 'Publik' : 'Draft'}
              </span>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] rounded-lg transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-auto p-6">

          {/* Title field */}
          <div className="mb-5">
            <label className="block text-[11px] font-bold text-[#64748B] uppercase tracking-wide mb-1.5">Judul</label>
            <input
              type="text" value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Judul halaman konten..."
              className="w-full px-4 py-3 border border-[#E2E8F0] rounded-xl text-[14px] font-semibold text-[#0F172A] outline-none focus:border-[#1E40AF] bg-[#F8FAFC] focus:bg-white transition-all"
            />
          </div>

          {/* JADWAL: table editor */}
          {isJadwal ? (
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wide">Baris Jadwal</label>
                <button onClick={addJadwalRow}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[11.5px] font-bold bg-[#EFF6FF] text-[#1E40AF] border border-[#BFDBFE] rounded-lg hover:bg-[#DBEAFE] transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                  Tambah Baris
                </button>
              </div>

              <div className="border border-[#E2E8F0] rounded-xl overflow-hidden">
                <div className="grid grid-cols-[36px_40px_1fr_1fr_1fr_64px] gap-2 px-3 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] font-bold text-[#94A3B8] uppercase tracking-wide">
                  <span></span><span>No.</span><span>Tahapan</span><span>Tanggal</span><span>Keterangan</span><span></span>
                </div>
                {jadwalItems.map((row, idx) => (
                  <div key={idx} className="grid grid-cols-[36px_40px_1fr_1fr_1fr_64px] gap-2 px-3 py-2 border-b border-[#F8FAFC] items-center hover:bg-[#FAFAFA]">
                    {/* Move buttons */}
                    <div className="flex flex-col gap-0.5">
                      <button onClick={() => moveRow(idx, -1)} disabled={idx === 0}
                        className="w-5 h-5 flex items-center justify-center text-[#CBD5E1] hover:text-[#64748B] disabled:opacity-30 rounded transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="18 15 12 9 6 15"/></svg>
                      </button>
                      <button onClick={() => moveRow(idx, 1)} disabled={idx === jadwalItems.length - 1}
                        className="w-5 h-5 flex items-center justify-center text-[#CBD5E1] hover:text-[#64748B] disabled:opacity-30 rounded transition-colors">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                    </div>
                    <div className="text-[12px] font-bold text-[#94A3B8] text-center">{row.no}</div>
                    <input value={row.tahapan} onChange={e => updateJadwalRow(idx, 'tahapan', e.target.value)}
                      placeholder="Nama tahapan..."
                      className="px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-[12.5px] text-[#0F172A] outline-none focus:border-[#1E40AF] bg-white w-full" />
                    <input value={row.tanggal} onChange={e => updateJadwalRow(idx, 'tanggal', e.target.value)}
                      placeholder="cth: 6–20 Jan 2026"
                      className="px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-[12.5px] text-[#1E40AF] outline-none focus:border-[#1E40AF] bg-white w-full font-medium" />
                    <input value={row.keterangan} onChange={e => updateJadwalRow(idx, 'keterangan', e.target.value)}
                      placeholder="Keterangan (opsional)..."
                      className="px-2.5 py-1.5 border border-[#E2E8F0] rounded-lg text-[12px] text-[#64748B] outline-none focus:border-[#1E40AF] bg-white w-full" />
                    <button onClick={() => removeJadwalRow(idx)}
                      className="w-7 h-7 flex items-center justify-center text-[#EF4444] hover:bg-red-50 rounded-lg transition-colors mx-auto">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
                    </button>
                  </div>
                ))}
                {jadwalItems.length === 0 && (
                  <div className="py-8 text-center text-[12px] text-[#CBD5E1]">
                    Belum ada baris jadwal. Klik "Tambah Baris" untuk memulai.
                  </div>
                )}
              </div>

              <div className="mt-4 p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-[11.5px] text-[#64748B]">
                💡 Data jadwal ini akan ditampilkan sebagai tabel di halaman publik. Pengguna dapat melihat baris mana yang sedang aktif.
              </div>
            </div>
          ) : (
            /* Rich text editor (markdown) */
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold text-[#64748B] uppercase tracking-wide">Konten</label>
                <div className="flex gap-1 bg-[#F1F5F9] p-0.5 rounded-lg">
                  <button onClick={() => setActiveMode('edit')}
                    className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${activeMode === 'edit' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#94A3B8] hover:text-[#475569]'}`}>
                    Edit
                  </button>
                  <button onClick={() => setActiveMode('preview')}
                    className={`px-3 py-1 text-[11px] font-bold rounded-md transition-all ${activeMode === 'preview' ? 'bg-white text-[#0F172A] shadow-sm' : 'text-[#94A3B8] hover:text-[#475569]'}`}>
                    Preview
                  </button>
                </div>
              </div>

              {/* Toolbar */}
              {activeMode === 'edit' && (
                <div className="flex items-center gap-1 px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-t-xl border-b-0">
                  {[
                    { label: 'B',  action: () => setContent(c => c + '**teks tebal**'), title: 'Bold' },
                    { label: 'I',  action: () => setContent(c => c + '*teks miring*'), title: 'Italic' },
                    { label: 'H2', action: () => setContent(c => c + '\n## Judul\n'), title: 'Heading 2' },
                    { label: 'H3', action: () => setContent(c => c + '\n### Sub-judul\n'), title: 'Heading 3' },
                    { label: '•',  action: () => setContent(c => c + '\n- Item\n'), title: 'Bullet list' },
                    { label: '1.', action: () => setContent(c => c + '\n1. Item\n'), title: 'Numbered list' },
                    { label: '❝',  action: () => setContent(c => c + '\n> Kutipan atau catatan penting\n'), title: 'Blockquote' },
                    { label: '—',  action: () => setContent(c => c + '\n---\n'), title: 'Divider' },
                  ].map(btn => (
                    <button key={btn.label} onClick={btn.action} title={btn.title}
                      className="w-7 h-7 flex items-center justify-center text-[11.5px] font-bold text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#0F172A] rounded transition-colors">
                      {btn.label}
                    </button>
                  ))}
                </div>
              )}

              {activeMode === 'edit' ? (
                <textarea
                  value={content} onChange={e => setContent(e.target.value)}
                  placeholder="Tulis konten dalam format Markdown..."
                  rows={18}
                  className="w-full px-4 py-3 border border-[#E2E8F0] rounded-b-xl text-[13px] text-[#374151] font-mono leading-relaxed outline-none focus:border-[#1E40AF] bg-white resize-none"
                />
              ) : (
                <div className="min-h-[320px] p-5 border border-[#E2E8F0] rounded-xl bg-white prose-preview">
                  <MarkdownPreview content={content} />
                </div>
              )}

              <div className="mt-2 flex items-center justify-between">
                <p className="text-[11px] text-[#94A3B8]">
                  Mendukung format Markdown: **tebal**, *miring*, ## Judul, - daftar
                </p>
                <p className="text-[11px] text-[#94A3B8]">{content.length} karakter</p>
              </div>
            </div>
          )}

          {/* Version info */}
          {page && (
            <div className="mt-5 flex items-center gap-2 text-[11px] text-[#94A3B8]">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Versi {page.version} · Terakhir diubah: {new Date(page.updated_at).toLocaleString('id-ID')}
              {page.is_published && <span className="text-[#10B981] font-semibold">· ● Dipublikasikan</span>}
            </div>
          )}
        </div>

        {/* ── Footer actions ── */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-[#E2E8F0] bg-[#F8FAFC]">
          <button onClick={onClose} className="px-4 py-2.5 border border-[#E2E8F0] text-[#64748B] text-[13px] font-semibold rounded-xl hover:bg-white transition-colors">
            Batal
          </button>
          <div className="flex items-center gap-2">
            {saved && (
              <span className="text-[12px] text-[#10B981] font-semibold flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                Tersimpan!
              </span>
            )}
            <button onClick={() => handleSave(false)} disabled={saving}
              className="px-4 py-2.5 border border-[#E2E8F0] bg-white text-[#475569] text-[13px] font-semibold rounded-xl hover:bg-[#F1F5F9] disabled:opacity-50 transition-colors">
              {saving ? 'Menyimpan...' : 'Simpan Draft'}
            </button>
            <button onClick={() => handleSave(true)} disabled={saving}
              className="px-5 py-2.5 bg-[#1E40AF] text-white text-[13px] font-bold rounded-xl hover:bg-[#1d4ed8] disabled:opacity-50 transition-colors">
              {saving ? 'Menyimpan...' : isPublished ? '✓ Simpan & Publikasikan' : 'Publikasikan →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Simple markdown to HTML renderer ── */
function MarkdownPreview({ content }: { content: string }) {
  const html = content
    .replace(/^### (.+)$/gm, '<h3 style="font-size:14px;font-weight:700;color:#0F172A;margin:12px 0 6px">$1</h3>')
    .replace(/^## (.+)$/gm,  '<h2 style="font-size:16px;font-weight:800;color:#0F172A;margin:16px 0 8px">$1</h2>')
    .replace(/^# (.+)$/gm,   '<h1 style="font-size:20px;font-weight:800;color:#0F172A;margin:20px 0 10px">$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#0F172A">$1</strong>')
    .replace(/\*(.+?)\*/g,     '<em>$1</em>')
    .replace(/^> (.+)$/gm,    '<blockquote style="background:#FFFBEB;border-left:3px solid #F59E0B;padding:10px 14px;margin:10px 0;border-radius:0 6px 6px 0;font-size:13px;color:#92400E">$1</blockquote>')
    .replace(/^- (.+)$/gm,    '<li style="font-size:13px;color:#475569;margin-bottom:4px;margin-left:16px;list-style:disc">$1</li>')
    .replace(/^\d+\. (.+)$/gm,'<li style="font-size:13px;color:#475569;margin-bottom:4px;margin-left:16px;list-style:decimal">$1</li>')
    .replace(/^---$/gm,       '<hr style="border:none;border-top:1px solid #E2E8F0;margin:16px 0">')
    .replace(/\n\n/g,         '<br><br>')

  return <div dangerouslySetInnerHTML={{ __html: html }} />
}

/* ── Default content templates ── */
const PAGE_DEFAULTS: Partial<Record<ContentPage['page_type'], { title: string; content: string; jadwal?: JadwalItem[] }>> = {
  pengumuman: {
    title: 'Pengumuman Seleksi',
    content: '## Pengumuman\n\n**Nomor:** [Nomor Pengumuman]\n\nPanitia Seleksi memberitahukan bahwa akan dilaksanakan seleksi dengan ketentuan sebagai berikut:\n\n### Jabatan yang Diseleksi\n\n- Jabatan: **[Nama Jabatan]**\n- Jumlah: **[Jumlah] orang**\n\n### Dasar Hukum\n\n1. Undang-Undang Nomor 23 Tahun 2014\n2. Peraturan Pemerintah Nomor 54 Tahun 2017\n3. Permendagri Nomor 37 Tahun 2018',
  },
  persyaratan: {
    title: 'Persyaratan Pendaftaran',
    content: '## Persyaratan Umum\n\n1. Warga Negara Indonesia\n2. Sehat jasmani dan rohani\n3. Tidak pernah dinyatakan pailit\n4. Tidak sedang menjalani sanksi pidana\n\n## Persyaratan Khusus\n\n1. **Pendidikan:** Minimal Sarjana (S1)\n2. **Pengalaman:** Minimal [X] tahun\n3. **Usia:** Maksimal [X] tahun\n\n## Dokumen yang Diperlukan\n\n1. KTP\n2. Pas Foto 4×6\n3. CV / Riwayat Hidup\n4. Ijazah terlegalisir\n5. NPWP\n6. SKCK\n7. Surat Keterangan Sehat\n8. Pakta Integritas',
  },
  jadwal: {
    title: 'Jadwal Pelaksanaan Seleksi',
    content: 'Jadwal pelaksanaan seleksi dapat dilihat pada tabel berikut.',
    jadwal: [
      { no: 1, tahapan: 'Pengumuman Seleksi', tanggal: '', keterangan: '' },
      { no: 2, tahapan: 'Pendaftaran Peserta', tanggal: '', keterangan: 'Pendaftaran online via sistem' },
      { no: 3, tahapan: 'Verifikasi Administrasi', tanggal: '', keterangan: '' },
      { no: 4, tahapan: 'Pengumuman Lolos Administrasi', tanggal: '', keterangan: '' },
      { no: 5, tahapan: 'Uji Kompetensi & Kelayakan (UKK)', tanggal: '', keterangan: '' },
      { no: 6, tahapan: 'Wawancara', tanggal: '', keterangan: '' },
      { no: 7, tahapan: 'Penetapan Calon Terpilih', tanggal: '', keterangan: '' },
      { no: 8, tahapan: 'Penandatanganan Kontrak Kinerja', tanggal: '', keterangan: '' },
      { no: 9, tahapan: 'Pengangkatan', tanggal: '', keterangan: '' },
    ],
  },
  tahapan: {
    title: 'Tahapan Seleksi',
    content: '## Tahapan Seleksi\n\nSeleksi dilaksanakan melalui tahapan-tahapan berikut:\n\n### 1. Pengumuman Seleksi\nPanitia menerbitkan pengumuman resmi.\n\n### 2. Pendaftaran Online\nCalon mengisi formulir dan mengunggah dokumen.\n\n### 3. Verifikasi Administrasi\nPanitia memeriksa kelengkapan dokumen.\n\n### 4. Pengumuman Lolos Administrasi\nPenetapan peserta yang berhak mengikuti UKK.\n\n### 5. Uji Kompetensi & Kelayakan (UKK)\nTes kompetensi, psikologi, presentasi, dan wawancara UKK.\n\n### 6. Wawancara\nCalon lolos UKK diwawancarai KPM atau RUPS.\n\n### 7. Penetapan Calon Terpilih\nDitetapkan oleh KPM/RUPS.\n\n### 8. Penandatanganan Kontrak Kinerja\nCalon terpilih menandatangani kontrak.\n\n### 9. Pengangkatan\nPenerbitan SK Pengangkatan.',
  },
}
