/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#714B67',
        secondary: '#1E293B',
        accent: '#00A09D',
        background: '#F8FAFC',
        surface: '#FFFFFF',
        border: '#E2E8F0',
        'odoo-purple': '#714B67',
        'odoo-dark': '#1E293B',
        'odoo-teal': '#00A09D',
      },
    },
  },
  plugins: [],
}