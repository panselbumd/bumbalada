'use client'

import { cn } from '@/lib/utils'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md'
  icon?: string
  loading?: boolean
}

const VARIANT_STYLES = {
  primary:   { background: '#1E3A5F', color: '#fff',    border: '1px solid #1E3A5F' },
  secondary: { background: '#fff',    color: '#374151', border: '0.5px solid #e5e7eb' },
  danger:    { background: '#FCEBEB', color: '#791F1F', border: '0.5px solid #F7C1C1' },
  ghost:     { background: 'transparent', color: '#6b7280', border: '0.5px solid transparent' },
}

const SIZE_STYLES = {
  sm: { padding: '4px 10px', fontSize: '11px' },
  md: { padding: '7px 14px', fontSize: '12px' },
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  loading,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const vs = VARIANT_STYLES[variant]
  const ss = SIZE_STYLES[size]

  return (
    <button
      {...props}
      disabled={disabled || loading}
      style={{
        ...vs,
        ...ss,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        borderRadius: '8px',
        fontWeight: '500',
        cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        opacity: (disabled || loading) ? 0.6 : 1,
        transition: 'all .15s',
        fontFamily: 'inherit',
        ...(props.style ?? {}),
      }}
    >
      {loading ? (
        <i className="ti ti-loader-2" style={{ fontSize: '14px', animation: 'spin 1s linear infinite' }} aria-hidden />
      ) : icon ? (
        <i className={`ti ${icon}`} style={{ fontSize: '14px' }} aria-hidden />
      ) : null}
      {children}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </button>
  )
}
