/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // Scoped, not global: dark: variants only take effect inside an ancestor
  // carrying the "dark" class, which only the Map page's plot panel ever
  // applies (a local per-viewer toggle, not a site-wide theme).
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
        // Dark surfaces for the plotting-area dark mode only.
        ink: {
          700: '#3c3227',
          800: '#251e16',
          900: '#17120c',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        serif: ['"Source Serif 4"', 'Georgia', 'Cambria', 'serif'],
      },
    },
  },
  plugins: [],
}
