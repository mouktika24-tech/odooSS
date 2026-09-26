/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        odoo: {
          purple: '#714B67',
          dark: '#1E293B',
          teal: '#00A09D',
        }
      },
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

