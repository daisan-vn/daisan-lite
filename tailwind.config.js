/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#eef3ff',
          100: '#dde7ff',
          200: '#bcd0ff',
          300: '#8eafff',
          400: '#5e85ff',
          500: '#3b5cf5',
          600: '#2a40e6',
          700: '#2231c2',
          800: '#1f2c9c',
          900: '#1d2a7a',
          950: '#161b48'
        },
        ink: {
          50:  '#f7f8fa',
          100: '#eef0f4',
          200: '#dde1ea',
          300: '#c0c6d4',
          400: '#9ba3b6',
          500: '#717a90',
          600: '#5a6278',
          700: '#454c5e',
          800: '#2d3243',
          900: '#181c2b',
          950: '#0f1220'
        }
      },
      fontFamily: {
        sans: ['"Be Vietnam Pro"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Consolas', 'monospace']
      },
      boxShadow: {
        'soft': '0 1px 2px rgb(15 18 32 / 0.04), 0 4px 12px rgb(15 18 32 / 0.04)',
        'card': '0 1px 3px rgb(15 18 32 / 0.06), 0 8px 24px rgb(15 18 32 / 0.06)'
      },
      animation: {
        'pulse-slow': 'pulse 2.5s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite'
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        }
      }
    }
  },
  plugins: []
}
