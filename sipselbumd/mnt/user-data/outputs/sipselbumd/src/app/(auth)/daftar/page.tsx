'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Step = 'pilih-seleksi' | 'akun' | 'profil' | 'selesai'

interface SelectionPeriodOption {
  id: string
  period_code: string
  period_label: string
  bumd_short: string
  bumd_type: string
  is_restricted: boolean
  status: string
  quota_position: number
}

export default function DaftarPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [step, setStep] = useState<Step>('pilih-seleksi')
  const [periods, setPeriods] = useState<SelectionPeriodOption[]>([])
  const [selectedPeriod, setSelectedPeriod] = useState<SelectionPeriodOption | null>(null)
  const [accessCode, setAccessCode] = useState('')
  const [accessCodeValid, setAccessCodeValid] = useState<boolean | null>(null)
  const [accessCodeMsg, setAccessCodeMsg] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Akun fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Profil fields
  const [nik, setNik] = useState('')
  const [fullName, setFullName] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [gender, setGender] = useState<'L' | 'P'>('L')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  // Internal Pemda fields (for restricted)
  const [jabatanPemda, setJabatanPemda] = useState('')
  const [unitKerja, setUnitKerja] = useState('')

  useEffect(() => {
    loadPeriods()
    // Pre-select from URL param
    const code = searchParams.get('period')
    if (code) {
      // will match after periods load
    }
  }, [])

  async function loadPeriods() {
    const { data } = await supabase
      .from('selection_periods')
      .select('id,period_code,period_label,bumd_short,bumd_type,is_restricted,status,quota_position')
      .eq('status', 'open')
      .order('created_at')
    if (data) setPeriods(data)
  }

  async function validateAccessCode() {
    if (!selectedPeriod || !accessCode.trim()) return
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('validate_access_code', {
        p_period_id: selectedPeriod.id,
        p_code: accessCode.trim().toUpperCase(),
        p_user_id: '00000000-0000-0000-0000-000000000000', // placeholder, will be real on submit
      })
      if (error) throw error
      setAccessCodeValid(data.valid)
      setAccessCodeMsg(data.message)
    } catch {
      setAccessCodeValid(false)
      setAccessCodeMsg('Gagal memvalidasi kode akses.')
    } finally {
      setLoading(false)
    }
  }

  function canProceedFromPeriod() {
    if (!selectedPeriod) return false
    if (selectedPeriod.is_restricted && !accessCodeValid) return false
    return true
  }

  async function handleRegister() {
    if (password !== confirmPassword) {
      setError('Kata sandi tidak cocok.')
      return
    }
    if (password.length < 8) {
      setError('Kata sandi minimal 8 karakter.')
      return
    }
    if (nik.length !== 16) {
      setError('NIK harus 16 digit.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // 1. Create auth user
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/callback` },
      })
      if (authErr) throw authErr
      if (!authData.user) throw new Error('Gagal membuat akun.')

      const userId = authData.user.id

      // 2. Create user record
      const { error: userErr } = await supabase.from('users').insert({
        id:        userId,
        email,
        phone,
        full_name: fullName,
        role:      'peserta',
        is_active: true,
      })
      if (userErr) throw userErr

      // 3. Create participant profile
      const { data: participant, error: partErr } = await supabase
        .from('participants')
        .insert({
          user_id:   userId,
          nik,
          full_name: fullName,
          birth_date: birthDate,
          gender,
          phone,
          email,
          address,
          // Embed Pemda info in address for restricted selections
          ...(selectedPeriod?.is_restricted && {
            address: `${jabatanPemda} | ${unitKerja} | ${address}`,
          }),
        })
        .select('id')
        .single()
      if (partErr) throw partErr

      // 4. Create application record
      const { error: appErr } = await supabase.from('applications').insert({
        participant_id: participant.id,
        // For restricted: we don't set position_id here (handled by panitia matching)
        period_id:    selectedPeriod!.id,
        status:       'submitted',
        submitted_at: new Date().toISOString(),
      })
      if (appErr) throw appErr

      // 5. Audit log
      await supabase.from('audit_logs').insert({
        user_id:    userId,
        action:     'REGISTER',
        table_name: 'users',
        record_id:  userId,
        new_data:   { email, role: 'peserta', period: selectedPeriod?.period_code },
      })

      setStep('selesai')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      {/* Header */}
      <div className="bg-[#0F172A] px-8 py-4 flex items-center gap-4">
        <a href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
              <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7L12 2z"/>
            </svg>
          </div>
          <span className="text-white font-extrabold text-[14px]">SIPSELBUMD</span>
        </a>
        <span className="text-white/30 text-sm">›</span>
        <span className="text-white/60 text-[13px]">Pendaftaran Peserta Seleksi</span>
      </div>

      <div className="flex-1 max-w-[700px] mx-auto w-full px-6 py-10">
        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-10">
          {(['pilih-seleksi', 'akun', 'profil', 'selesai'] as Step[]).map((s, i) => {
            const labels = ['Pilih Seleksi', 'Buat Akun', 'Data Diri', 'Selesai']
            const steps  = ['pilih-seleksi', 'akun', 'profil', 'selesai']
            const currentIdx = steps.indexOf(step)
            const isDone    = i < currentIdx
            const isActive  = s === step
            return (
              <div key={s} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold border-2 transition-all ${
                    isDone   ? 'bg-[#10B981] border-[#10B981] text-white' :
                    isActive ? 'bg-[#1E40AF] border-[#1E40AF] text-white' :
                               'bg-white border-[#E2E8F0] text-[#CBD5E1]'
                  }`}>
                    {isDone ? '✓' : i + 1}
                  </div>
                  <div className={`text-[10px] mt-1 font-medium whitespace-nowrap ${isActive ? 'text-[#1E40AF]' : isDone ? 'text-[#10B981]' : 'text-[#CBD5E1]'}`}>
                    {labels[i]}
                  </div>
                </div>
                {i < 3 && <div className={`flex-1 h-[2px] mx-2 mt-[-12px] ${i < currentIdx ? 'bg-[#10B981]' : 'bg-[#E2E8F0]'}`} />}
              </div>
            )
          })}
        </div>

        {/* STEP 1: Pilih Seleksi */}
        {step === 'pilih-seleksi' && (
          <div>
            <h1 className="text-[22px] font-extrabold text-[#0F172A] mb-1">Pilih Seleksi yang Diikuti</h1>
            <p className="text-[13px] text-[#64748B] mb-6">Pilih satu jenis seleksi yang ingin Anda ikuti pada periode ini.</p>

            {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-[13px] rounded-xl">{error}</div>}

            <div className="flex flex-col gap-3 mb-6">
              {periods.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => { setSelectedPeriod(p); setAccessCode(''); setAccessCodeValid(null) }}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    selectedPeriod?.id === p.id
                      ? 'border-[#1E40AF] bg-[#EFF6FF]'
                      : 'border-[#E2E8F0] bg-white hover:border-[#1E40AF]/30'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          p.is_restricted
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : 'bg-green-100 text-green-700 border border-green-200'
                        }`}>
                          {p.is_restricted ? '⚿ TERBATAS' : '● TERBUKA'}
                        </span>
                        <span className="text-[10px] text-[#94A3B8] font-medium">{p.bumd_short}</span>
                      </div>
                      <div className="text-[13.5px] font-bold text-[#0F172A]">{p.period_label}</div>
                      {p.is_restricted && (
                        <div className="text-[11.5px] text-amber-600 mt-1">
                          🔒 Memerlukan kode akses dari Panitia Seleksi
                        </div>
                      )}
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      selectedPeriod?.id === p.id ? 'border-[#1E40AF] bg-[#1E40AF]' : 'border-[#CBD5E1]'
                    }`}>
                      {selectedPeriod?.id === p.id && <div className="w-2 h-2 rounded-full bg-white" />}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Access code input for restricted */}
            {selectedPeriod?.is_restricted && (
              <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <div className="text-[12.5px] font-bold text-amber-800 mb-3">
                  ⚿ Masukkan Kode Akses Internal
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={accessCode}
                    onChange={(e) => { setAccessCode(e.target.value.toUpperCase()); setAccessCodeValid(null) }}
                    placeholder="Contoh: BWR-KOM-2026"
                    className="flex-1 px-3 py-2.5 border border-amber-200 rounded-lg text-[13px] font-mono bg-white outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={validateAccessCode}
                    disabled={loading || !accessCode.trim()}
                    className="px-4 py-2 bg-amber-500 text-white text-[12px] font-bold rounded-lg disabled:opacity-50"
                  >
                    Verifikasi
                  </button>
                </div>
                {accessCodeValid !== null && (
                  <div className={`mt-2 text-[12px] font-medium ${accessCodeValid ? 'text-green-600' : 'text-red-600'}`}>
                    {accessCodeValid ? '✓ ' : '✗ '}{accessCodeMsg}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              disabled={!canProceedFromPeriod()}
              onClick={() => setStep('akun')}
              className="w-full py-3.5 bg-[#1E40AF] text-white font-bold text-[14px] rounded-xl disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#1d4ed8] transition-colors"
            >
              Lanjutkan →
            </button>
          </div>
        )}

        {/* STEP 2: Buat Akun */}
        {step === 'akun' && (
          <div>
            <div className="mb-4 px-4 py-3 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl">
              <div className="text-[11px] font-bold text-[#1E40AF] uppercase tracking-wide mb-0.5">Seleksi Dipilih</div>
              <div className="text-[13px] font-semibold text-[#0F172A]">{selectedPeriod?.period_label}</div>
            </div>
            <h1 className="text-[22px] font-extrabold text-[#0F172A] mb-1">Buat Akun</h1>
            <p className="text-[13px] text-[#64748B] mb-6">Buat akun untuk mengakses sistem pendaftaran.</p>

            {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-[13px] rounded-xl">{error}</div>}

            <div className="flex flex-col gap-4">
              <FormField label="Alamat Email" required>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="email@domain.com"
                  className="form-input" />
              </FormField>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Kata Sandi" required>
                  <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 karakter"
                    className="form-input" />
                </FormField>
                <FormField label="Konfirmasi Kata Sandi" required>
                  <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi kata sandi"
                    className={`form-input ${confirmPassword && password !== confirmPassword ? 'border-red-300' : ''}`} />
                </FormField>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setStep('pilih-seleksi')}
                className="flex-1 py-3 border border-[#E2E8F0] text-[#64748B] font-semibold rounded-xl hover:bg-[#F8FAFC]">
                ← Kembali
              </button>
              <button type="button"
                disabled={!email || !password || password !== confirmPassword}
                onClick={() => { setError(null); setStep('profil') }}
                className="flex-[2] py-3 bg-[#1E40AF] text-white font-bold rounded-xl disabled:opacity-40 hover:bg-[#1d4ed8] transition-colors">
                Lanjutkan →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Data Diri */}
        {step === 'profil' && (
          <div>
            <h1 className="text-[22px] font-extrabold text-[#0F172A] mb-1">Lengkapi Data Diri</h1>
            <p className="text-[13px] text-[#64748B] mb-6">Pastikan data yang diisi sesuai dengan dokumen resmi.</p>

            {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-600 text-[13px] rounded-xl">{error}</div>}

            <div className="flex flex-col gap-4">
              <FormField label="NIK (Nomor Induk Kependudukan)" required>
                <input type="text" value={nik} onChange={e => setNik(e.target.value.replace(/\D/g,'').slice(0,16))}
                  placeholder="16 digit angka" maxLength={16}
                  className={`form-input font-mono ${nik && nik.length !== 16 ? 'border-amber-300' : ''}`} />
                {nik && nik.length !== 16 && <div className="text-[11px] text-amber-600 mt-1">{nik.length}/16 digit</div>}
              </FormField>

              <FormField label="Nama Lengkap (sesuai KTP)" required>
                <input type="text" value={fullName} onChange={e => setFullName(e.target.value.toUpperCase())}
                  placeholder="NAMA LENGKAP" className="form-input uppercase" />
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Tanggal Lahir" required>
                  <input type="date" value={birthDate} onChange={e => setBirthDate(e.target.value)} className="form-input" />
                </FormField>
                <FormField label="Jenis Kelamin" required>
                  <select value={gender} onChange={e => setGender(e.target.value as 'L' | 'P')} className="form-input">
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </select>
                </FormField>
              </div>

              <FormField label="Nomor HP/WhatsApp" required>
                <input type="tel" value={phone} onChange={e => setPhone(e.target.value.replace(/\D/g,'').slice(0,15))}
                  placeholder="08xxxxxxxxxx" className="form-input" />
              </FormField>

              <FormField label="Alamat Lengkap" required>
                <textarea value={address} onChange={e => setAddress(e.target.value)}
                  placeholder="Alamat sesuai KTP" rows={3} className="form-input resize-none" />
              </FormField>

              {/* Extra fields for internal Pemda */}
              {selectedPeriod?.is_restricted && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="text-[12px] font-bold text-amber-800 mb-3">Data Kepegawaian (Wajib untuk Seleksi Internal)</div>
                  <div className="flex flex-col gap-3">
                    <FormField label="Jabatan di Pemerintah Daerah" required>
                      <input type="text" value={jabatanPemda} onChange={e => setJabatanPemda(e.target.value)}
                        placeholder="Contoh: Kepala Dinas XYZ" className="form-input" />
                    </FormField>
                    <FormField label="Unit/OPD Kerja" required>
                      <input type="text" value={unitKerja} onChange={e => setUnitKerja(e.target.value)}
                        placeholder="Contoh: Dinas Pariwisata" className="form-input" />
                    </FormField>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setStep('akun')}
                className="flex-1 py-3 border border-[#E2E8F0] text-[#64748B] font-semibold rounded-xl hover:bg-[#F8FAFC]">
                ← Kembali
              </button>
              <button type="button"
                disabled={loading || !nik || !fullName || !birthDate || !phone || !address || (selectedPeriod?.is_restricted && (!jabatanPemda || !unitKerja))}
                onClick={handleRegister}
                className="flex-[2] py-3 bg-[#1E40AF] text-white font-bold rounded-xl disabled:opacity-40 hover:bg-[#1d4ed8] transition-colors">
                {loading ? 'Mendaftar...' : 'Daftar & Kirim →'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Selesai */}
        {step === 'selesai' && (
          <div className="text-center py-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
            </div>
            <h2 className="text-[22px] font-extrabold text-[#0F172A] mb-2">Pendaftaran Berhasil!</h2>
            <p className="text-[14px] text-[#64748B] mb-2 max-w-[400px] mx-auto">
              Akun Anda telah dibuat. Silakan cek email untuk konfirmasi, lalu login dan lengkapi dokumen persyaratan.
            </p>
            <div className="my-6 p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl text-left max-w-[400px] mx-auto">
              <div className="text-[11px] font-bold text-[#1E40AF] uppercase tracking-wide mb-2">Langkah Selanjutnya</div>
              {['Cek email dan klik link konfirmasi', 'Login ke sistem', 'Lengkapi dokumen persyaratan di portal peserta', 'Pantau status pendaftaran secara berkala'].map((s, i) => (
                <div key={i} className="flex items-start gap-2.5 mb-2">
                  <span className="w-5 h-5 bg-[#1E40AF] text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">{i+1}</span>
                  <span className="text-[12.5px] text-[#374151]">{s}</span>
                </div>
              ))}
            </div>
            <button onClick={() => router.push('/login')}
              className="px-8 py-3 bg-[#1E40AF] text-white font-bold rounded-xl hover:bg-[#1d4ed8] transition-colors">
              Menuju Halaman Login →
            </button>
          </div>
        )}
      </div>

      <style>{`.form-input { width: 100%; padding: 10px 14px; background: white; border: 1px solid #E2E8F0; border-radius: 10px; font-size: 13.5px; color: #0F172A; outline: none; font-family: inherit; transition: all 0.15s; } .form-input:focus { border-color: #1E40AF; box-shadow: 0 0 0 3px rgba(30,64,175,0.08); }`}</style>
    </div>
  )
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11.5px] font-bold text-[#374151] mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  )
}
