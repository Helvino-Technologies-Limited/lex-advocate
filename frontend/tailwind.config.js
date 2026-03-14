/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#fdf8ec', 100: '#faefc9', 200: '#f5da8f', 300: '#efc154',
          400: '#e9a82a', 500: '#c9861a', 600: '#a86514', 700: '#8b4f13',
          800: '#723f14', 900: '#5e3413', 1000: '#c9a96e'
        },
        navy: {
          50: '#f0f4ff', 100: '#dce6ff', 200: '#b5ceff', 300: '#7ea9ff',
          400: '#4080ff', 500: '#1a5eff', 600: '#0040f5', 700: '#0033cc',
          800: '#002999', 900: '#001a5e', 950: '#0a0f2e'
        },
        cream: { DEFAULT: '#f8f4ed', dark: '#ede8df' }
      },
      fontFamily: {
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace']
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.4s ease-out',
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'float': 'float 6s ease-in-out infinite',
        'shimmer': 'shimmer 2s infinite'
      },
      keyframes: {
        fadeIn: { '0%': { opacity: 0 }, '100%': { opacity: 1 } },
        slideUp: { '0%': { transform: 'translateY(20px)', opacity: 0 }, '100%': { transform: 'translateY(0)', opacity: 1 } },
        slideInRight: { '0%': { transform: 'translateX(100%)', opacity: 0 }, '100%': { transform: 'translateX(0)', opacity: 1 } },
        float: { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-10px)' } },
        shimmer: { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } }
      },
      boxShadow: {
        'gold': '0 4px 24px rgba(201, 169, 110, 0.3)',
        'gold-lg': '0 8px 40px rgba(201, 169, 110, 0.4)',
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.08)',
        'card-hover': '0 8px 32px rgba(0,0,0,0.12)'
      }
    }
  },
  plugins: []
}
