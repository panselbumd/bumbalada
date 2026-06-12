'use client'

import { useState, useTransition } from 'react'
import { login } from '@/lib/actions/auth'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError('')
    const formData = new FormData(e.currentTarget)

    startTransition(async () => {
      const result = await login(formData)
      if (result?.error) {
        setError(result.error)
        toast.error(result.error)
      }
    })
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f2340 0%, #1E3A5F 60%, #16304F 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      {/* Background pattern */}
      <div style={{
        position: 'fixed', inset: 0, opacity: 0.03,
        backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
        backgroundSize: '32px 32px',
        pointerEvents: 'none',
      }} />

      <div style={{ width: '100%', maxWidth: '400px', position: 'relative' }}>
        {/* Logo area */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: '56px', height: '56px', background: 'rgba(255,255,255,.12)',
            borderRadius: '16px', border: '1px solid rgba(255,255,255,.15)',
            marginBottom: '16px',
          }}>
            <i className="ti ti-building-community" style={{ fontSize: '28px', color: '#fff' }} />
          </div>
          <h1 style={{
            color: '#fff', fontSize: '22px', fontWeight: '600',
            letterSpacing: '-0.02em', margin: 0,
          }}>SIMBUMD</h1>
          <p style={{ color: 'rgba(255,255,255,.55)', fontSize: '12px', marginTop: '4px' }}>
            Pemerintah Kota Batu
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', borderRadius: '16px',
          padding: '32px', boxShadow: '0 24px 64px rgba(0,0,0,.25)',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: '500', marginBottom: '6px', color: '#1a1a1a' }}>
            Masuk ke Sistem
          </h2>
          <p style={{ fontSize: '11px', color: '#6b7280', marginBottom: '24px' }}>
            Gunakan email instansi dan kata sandi Anda
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                Email Instansi
              </label>
              <div style={{ position: 'relative' }}>
                <i className="ti ti-mail" style={{
                  position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                  fontSize: '16px', color: '#9ca3af',
                }} />
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="nama@kotabatu.go.id"
                  disabled={pending}
                  style={{
                    width: '100%', padding: '9px 12px 9px 34px',
                    border: `1px solid ${error ? '#fca5a5' : '#e5e7eb'}`,
                    borderRadius: '8px', fontSize: '12px',
                    outline: 'none', background: '#fafafa',
                    color: '#1a1a1a',
                  }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>
                Kata Sandi
              </label>
              <div style={{ position: 'relative' }}>
                <i className="ti ti-lock" style={{
                  position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
                  fontSize: '16px', color: '#9ca3af',
                }} />
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  disabled={pending}
                  style={{
                    width: '100%', padding: '9px 12px 9px 34px',
                    border: `1px solid ${error ? '#fca5a5' : '#e5e7eb'}`,
                    borderRadius: '8px', fontSize: '12px',
                    outline: 'none', background: '#fafafa',
                    color: '#1a1a1a',
                  }}
                />
              </div>
            </div>

            {error && (
              <div style={{
                background: '#FEF2F2', border: '1px solid #FECACA',
                borderRadius: '8px', padding: '8px 12px',
                fontSize: '11px', color: '#DC2626',
                display: 'flex', alignItems: 'center', gap: '6px',
                marginBottom: '14px',
              }}>
                <i className="ti ti-alert-circle" style={{ fontSize: '14px' }} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={pending}
              style={{
                width: '100%', padding: '10px',
                background: pending ? '#93a3b8' : '#1E3A5F',
                color: '#fff', border: 'none',
                borderRadius: '8px', fontSize: '12px', fontWeight: '500',
                cursor: pending ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                transition: 'background .15s',
              }}
            >
              {pending ? (
                <>
                  <i className="ti ti-loader-2" style={{ fontSize: '15px', animation: 'spin 1s linear infinite' }} />
                  Memverifikasi...
                </>
              ) : (
                <>
                  <i className="ti ti-login" style={{ fontSize: '15px' }} />
                  Masuk
                </>
              )}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,.35)', marginTop: '20px' }}>
          Hubungi Admin jika lupa kata sandi · SIMBUMD v1.0
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
