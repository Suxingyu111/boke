/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,ts}'],
  theme: {
    extend: {
      colors: {
        ink: '#111414',
        paper: '#f7f9f8',
        line: '#d7dedb',
        moss: '#185c52',
        coral: '#c6283f',
        citron: '#f0c808',
        cobalt: '#255f85',
      },
      fontFamily: {
        display: ['Georgia', 'Times New Roman', 'serif'],
        body: ['Avenir Next', 'Trebuchet MS', 'Verdana', 'sans-serif'],
      },
      boxShadow: {
        editorial: '0 18px 40px rgba(17, 20, 20, 0.12)',
      },
    },
  },
  plugins: [],
}
