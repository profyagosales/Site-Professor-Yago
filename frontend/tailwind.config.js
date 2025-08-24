/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors:{ ys:{ orange1:"#FFB082", orange2:"#FF7E6D" } },
      boxShadow:{ glass:"0 8px 24px rgba(0,0,0,.12)" }
    }
  },
  plugins: []
}
