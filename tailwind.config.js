/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          violet: '#6432FA',
          cyan: '#46E6E6',
          magenta: '#C83CFF',
          blue: '#0096D7',
        },
        ink: '#1a1a1a',
        page: '#e9ebf2',
      },
      fontFamily: {
        ui: ["'Segoe UI'", 'Arial', 'Helvetica', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
