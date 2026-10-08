/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Elegant Parrot Green Theme Palette
        emerald: {
          50: '#F5FBF5',   // Very Light Green
          100: '#EAF8EC',  // Light Green
          200: '#D2F2D7',  // Soft Light Green Accent
          300: '#A3E4AF',  // Soft Accent
          400: '#6BD279',  // Accent
          500: '#39B54A',  // Primary Parrot Green
          600: '#39B54A',  // Primary Parrot Green (#39B54A)
          700: '#168A35',  // Dark Green (#168A35)
          800: '#126E2A',  // Deep Dark Green
          900: '#0E5420',
          950: '#083313',
        },
        green: {
          50: '#F5FBF5',
          100: '#EAF8EC',
          200: '#D2F2D7',
          300: '#A3E4AF',
          400: '#6BD279',
          500: '#39B54A',
          600: '#39B54A',
          700: '#168A35',
          800: '#126E2A',
          900: '#0E5420',
          950: '#083313',
        },
        brand: {
          50: '#F5FBF5',
          100: '#EAF8EC',
          500: '#39B54A',
          600: '#39B54A',
          700: '#168A35',
          800: '#126E2A',
          900: '#0E5420',
        },
        slate: {
          50: '#F8FAF9',   // Background (#F8FAF9)
          100: '#F0F4F2',  // Light Fill
          200: '#E2E8E5',  // Borders (#E2E8E5)
          300: '#CBD5E1',  // Subtle Dividers
          400: '#94A3B8',  // Placeholders / Muted
          500: '#64748B',  // Secondary Text (#64748B)
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#172033',  // Primary Text (#172033)
        },
        parrot: {
          primary: '#39B54A',
          dark: '#168A35',
          light: '#EAF8EC',
          veryLight: '#F5FBF5',
          bg: '#F8FAF9',
          card: '#FFFFFF',
          text: '#172033',
          secondary: '#64748B',
          border: '#E2E8E5',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
