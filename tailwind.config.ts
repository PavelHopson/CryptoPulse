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
        'cyber-black': 'rgb(var(--color-bg) / <alpha-value>)',
        'cyber-panel': 'rgb(var(--color-panel) / <alpha-value>)',
        'cyber-cyan': 'rgb(var(--color-accent) / <alpha-value>)',
        'cyber-pink': 'rgb(var(--color-accent2) / <alpha-value>)',
        'cyber-magenta': 'rgb(var(--color-accent2) / <alpha-value>)',
        'cyber-yellow': 'rgb(var(--color-warning) / <alpha-value>)',
        'cyber-green': 'rgb(var(--color-success) / <alpha-value>)',
        'cyber-purple': 'rgb(var(--color-purple) / <alpha-value>)',
        'dark-bg': 'rgb(var(--color-bg) / <alpha-value>)',
        'dark-card': 'rgb(var(--color-card) / <alpha-value>)',
        'brand': {
          400: 'rgb(var(--color-brand) / <alpha-value>)',
          500: 'rgb(var(--color-brand) / <alpha-value>)',
          600: 'rgb(var(--color-brand) / <alpha-value>)',
          900: 'rgb(var(--color-bg) / <alpha-value>)',
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
        'cyber-grid': "linear-gradient(to right, rgba(var(--color-accent), 0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(var(--color-accent), 0.05) 1px, transparent 1px)",
        'cyber-gradient': 'linear-gradient(135deg, rgb(var(--color-accent)) 0%, rgb(var(--color-accent2)) 100%)',
      },
      boxShadow: {
        neon: '0 0 5px rgb(var(--color-accent)), 0 0 10px rgb(var(--color-accent))',
        'neon-green': '0 0 5px rgb(var(--color-success)), 0 0 10px rgb(var(--color-success))',
        'neon-pink': '0 0 5px rgb(var(--color-accent2)), 0 0 10px rgb(var(--color-accent2))',
        'neon-magenta': '0 0 5px rgb(var(--color-accent2)), 0 0 10px rgb(var(--color-accent2))',
      },
    },
  },
  plugins: [],
} satisfies Config;
