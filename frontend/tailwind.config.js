/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        luxury: {
          dark: '#0e1117',
          surface: '#161b22',
          card: '#1f242d',
          gold: '#c5a880',
          sand: '#e8dfd8',
          charcoal: '#212529',
          cream: '#fbf9f5',
          terracotta: '#c97a5a',
          emerald: '#10b981',
          razorblue: '#0c2340',
          razoraccent: '#3395ff'
        }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      }
    },
  },
  plugins: [],
}
