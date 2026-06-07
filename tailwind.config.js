/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        wheat: {
          50:  '#fbf7ef',
          100: '#f4e9cf',
          200: '#e7d29c',
          300: '#d8b665',
          400: '#cc9d3f',
          500: '#b88231',
          600: '#9a6628',
          700: '#7c4d24',
          800: '#5e3a1f',
          900: '#3f2715',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
