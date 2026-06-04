/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          light: '#131a31',
          DEFAULT: '#0a0e1a',
          dark: '#05070e',
        },
        gold: {
          light: '#f7d365',
          DEFAULT: '#f5c842',
          dark: '#cda225',
        },
        purple: {
          light: '#9061f3',
          DEFAULT: '#7c3aed',
          dark: '#6c2bd9',
        },
        xp: {
          DEFAULT: '#22c55e',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        cinzel: ['Cinzel', 'serif'],
      },
      boxShadow: {
        'gold-glow': '0 0 15px rgba(245, 200, 66, 0.45)',
        'purple-glow': '0 0 15px rgba(124, 58, 237, 0.45)',
        'xp-glow': '0 0 15px rgba(34, 197, 94, 0.45)',
      }
    },
  },
  plugins: [],
}
