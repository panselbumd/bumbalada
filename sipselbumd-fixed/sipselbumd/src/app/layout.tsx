import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'SIPSELBUMD — Sistem Informasi Seleksi BUMD',
  description: 'Platform digital resmi pelaksanaan seleksi pejabat Badan Usaha Milik Daerah',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  )
}
