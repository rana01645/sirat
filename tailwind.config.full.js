/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Warm sand — inspired by illuminated Quran manuscripts
        nur: {
          50: '#FFFBF5',
          100: '#FFF3E0',
          200: '#FFE4BD',
          300: '#F5D5A0',
          400: '#D4A574',
          500: '#B8864A',
          600: '#9A6B2F',
          700: '#7A5020',
          800: '#5A3A15',
          900: '#3A250D',
        },
        // Muted earth green — gardens of Jannah
        sakina: {
          50: '#F4F8F4',
          100: '#E2EDE2',
          200: '#C5D9C5',
          300: '#9DBF9D',
          400: '#7BA57B',
          500: '#5E8C5E',
          600: '#4A7A4A',
          700: '#3A6040',
          800: '#2A4830',
          900: '#1A3020',
        },
        // Deep night blue — peaceful darkness
        midnight: {
          50: '#F2F2F7',
          100: '#DCDCE5',
          200: '#B5B5CC',
          300: '#8585A8',
          400: '#5C5C80',
          500: '#2E2E4A',
          600: '#22223A',
          700: '#19192D',
          800: '#111120',
          900: '#0A0A14',
        },
      },
      fontFamily: {
        'arabic': ['Amiri-Regular'],
        'arabic-bold': ['Amiri-Bold'],
        'bengali': ['HindSiliguri-Regular'],
        'bengali-medium': ['HindSiliguri-Medium'],
        'bengali-bold': ['HindSiliguri-Bold'],
      },
    },
  },
  plugins: [],
};
