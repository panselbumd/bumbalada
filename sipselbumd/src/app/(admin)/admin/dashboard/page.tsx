'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { exportAuditLogCSV } from '@/lib/utils/export'
import type { User } from '@/types'

type AdminTab = 'pengguna' | 'audit' | 'kode-akses' | 'settings' | 'carry-over'

interface AuditEntry {
  id: string
  action: string
  table_name: string | null
  record_id: string | null
  ip_address: string | null
  created_at: string
  users: { email: string; role: string } | null
}

export default function AdminDashboard() {
  const [tab, setTab]           = useState<AdminTab>('pengguna')
  const [users, setUsers]       = useState<User[]>([])
  const [audits, setAudits]     = useState<AuditEntry[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [editUser, setEditUser] = useState<User | null>(null)
  const [saving, setSaving]     = useState(false)
  const [carryStatus, setCarryStatus] = useState<string | null>(null)

  useEffect(() => {
    if (tab === 'pengguna') loadUsers()
    if (tab === 'audit')    loadAudit()
  }, [tab])

  async function loadUsers() {
    setLoading(true)
    const { data } = await supabase.from('users').select('*').order('created_at', { ascending: false })
    if (data) setUsers(data)
    setLoading(false)
  }

  async function loadAudit() {
    setLoading(true)
    const { data } = await supabase
      .from('audit_logs')
      .select('id, action, table_name, record_id, ip_address, created_at, users(email, role)')
      .order('created_at', { ascending: false })
      .limit(200)
    if (data) setAudits(data as AuditEntry[])
    setLoading(false)
  }

  async function updateUserRole(userId: string, role: string, isActive: boolean) {
    setSaving(true)
    const { data: { user: me } } = await supabase.auth.getUser()
    const { error } = await supabase.from('users').update({ role, is_active: isActive }).eq('id', userId)
    if (!error) {
      await supabase.from('audit_logs').insert({
        user_id: me?.id, action: 'UPDATE_USER_ROLE', table_name: 'users', record_id: userId,
        new_data: { role, is_active: isActive },
      })
      loadUsers()
      setEditUser(null)
    }
    setSaving(false)
  }

  async function runCarryOver() {
    setCarryStatus('running')
    try {
      const { data, error } = await supabase.rpc('carry_over_candidates', {
        p_from_period_code: 'BWR-DIREKSI-2025',
        p_to_period_code:   'BWR-DIREKSI-2026',
      })
      if (error) throw error
      const count = Array.isArray(data) ? data.length : 0
      setCarryStatus(`✓ Berhasil: ${count} peserta carry-over dari BWR 2025 → 2026.`)
    } catch (err) {
      setCarryStatus(`✗ Error: ${err instanceof Error ? err.message : 'Gagal'}`)
    }
  }

  const filteredUsers = users.filter(u => {
    const matchSearch = !search ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.full_name ?? '').toLowerCase().includes(search.toLowerCase())
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const ACTION_COLOR: Record<string, string> = {
    LOGIN:                  '#10B981',
    LOGOUT:                 '#94A3B8',
    REGISTER:               '#0284C7',
    SUBMIT_APPLICATION:     '#1E40AF',
    UPDATE_APPLICATION_STATUS: '#F59E0B',
    UPDATE_STATUS:          '#F59E0B',
    INPUT_UKK_RESULT:       '#8B5CF6',
    UPDATE_USER_ROLE:       '#EF4444',
    GENERATE_ACCESS_CODES:  '#F59E0B',
    GENERATE_BERITA_ACARA:  '#0F172A',
    UPDATE_CONTENT:         '#06B6D4',
    CREATE_CONTENT:         '#06B6D4',
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-[#0F172A] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/></svg>
          </div>
          <div>
            <div className="text-white font-extrabold text-[14px]">SIPSELBUMD</div>
            <div className="text-white/40 text-[9.5px] uppercase tracking-wide">Panel Administrator</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-white/40">Administrator Sistem</span>
          <button className="text-[11px] text-white/40 hover:text-white/70 ml-3">Keluar</button>
        </div>
      </div>

      {/* Tab nav */}
      <div className="bg-white border-b border-[#E2E8F0] px-8">
        <div className="flex gap-0 max-w-[1100px]">
          {[
            { key: 'pengguna',   label: '👥 Manajemen Pengguna' },
            { key: 'carry-over', label: '🔄 Proses Carry-over' },
            { key: 'audit',      label: '📋 Audit Log' },
            { key: 'kode-akses', label: '🔑 Kode Akses' },
            { key: 'settings',   label: '⚙️ Pengaturan Sistem' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as AdminTab)}
              className={`px-5 py-3.5 text-[12.5px] font-semibold border-b-2 transition-all whitespace-nowrap ${
                tab === t.key
                  ? 'border-[#1E40AF] text-[#1E40AF]'
                  : 'border-transparent text-[#94A3B8] hover:text-[#475569]'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-[1100px] mx-auto px-8 py-8">

        {/* ── PENGGUNA TAB ── */}
        {tab === 'pengguna' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-[18px] font-extrabold text-[#0F172A]">Manajemen Pengguna</h1>
                <p className="text-[12.5px] text-[#64748B] mt-0.5">{users.length} pengguna terdaftar</p>
              </div>
              <div className="flex items-center gap-3">
                <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Cari email atau nama..."
                  className="px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] bg-white outline-none w-56 focus:border-[#1E40AF]" />
                <select value={roleFilter} onChange={e => setRoleFilter(e.target.value)}
                  className="px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] bg-white outline-none focus:border-[#1E40AF]">
                  <option value="all">Semua Role</option>
                  <option value="peserta">Peserta</option>
                  <option value="panitia">Panitia</option>
                  <option value="ukk">Tim UKK</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>

            {/* Role stats */}
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[
                { role: 'peserta', label: 'Peserta', color: '#1E40AF', bg: '#EFF6FF' },
                { role: 'panitia', label: 'Panitia', color: '#0284C7', bg: '#E0F2FE' },
                { role: 'ukk',     label: 'Tim UKK', color: '#8B5CF6', bg: '#EDE9FE' },
                { role: 'admin',   label: 'Admin',   color: '#0F172A', bg: '#F1F5F9' },
              ].map(s => (
                <div key={s.role} className="bg-white border border-[#E2E8F0] rounded-xl p-4">
                  <div className="text-[10.5px] text-[#64748B]">{s.label}</div>
                  <div className="text-[24px] font-extrabold" style={{ color: s.color }}>
                    {users.filter(u => u.role === s.role).length}
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_100px] gap-4 px-5 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10.5px] font-bold text-[#94A3B8] uppercase tracking-wide">
                <span>Pengguna</span><span>Role</span><span>Status</span><span>Bergabung</span><span>Aksi</span>
              </div>
              {filteredUsers.map(u => (
                <div key={u.id} className="grid grid-cols-[2fr_1fr_1fr_1fr_100px] gap-4 px-5 py-3.5 border-b border-[#F8FAFC] items-center hover:bg-[#FAFAFA]">
                  <div>
                    <div className="text-[13px] font-semibold text-[#0F172A]">{u.full_name ?? '—'}</div>
                    <div className="text-[11.5px] text-[#94A3B8]">{u.email}</div>
                  </div>
                  <div>
                    <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full ${
                      u.role === 'admin'   ? 'bg-[#F1F5F9] text-[#0F172A]' :
                      u.role === 'panitia' ? 'bg-[#E0F2FE] text-[#0284C7]' :
                      u.role === 'ukk'     ? 'bg-[#EDE9FE] text-[#8B5CF6]' :
                                             'bg-[#EFF6FF] text-[#1E40AF]'
                    }`}>
                      {u.role}
                    </span>
                  </div>
                  <div>
                    <span className={`text-[10.5px] font-bold px-2.5 py-1 rounded-full ${
                      u.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'
                    }`}>
                      {u.is_active ? '● Aktif' : '○ Nonaktif'}
                    </span>
                  </div>
                  <div className="text-[12px] text-[#64748B]">
                    {new Date(u.created_at).toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })}
                  </div>
                  <div>
                    <button onClick={() => setEditUser(u)}
                      className="px-3 py-1.5 text-[11px] font-bold bg-[#F1F5F9] text-[#475569] rounded-lg hover:bg-[#E2E8F0] transition-colors">
                      Edit
                    </button>
                  </div>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <div className="text-center py-12 text-[13px] text-[#94A3B8]">Tidak ada pengguna.</div>
              )}
            </div>
          </div>
        )}

        {/* ── CARRY-OVER TAB ── */}
        {tab === 'carry-over' && (
          <div className="max-w-[600px]">
            <h1 className="text-[18px] font-extrabold text-[#0F172A] mb-1">Proses Carry-over Peserta</h1>
            <p className="text-[12.5px] text-[#64748B] mb-6">
              Pindahkan peserta yang telah memenuhi kualifikasi dari periode seleksi sebelumnya ke periode baru secara otomatis.
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-5">
              <div className="flex items-start gap-3">
                <span className="text-xl">🔄</span>
                <div>
                  <div className="text-[13px] font-bold text-amber-800 mb-2">
                    Carry-over: PT. BWR Direksi 2025 → 2026
                  </div>
                  <div className="text-[12px] text-amber-700 leading-relaxed mb-4">
                    Fungsi ini akan memindahkan <strong>3 calon direksi yang lolos UKK</strong> dari seleksi PT. BWR Tahun 2025 ke periode 2026. Mereka akan otomatis berstatus <strong>"Lolos Administrasi"</strong> dan langsung dapat mengikuti UKK tanpa mendaftar ulang.
                  </div>
                  <div className="text-[11.5px] text-amber-700 bg-amber-100 px-3 py-2 rounded-lg">
                    ⚠️ <strong>Perhatian:</strong> Fungsi ini hanya perlu dijalankan <strong>sekali</strong>. Sistem akan memeriksa duplikasi secara otomatis.
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 mb-5">
              <div className="text-[12px] font-bold text-[#0F172A] mb-3">Konfigurasi</div>
              <div className="grid grid-cols-2 gap-3 text-[12.5px]">
                {[
                  { label: 'Dari Periode', val: 'BWR-DIREKSI-2025' },
                  { label: 'Ke Periode',   val: 'BWR-DIREKSI-2026' },
                  { label: 'Status Sumber', val: 'lolos_ukk' },
                  { label: 'Status Tujuan', val: 'lolos_administrasi (otomatis)' },
                ].map(r => (
                  <div key={r.label} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                    <div className="text-[10px] text-[#94A3B8] font-bold uppercase mb-1">{r.label}</div>
                    <div className="font-mono font-bold text-[#0F172A] text-[11.5px]">{r.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {carryStatus && (
              <div className={`mb-4 p-4 rounded-xl border text-[13px] font-medium ${
                carryStatus.startsWith('✓')
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : carryStatus === 'running'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}>
                {carryStatus === 'running' ? '⏳ Memproses carry-over...' : carryStatus}
              </div>
            )}

            <button
              onClick={runCarryOver}
              disabled={carryStatus === 'running' || (carryStatus?.startsWith('✓') ?? false)}
              className="w-full py-4 bg-amber-500 text-white font-extrabold text-[14px] rounded-xl hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all">
              {carryStatus === 'running' ? '⏳ Memproses...' :
               carryStatus?.startsWith('✓') ? '✓ Carry-over Selesai' :
               '🔄 Jalankan Carry-over Sekarang'}
            </button>
          </div>
        )}

        {/* ── AUDIT LOG TAB ── */}
        {tab === 'audit' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div>
                <h1 className="text-[18px] font-extrabold text-[#0F172A]">Audit Log</h1>
                <p className="text-[12.5px] text-[#64748B] mt-0.5">
                  Seluruh aktivitas sistem tercatat dan tidak dapat dihapus. Menampilkan 200 entri terbaru.
                </p>
              </div>
              <button onClick={() => exportAuditLogCSV()}
                className="px-4 py-2.5 text-[12px] font-bold bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] rounded-xl hover:bg-[#D1FAE5] transition-colors">
                📥 Export CSV
              </button>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_1fr_1fr_1fr_120px] gap-3 px-5 py-3 bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10.5px] font-bold text-[#94A3B8] uppercase tracking-wide">
                <span>Waktu</span><span>Aksi</span><span>Tabel</span><span>Pengguna</span><span>IP</span>
              </div>
              {loading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-7 h-7 border-2 border-[#1E40AF]/20 border-t-[#1E40AF] rounded-full animate-spin" />
                </div>
              ) : audits.map(a => (
                <div key={a.id} className="grid grid-cols-[1fr_1fr_1fr_1fr_120px] gap-3 px-5 py-3 border-b border-[#F8FAFC] items-center hover:bg-[#FAFAFA]">
                  <div className="text-[11.5px] text-[#64748B] font-mono">
                    {new Date(a.created_at).toLocaleString('id-ID', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </div>
                  <div>
                    <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: `${ACTION_COLOR[a.action] ?? '#94A3B8'}18`, color: ACTION_COLOR[a.action] ?? '#94A3B8' }}>
                      {a.action}
                    </span>
                  </div>
                  <div className="text-[11.5px] text-[#64748B] font-mono">{a.table_name ?? '—'}</div>
                  <div className="text-[11.5px] text-[#374151]">{a.users?.email ?? '—'}</div>
                  <div className="text-[11px] text-[#94A3B8] font-mono">{a.ip_address ?? '—'}</div>
                </div>
              ))}
              {!loading && audits.length === 0 && (
                <div className="text-center py-12 text-[13px] text-[#94A3B8]">Belum ada log.</div>
              )}
            </div>
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {tab === 'settings' && (
          <div className="max-w-[600px]">
            <h1 className="text-[18px] font-extrabold text-[#0F172A] mb-5">Pengaturan Sistem</h1>
            <SystemSettings />
          </div>
        )}

      </div>

      {/* ── EDIT USER MODAL ── */}
      {editUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[400px] p-6">
            <h3 className="text-[16px] font-extrabold text-[#0F172A] mb-1">Edit Pengguna</h3>
            <p className="text-[12px] text-[#64748B] mb-5">{editUser.email}</p>
            <div className="flex flex-col gap-4">
              <div>
                <label className="block text-[11px] font-bold text-[#374151] mb-1.5 uppercase tracking-wide">Role</label>
                <select
                  value={editUser.role}
                  onChange={e => setEditUser({ ...editUser, role: e.target.value as any })}
                  className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] bg-white outline-none focus:border-[#1E40AF]">
                  <option value="peserta">Peserta</option>
                  <option value="panitia">Panitia</option>
                  <option value="ukk">Tim UKK</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#374151] mb-1.5 uppercase tracking-wide">Status Akun</label>
                <div className="flex gap-3">
                  {[{ val: true, label: '● Aktif' }, { val: false, label: '○ Nonaktif' }].map(o => (
                    <button key={String(o.val)} type="button"
                      onClick={() => setEditUser({ ...editUser, is_active: o.val })}
                      className={`flex-1 py-2.5 rounded-xl border-2 text-[12.5px] font-bold transition-all ${
                        editUser.is_active === o.val
                          ? o.val ? 'border-green-400 bg-green-50 text-green-700' : 'border-red-300 bg-red-50 text-red-600'
                          : 'border-[#E2E8F0] text-[#94A3B8]'
                      }`}>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditUser(null)}
                className="flex-1 py-2.5 border border-[#E2E8F0] text-[#64748B] font-semibold rounded-xl hover:bg-[#F8FAFC]">
                Batal
              </button>
              <button
                disabled={saving}
                onClick={() => updateUserRole(editUser.id, editUser.role, editUser.is_active)}
                className="flex-[2] py-2.5 bg-[#1E40AF] text-white font-bold rounded-xl disabled:opacity-50 hover:bg-[#1d4ed8] transition-colors">
                {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SystemSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [saving, setSaving]     = useState(false)

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    const { data } = await supabase.from('settings').select('key, value')
    if (data) {
      const s: Record<string, string> = {}
      data.forEach(r => { s[r.key] = typeof r.value === 'string' ? r.value.replace(/^"|"$/g, '') : String(r.value) })
      setSettings(s)
    }
  }

  async function saveSettings() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    for (const [key, value] of Object.entries(settings)) {
      await supabase.from('settings').update({ value: JSON.stringify(value), updated_by: user?.id }).eq('key', key)
    }
    setSaving(false)
  }

  const SETTING_LABELS: Record<string, string> = {
    app_name:                    'Nama Aplikasi',
    selection_period:            'Periode Seleksi Aktif',
    max_applications_per_person: 'Maks. Lamaran per Orang',
    passing_grade_ukk:           'Nilai Minimal Lulus UKK',
    passing_grade_interview:     'Nilai Minimal Lulus Wawancara',
    admin_email:                 'Email Administrator',
  }

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
      <div className="flex flex-col gap-4">
        {Object.entries(SETTING_LABELS).map(([key, label]) => (
          <div key={key}>
            <label className="block text-[11.5px] font-bold text-[#374151] mb-1.5">{label}</label>
            <input
              value={settings[key] ?? ''}
              onChange={e => setSettings(s => ({ ...s, [key]: e.target.value }))}
              className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-[13px] bg-white outline-none focus:border-[#1E40AF] transition-all"
            />
          </div>
        ))}
      </div>
      <button onClick={saveSettings} disabled={saving}
        className="mt-5 w-full py-3 bg-[#0F172A] text-white font-bold rounded-xl disabled:opacity-50 hover:bg-[#1E293B] transition-all">
        {saving ? 'Menyimpan...' : '💾 Simpan Pengaturan'}
      </button>
    </div>
  )
}
