/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        golf: {
          green: {
            50: '#f0f7f4',
            100: '#dcedde',
            200: '#bddbbf',
            300: '#90bf94',
            400: '#5f9d65',
            500: '#1b5e3f', // Luxury Forest Green
            600: '#0f442b',
            700: '#0a3520',
            800: '#062315',
            900: '#041b10', // Deepest Green
            950: '#02100a',
          },
          gold: {
            50: '#fdfbeb',
            100: '#fbf5e1',
            200: '#f7ebb9',
            300: '#eed680',
            400: '#e2c079',
            500: '#d4af37', // Metallic Gold
            600: '#b89326',
            700: '#937217',
            800: '#6f540f',
            900: '#4c390a',
          },
          charcoal: {
            50: '#f6f7f6',
            100: '#eef1ef',
            200: '#d5dad7',
            300: '#b1b9b4',
            400: '#848d88',
            500: '#626b66',
            600: '#4d5450',
            700: '#3f4441',
            800: '#1e2220', // Luxury dark gray
            900: '#121513', // Body dark backdrop
            950: '#090b0a',
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        serif: ['"Playfair Display"', 'Georgia', 'serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out forwards',
        'slide-up': 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'pulse-slow': 'pulse 3.0s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        }
      }
    },
  },
  plugins: [],
}
