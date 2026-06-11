/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverActions: {
      // Izinkan localhost (dev) + semua subdomain vercel.app + domain custom
      allowedOrigins: [
        'localhost:3000',
        'simbubalada.vercel.app',
        '*.vercel.app',
      ],
    },
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }],
  },
}

module.exports = nextConfig
