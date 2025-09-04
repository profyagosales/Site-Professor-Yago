/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx,js,jsx}",
  ],
  safelist: [
    // evitar purge de classes geradas dinamicamente
    "bg-ys-amber", "text-ys-amber", "from-ys-bg/60", "to-ys-bg",
  ],
  theme: {
    extend: {
      colors: {
        // laranja de marca - ajustado para melhor contraste
        "ys-amber": "#E66A00", // escurecido 5% para melhor contraste
        "ys-amber-light": "#FF7A00", // cor original para elementos não-texto
        // cinzas claros com contraste alto para textos
        "ys-bg":    "#F2F4F7",
        "ys-card":  "#FFFFFF",
        "ys-ink":   "#0F172A",   // texto principal (bem escuro)
        "ys-ink-2": "#334155",   // texto secundário
        "ys-ink-3": "#475569",   // legendas
        "ys-line":  "#E5E7EB",   // linhas/bordas leves
        // Cores de contraste melhorado
        "ys-amber-text": "#B45309", // para texto sobre fundo claro
        "ys-amber-bg": "#FEF3C7", // fundo para texto laranja
        ys: { orange1: "#FFB082", orange2: "#FF7E6D" },
      },
      boxShadow: {
        "ys-sm":  "0 1px 2px rgba(2,6,23,0.06), 0 1px 1px rgba(2,6,23,0.04)",
        "ys-md":  "0 6px 16px rgba(2,6,23,0.08)",
        "ys-lg":  "0 18px 40px rgba(2,6,23,0.10)",
        "ys-glow":"0 0 0 6px rgba(255,122,0,.08), 0 18px 50px rgba(2,6,23,.12)",
        glass: "0 8px 24px rgba(0,0,0,.12)",
      },
      fontFamily: {
        display: ["Inter", "system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
        body:    ["Inter", "system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
      },
      borderRadius: {
        xl: "14px",
        "2xl": "22px",
      },
      transitionDuration: {
        250: "250ms",
      },
    },
  },
  plugins: [],
}
