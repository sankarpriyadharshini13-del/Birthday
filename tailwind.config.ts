import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#2A1033',
        plum: { DEFAULT: '#1E0B2E', soft: '#3A1A52' },
        marigold: '#FFC233',
        hibiscus: '#FF4F81',
        paper: '#FFF7EC',
        teal: '#19B8A6',
        sky: '#6CCBFF',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0) rotate(-2deg)' }, '50%': { transform: 'translateY(-8px) rotate(-1deg)' } },
        rise: { '0%': { transform: 'translateY(20vh)', opacity: '0' }, '10%': { opacity: '1' }, '100%': { transform: 'translateY(-130vh)', opacity: '1' } },
        pop: { '0%': { transform: 'scale(.6)', opacity: '0' }, '70%': { transform: 'scale(1.06)' }, '100%': { transform: 'scale(1)', opacity: '1' } },
        flame: { '0%,100%': { transform: 'scaleY(1)' }, '50%': { transform: 'scaleY(1.2) translateY(-1px)' } },
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        rise: 'rise 14s linear infinite',
        pop: 'pop .8s cubic-bezier(.2,1.2,.3,1) both',
        flame: 'flame 1s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
