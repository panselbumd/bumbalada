'use client'

import { useEffect } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title: string
  children: React.ReactNode
  footer?: React.ReactNode
  width?: number
}

export function Modal({ open, onClose, title, children, footer, width = 420 }: ModalProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: '20px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '12px',
          border: '0.5px solid #e5e7eb',
          width: '100%', maxWidth: width,
          boxShadow: '0 20px 60px rgba(0,0,0,.15)',
          overflow: 'hidden',
          animation: 'modalIn .15s ease',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '0.5px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>{title}</span>
          <button
            onClick={onClose}
            style={{
              width: '26px', height: '26px', borderRadius: '6px',
              border: '0.5px solid #e5e7eb', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: '#9ca3af',
            }}
          >
            <i className="ti ti-x" style={{ fontSize: '14px' }} aria-hidden />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '18px' }}>{children}</div>

        {/* Footer */}
        {footer && (
          <div style={{
            padding: '12px 18px',
            borderTop: '0.5px solid #f1f5f9',
            display: 'flex', justifyContent: 'flex-end', gap: '8px',
          }}>
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(.96) translateY(8px); }
          to   { opacity: 1; transform: scale(1)  translateY(0); }
        }
      `}</style>
    </div>
  )
}

interface FormFieldProps {
  label: string
  required?: boolean
  children: React.ReactNode
  hint?: string
}

export function FormField({ label, required, children, hint }: FormFieldProps) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <label style={{
        display: 'block', fontSize: '11px', fontWeight: '500',
        color: '#374151', marginBottom: '5px',
      }}>
        {label}
        {required && <span style={{ color: '#DC2626', marginLeft: '3px' }}>*</span>}
      </label>
      {children}
      {hint && (
        <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '4px' }}>{hint}</div>
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '8px 10px',
  border: '0.5px solid #e5e7eb', borderRadius: '7px',
  fontSize: '12px', background: '#fafafa',
  color: '#1a1a1a', fontFamily: 'inherit',
  outline: 'none',
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...inputStyle, ...props.style }} />
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...inputStyle, ...props.style }} />
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...inputStyle, resize: 'vertical', minHeight: '80px', ...props.style }} />
}
