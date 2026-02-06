export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        clyr: { dark: '#2D3436', teal: '#5DADE2', light: '#D5E8F0', hover: '#4A9BD9' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
};
