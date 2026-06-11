/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#EBF2F9',
          100: '#B5D4F4',
          200: '#85B7EB',
          500: '#185FA5',
          600: '#1E3A5F',
          700: '#16304F',
          800: '#0C447C',
          900: '#042C53',
        },
        sehat: {
          bg:   '#EAF3DE',
          text: '#27500A',
          border:'#C0DD97',
        },
        kurang: {
          bg:   '#FAEEDA',
          text: '#633806',
          border:'#FAC775',
        },
        tidak: {
          bg:   '#FCEBEB',
          text: '#791F1F',
          border:'#F7C1C1',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['10px', '14px'],
        xs:    ['11px', '16px'],
        sm:    ['12px', '18px'],
      },
    },
  },
  plugins: [],
}
