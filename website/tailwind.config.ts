import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bmg-navy': '#1a365d',
        'bmg-blue': '#2c5aa0',
        'bmg-cream': '#f5f1e8',
        'bmg-gold': '#b8860b',
      },
      fontFamily: {
        serif: ['Georgia', 'serif'],
        sans: ['Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
