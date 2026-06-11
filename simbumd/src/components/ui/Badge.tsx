import { cn } from '@/lib/utils'

type Variant = 'sehat' | 'kurang' | 'tidak' | 'wtp' | 'wdp' | 'tmp' | 'info' | 'default'

const CONFIG: Record<Variant, { bg: string; text: string; border: string }> = {
  sehat:   { bg: '#EAF3DE', text: '#27500A', border: '#C0DD97' },
  kurang:  { bg: '#FAEEDA', text: '#633806', border: '#FAC775' },
  tidak:   { bg: '#FCEBEB', text: '#791F1F', border: '#F7C1C1' },
  wtp:     { bg: '#EAF3DE', text: '#27500A', border: '#C0DD97' },
  wdp:     { bg: '#FAEEDA', text: '#633806', border: '#FAC775' },
  tmp:     { bg: '#FCEBEB', text: '#791F1F', border: '#F7C1C1' },
  info:    { bg: '#EBF2F9', text: '#0C447C', border: '#B5D4F4' },
  default: { bg: '#f1f5f9', text: '#6b7280', border: '#e2e8f0' },
}

interface BadgeProps {
  variant?: Variant
  children: React.ReactNode
  className?: string
  icon?: string
}

export function Badge({ variant = 'default', children, className, icon }: BadgeProps) {
  const c = CONFIG[variant]
  return (
    <span
      className={cn('inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full', className)}
      style={{ background: c.bg, color: c.text, border: `0.5px solid ${c.border}` }}
    >
      {icon && <i className={`ti ${icon}`} style={{ fontSize: '11px' }} aria-hidden />}
      {children}
    </span>
  )
}
