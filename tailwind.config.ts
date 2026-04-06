import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Orbitron', 'sans-serif'],
        sans: ['Rajdhani', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        'cyber-black': '#05000a',
        'cyber-panel': '#0d001a',
        'cyber-cyan': '#00f3ff',
        'cyber-pink': '#ff00aa',
        'cyber-magenta': '#ff00ff',
        'cyber-yellow': '#fcee0a',
        'cyber-green': '#00ff9d',
        'cyber-purple': '#a855f7',
        'dark-bg': '#05000a',
        'dark-card': '#0d0117',
        'brand': {
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          900: '#0c4a6e',
        },
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        glitch: {
          '0%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-2px, 2px)' },
          '40%': { transform: 'translate(-2px, -2px)' },
          '60%': { transform: 'translate(2px, 2px)' },
          '80%': { transform: 'translate(2px, -2px)' },
          '100%': { transform: 'translate(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        scanline: 'scanline 8s linear infinite',
        glitch: 'glitch 0.3s cubic-bezier(.25,.46,.45,.94) both infinite',
        'pulse-fast': 'pulse 1s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fade-in 0.3s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
      backgroundImage: {
        'cyber-grid': "linear-gradient(to right, rgba(0,243,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,243,255,0.05) 1px, transparent 1px)",
        'cyber-gradient': 'linear-gradient(135deg, #00f3ff 0%, #ff00aa 100%)',
      },
      boxShadow: {
        neon: '0 0 5px #00f3ff, 0 0 10px #00f3ff',
        'neon-green': '0 0 5px #00ff9d, 0 0 10px #00ff9d',
        'neon-pink': '0 0 5px #ff00aa, 0 0 10px #ff00aa',
        'neon-magenta': '0 0 5px #ff00ff, 0 0 10px #ff00ff',
      },
    },
  },
  plugins: [],
} satisfies Config;
