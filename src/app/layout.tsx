import type { Metadata } from 'next'
import { Toaster } from 'react-hot-toast'
import '@/styles/globals.css'

export const metadata: Metadata = {
  title:       'SIMBUBALADA – Pemerintah Kota Batu',
  description: 'Sistem Informasi Manajemen BUMD dan BLUD Pemerintah Kota Batu',
  icons:       { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              fontSize:     '12px',
              borderRadius: '8px',
              border:       '0.5px solid #e2e8f0',
              boxShadow:    '0 4px 12px rgba(0,0,0,.08)',
            },
          }}
        />
      </body>
    </html>
  )
}
