/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: {
          base: '#050505',
          surface: '#0A0A0A',
          overlay: '#121212',
        },
        primary: {
          DEFAULT: '#00F0FF',
          glow: 'rgba(0, 240, 255, 0.5)',
          dim: '#008F99',
        },
        secondary: {
          DEFAULT: '#BC13FE',
          glow: 'rgba(188, 19, 254, 0.5)',
          dim: '#7A0C99',
        },
        success: '#00FF41',
        warning: '#FAFF00',
        error: '#FF003C',
      },
      fontFamily: {
        heading: ['Orbitron', 'sans-serif'],
        body: ['Rajdhani', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      boxShadow: {
        'glow-primary': '0 0 15px rgba(0, 240, 255, 0.4)',
        'glow-secondary': '0 0 15px rgba(188, 19, 254, 0.4)',
        'glow-success': '0 0 15px rgba(0, 255, 65, 0.4)',
      },
      animation: {
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'scan': 'scan 4s linear infinite',
      },
      keyframes: {
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px rgba(0, 240, 255, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(0, 240, 255, 0.6)' },
        },
        'scan': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
      },
    },
  },
  plugins: [],
};
