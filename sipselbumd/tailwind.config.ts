import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary:    { DEFAULT: '#0F172A', foreground: '#F8FAFC' },
        secondary:  { DEFAULT: '#1E40AF', foreground: '#FFFFFF' },
        accent:     { DEFAULT: '#06B6D4', foreground: '#0F172A' },
        success:    '#10B981',
        warning:    '#F59E0B',
        danger:     '#EF4444',
        background: '#F8FAFC',
        muted:      { DEFAULT: '#F1F5F9', foreground: '#64748B' },
        border:     '#E2E8F0',
        card:       { DEFAULT: '#FFFFFF', foreground: '#0F172A' },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      fontSize: {
        xs:   ['11px', { lineHeight: '1.5' }],
        sm:   ['12.5px', { lineHeight: '1.5' }],
        base: ['14px',   { lineHeight: '1.6' }],
        lg:   ['16px',   { lineHeight: '1.5' }],
        xl:   ['18px',   { lineHeight: '1.4' }],
        '2xl':['22px',   { lineHeight: '1.3' }],
        '3xl':['28px',   { lineHeight: '1.2' }],
        '4xl':['36px',   { lineHeight: '1.1' }],
      },
      borderRadius: {
        sm:  '6px',
        md:  '8px',
        lg:  '10px',
        xl:  '12px',
        '2xl': '16px',
        '3xl': '20px',
      },
      boxShadow: {
        card:  '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        modal: '0 20px 60px rgba(0,0,0,0.2), 0 4px 16px rgba(0,0,0,0.1)',
        glow:  '0 0 20px rgba(30,64,175,0.2)',
        'glow-cyan': '0 0 20px rgba(6,182,212,0.2)',
      },
      animation: {
        'fade-in':  'fadeIn 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-ring': 'pulseRing 2s infinite',
      },
      keyframes: {
        fadeIn:    { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp:   { from: { opacity: '0', transform: 'translateY(8px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseRing: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(30,64,175,0.2)' },
          '50%':      { boxShadow: '0 0 0 6px rgba(30,64,175,0)' },
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #0F172A 0%, #1E3A8A 50%, #0284C7 100%)',
        'gradient-accent':  'linear-gradient(135deg, #1E40AF 0%, #06B6D4 100%)',
        'grid-pattern': `linear-gradient(rgba(30,64,175,0.05) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(30,64,175,0.05) 1px, transparent 1px)`,
      },
      backgroundSize: {
        'grid': '48px 48px',
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
  ],
}

export default config
