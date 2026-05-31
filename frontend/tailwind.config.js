/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
      },
      colors: {
        bg: {
          1: '#0f0f13',
          2: '#17171e',
          3: '#1e1e28',
          4: '#26262f',
        },
        accent: {
          DEFAULT: '#00d97e',
          dark: '#00b868',
        },
      },
    },
  },
  plugins: [],
}
