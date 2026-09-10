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
        // Dark-mode surfaces only (page/card/border backgrounds). A proper
        // near-black neutral - not another step of the saturated wheat
        // ramp - gives dark mode real elevation between background/card/
        // hover instead of one flat brown-on-brown wash; the wheat hue is
        // kept as a faint warm undertone so it still reads as this site's
        // dark mode, not a generic gray one.
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
