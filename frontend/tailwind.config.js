/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#15111F',
        surface: '#1F1930',
        surface2: '#282039',
        marquee: '#F4B740',
        marqueedim: '#C9922A',
        paper: '#FBF6EC',
        crimson: '#E8483E',
        mint: '#35D07F',
        held: '#F4B740',
        muted: '#A79FC0'
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
};
