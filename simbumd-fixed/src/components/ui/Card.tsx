import { cn } from '@/lib/utils'

interface CardProps {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

interface CardHeaderProps {
  title: string
  action?: React.ReactNode
  sub?: string
}

export function Card({ children, className, style }: CardProps) {
  return (
    <div
      className={cn('bg-white rounded-xl border border-gray-100 overflow-hidden', className)}
      style={style}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, action, sub }: CardHeaderProps) {
  return (
    <div style={{
      padding: '10px 16px',
      borderBottom: '0.5px solid #f1f5f9',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}>
      <div>
        <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a1a1a' }}>{title}</div>
        {sub && <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>{sub}</div>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

export function CardBody({ children, className, style }: CardProps) {
  return (
    <div className={cn('p-4', className)} style={style}>
      {children}
    </div>
  )
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  color = '#1E3A5F',
  bg = '#EBF2F9',
}: {
  label: string
  value: string | number
  sub?: string
  icon?: string
  color?: string
  bg?: string
}) {
  return (
    <div style={{
      background: '#fff',
      borderRadius: '10px',
      border: '0.5px solid #e5e7eb',
      padding: '12px 14px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', color: '#9ca3af' }}>{label}</span>
        {icon && (
          <div style={{
            width: '28px', height: '28px', borderRadius: '8px', background: bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className={`ti ${icon}`} style={{ fontSize: '15px', color }} aria-hidden />
          </div>
        )}
      </div>
      <div style={{ fontSize: '22px', fontWeight: '500', color, margin: '4px 0 2px' }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: '10px', color: '#9ca3af' }}>{sub}</div>}
    </div>
  )
}
