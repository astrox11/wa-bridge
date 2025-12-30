/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Material Design 3 Tonal Palette - Primary: #6750A4
        primary: {
          DEFAULT: '#6750A4',
          light: '#EADDFF',
          dark: '#21005D',
          container: '#EADDFF',
          'on-container': '#21005D',
        },
        secondary: {
          DEFAULT: '#625B71',
          light: '#E8DEF8',
          dark: '#1D192B',
          container: '#E8DEF8',
          'on-container': '#1D192B',
        },
        tertiary: {
          DEFAULT: '#7D5260',
          light: '#FFD8E4',
          dark: '#31111D',
          container: '#FFD8E4',
          'on-container': '#31111D',
        },
        error: {
          DEFAULT: '#B3261E',
          light: '#F9DEDC',
          dark: '#601410',
          container: '#F9DEDC',
          'on-container': '#410E0B',
        },
        surface: {
          DEFAULT: '#FEF7FF',
          dim: '#DED8E1',
          bright: '#FEF7FF',
          'container-lowest': '#FFFFFF',
          'container-low': '#F7F2FA',
          container: '#F3EDF7',
          'container-high': '#ECE6F0',
          'container-highest': '#E6E0E9',
          'on-surface': '#1D1B20',
          'on-surface-variant': '#49454F',
        },
        outline: {
          DEFAULT: '#79747E',
          variant: '#CAC4D0',
        },
        // Dark mode surfaces
        'surface-dark': {
          DEFAULT: '#141218',
          dim: '#141218',
          bright: '#3B383E',
          'container-lowest': '#0F0D13',
          'container-low': '#1D1B20',
          container: '#211F26',
          'container-high': '#2B2930',
          'container-highest': '#36343B',
          'on-surface': '#E6E0E9',
          'on-surface-variant': '#CAC4D0',
        },
        'outline-dark': {
          DEFAULT: '#938F99',
          variant: '#49454F',
        },
        'primary-dark': {
          DEFAULT: '#D0BCFF',
          container: '#4F378B',
          'on-container': '#EADDFF',
        },
      },
      fontFamily: {
        sans: ['Roboto', 'system-ui', 'sans-serif'],
        display: ['Product Sans', 'Roboto', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
        '4xl': '28px',
      },
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
      },
      boxShadow: {
        'elevation-1': '0 1px 2px rgba(0, 0, 0, 0.3), 0 1px 3px 1px rgba(0, 0, 0, 0.15)',
        'elevation-2': '0 1px 2px rgba(0, 0, 0, 0.3), 0 2px 6px 2px rgba(0, 0, 0, 0.15)',
        'elevation-3': '0 4px 8px 3px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.3)',
        'elevation-4': '0 6px 10px 4px rgba(0, 0, 0, 0.15), 0 2px 3px rgba(0, 0, 0, 0.3)',
        'elevation-5': '0 8px 12px 6px rgba(0, 0, 0, 0.15), 0 4px 4px rgba(0, 0, 0, 0.3)',
      },
      animation: {
        'ripple': 'ripple 0.6s linear',
      },
      keyframes: {
        ripple: {
          '0%': { transform: 'scale(0)', opacity: '0.5' },
          '100%': { transform: 'scale(4)', opacity: '0' },
        },
      },
    },
  },
  plugins: [],
};
