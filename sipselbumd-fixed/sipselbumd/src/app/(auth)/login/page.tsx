'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { UserRole } from '@/types'

const ROLE_OPTIONS: { value: UserRole; label: string; desc: string; restricted?: boolean }[] = [
  { value: 'peserta', label: 'Peserta Seleksi', desc: 'Pendaftar umum' },
  { value: 'panitia', label: 'Panitia Seleksi', desc: 'Verifikasi & kelola' },
  { value: 'ukk',     label: 'Tim UKK',         desc: 'Input nilai UKK' },
  { value: 'admin',   label: 'Administrator',   desc: 'Kelola sistem', restricted: true },
]

const ROLE_REDIRECT: Record<UserRole, string> = {
  peserta: '/peserta/dashboard',
  panitia: '/panitia/dashboard',
  ukk:     '/ukk/dashboard',
  admin:   '/admin/dashboard',
}

export default function LoginPage() {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState<UserRole>('peserta')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })
      if (authError) throw authError

      if (!data.user) throw new Error('Login gagal. Silakan coba lagi.')

      // Verify role match
      const { data: userRec, error: roleErr } = await supabase
        .from('users')
        .select('role, is_active')
        .eq('id', data.user.id)
        .single()

      if (roleErr || !userRec) throw new Error('Akun tidak ditemukan di sistem.')
      if (!userRec.is_active)  throw new Error('Akun Anda tidak aktif. Hubungi Administrator.')
      if (userRec.role !== selectedRole) {
        throw new Error(`Akun ini terdaftar sebagai "${userRec.role}", bukan "${selectedRole}". Pilih role yang tepat.`)
      }

      // Log login
      await supabase.from('audit_logs').insert({
        user_id:    data.user.id,
        action:     'LOGIN',
        table_name: 'users',
        record_id:  data.user.id,
        new_data:   { role: userRec.role, timestamp: new Date().toISOString() },
      })

      router.push(ROLE_REDIRECT[userRec.role as UserRole])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] relative overflow-hidden p-4">
      {/* Background orbs */}
      <div className="absolute top-[-120px] left-[-80px] w-[480px] h-[480px] rounded-full bg-[#1E40AF] opacity-[0.15] blur-[80px] animate-pulse" />
      <div className="absolute bottom-[-60px] right-[-60px] w-[360px] h-[360px] rounded-full bg-[#06B6D4] opacity-[0.12] blur-[80px]" />

      {/* Grid overlay */}
      <div className="absolute inset-0"
        style={{ backgroundImage: 'linear-gradient(rgba(30,64,175,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(30,64,175,0.05) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

      <div className="relative z-10 flex w-full max-w-[900px] min-h-[560px] rounded-2xl overflow-hidden shadow-2xl border border-white/[0.06]">

        {/* ── LEFT BRANDING PANEL ── */}
        <div className="hidden md:flex flex-col justify-between flex-1 bg-gradient-to-br from-[#1E3A8A] via-[#1E40AF] to-[#0284C7] p-12 relative overflow-hidden">
          <div className="absolute inset-0 opacity-20"
            style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, rgba(255,255,255,0.1) 0%, transparent 60%)' }} />

          {/* Logo */}
          <div className="relative flex items-center gap-3">
            <div className="w-11 h-11 bg-white/[0.15] border border-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
              <ShieldIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="text-[17px] font-extrabold text-white tracking-wide">SIPSELBUMD</div>
              <div className="text-[10px] text-white/50 tracking-[1.2px] uppercase">Pemerintah Daerah</div>
            </div>
          </div>

          {/* Main copy */}
          <div className="relative">
            <h1 className="text-[30px] font-extrabold text-white leading-tight mb-3">
              Seleksi BUMD<br />Transparan &<br />Akuntabel
            </h1>
            <p className="text-[13px] text-white/60 leading-relaxed mb-7 max-w-[280px]">
              Platform digital resmi pelaksanaan seleksi pejabat Badan Usaha Milik Daerah yang terverifikasi dan berdasarkan regulasi nasional.
            </p>

            {/* Legal badges */}
            <div className="flex flex-col gap-2.5">
              {[
                { color: '#10B981', text: 'UU No. 23 Tahun 2014 tentang Pemerintahan Daerah' },
                { color: '#06B6D4', text: 'PP No. 54 Tahun 2017 tentang BUMD' },
                { color: '#60A5FA', text: 'Permendagri No. 37 Tahun 2018' },
              ].map((b) => (
                <div key={b.text} className="flex items-center gap-2.5 px-3 py-2.5 bg-white/[0.07] border border-white/10 rounded-xl backdrop-blur-sm">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: b.color, boxShadow: `0 0 8px ${b.color}` }} />
                  <span className="text-[11.5px] text-white/75 font-medium">{b.text}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="relative text-[10.5px] text-white/30">
            © 2026 Sistem Informasi Seleksi BUMD · Hak Cipta Dilindungi
          </p>
        </div>

        {/* ── RIGHT FORM PANEL ── */}
        <div className="w-full md:w-[400px] bg-[#0F172A]/95 backdrop-blur-xl border-l border-white/[0.05] flex flex-col justify-center p-10">
          <div className="mb-8">
            <h2 className="text-[24px] font-bold text-[#F8FAFC] mb-2">Selamat Datang</h2>
            <p className="text-[13px] text-[#F8FAFC]/40 leading-relaxed">
              Masuk ke sistem seleksi BUMD dengan akun Anda yang telah terdaftar.
            </p>
          </div>

          {/* Role selector */}
          <div className="grid grid-cols-2 gap-2 mb-7">
            {ROLE_OPTIONS.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setSelectedRole(r.value)}
                className={`px-3 py-2.5 rounded-xl border text-left transition-all ${
                  selectedRole === r.value
                    ? 'bg-[#06B6D4]/10 border-[#06B6D4]/40 text-[#06B6D4]'
                    : 'bg-white/[0.03] border-white/[0.07] text-[#F8FAFC]/45 hover:border-[#06B6D4]/20 hover:text-[#F8FAFC]/70'
                }`}
              >
                <div className="text-[11.5px] font-600">{r.label}</div>
                <div className="text-[10px] opacity-60 mt-0.5">{r.desc}</div>
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            {/* Error */}
            {error && (
              <div className="px-3 py-2.5 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[12px] leading-snug">
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-[11px] font-bold text-[#F8FAFC]/45 uppercase tracking-[0.6px] mb-2">
                Email / NIK
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#F8FAFC]/25">
                  <MailIcon className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@instansi.go.id"
                  required
                  className="w-full pl-10 pr-4 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-[#F8FAFC] text-[14px] placeholder-[#F8FAFC]/20 outline-none focus:border-[#06B6D4]/50 focus:bg-[#06B6D4]/[0.04] focus:ring-2 focus:ring-[#06B6D4]/08 transition-all"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-bold text-[#F8FAFC]/45 uppercase tracking-[0.6px] mb-2">
                Kata Sandi
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#F8FAFC]/25">
                  <LockIcon className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  required
                  className="w-full pl-10 pr-10 py-3 bg-white/[0.05] border border-white/10 rounded-xl text-[#F8FAFC] text-[14px] placeholder-[#F8FAFC]/20 outline-none focus:border-[#06B6D4]/50 focus:bg-[#06B6D4]/[0.04] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#F8FAFC]/25 hover:text-[#F8FAFC]/60 transition-colors"
                >
                  {showPassword ? <EyeOffIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-between items-center mt-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="checkbox" className="accent-[#06B6D4]" />
                  <span className="text-[11.5px] text-[#F8FAFC]/40">Ingat saya</span>
                </label>
                <a href="/lupa-sandi" className="text-[11.5px] text-[#06B6D4] font-medium hover:underline">
                  Lupa Kata Sandi?
                </a>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 mt-1 bg-gradient-to-r from-[#1E40AF] to-[#0284C7] text-white font-bold text-[14px] rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-blue-700/30 active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:translate-y-0"
            >
              {loading ? 'Memproses...' : 'Masuk ke Sistem →'}
            </button>
          </form>

          {/* Register link */}
          <div className="mt-5 pt-5 border-t border-white/[0.06] text-center text-[12.5px] text-[#F8FAFC]/35">
            Belum punya akun?{' '}
            <a href="/daftar" className="text-[#06B6D4] font-semibold hover:underline">
              Daftar sebagai Peserta
            </a>
          </div>

          {/* Security badge */}
          <div className="mt-4 flex items-start gap-2.5 p-3 bg-[#10B981]/[0.05] border border-[#10B981]/15 rounded-xl">
            <ShieldIcon className="w-3.5 h-3.5 text-[#10B981]/70 mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-[#10B981]/60 leading-snug">
              Sistem ini dilindungi enkripsi SSL 256-bit. Seluruh aktivitas login tercatat dalam audit trail.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Inline SVG Icons (no dep) ──
function ShieldIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
}
function MailIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
}
function LockIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
}
function EyeIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
}
function EyeOffIcon({ className }: { className?: string }) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
}
