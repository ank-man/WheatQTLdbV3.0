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
        // A plain, neutral white/grey scale (every surface, border and text
        // colour in the app is one of these tokens) - kept under the
        // "wheat" name so the whole site re-themes just by editing these
        // ten values, with no per-component class changes needed. A single
        // green accent (Tailwind's built-in green-*) is used separately for
        // primary actions/links so the UI isn't flat monochrome.
        wheat: {
          50:  '#ffffff',
          100: '#f6f6f7',
          200: '#e7e7ea',
          300: '#d1d1d6',
          400: '#a8a8b0',
          500: '#7d7d86',
          600: '#57575f',
          700: '#42424a',
          800: '#2b2b30',
          900: '#19191c',
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
