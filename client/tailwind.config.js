/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,ts}"],
  theme: {
    extend: {
      colors: {
        ink: "#111414",
        paper: "#f7f9f8",
        surface: "#ffffff",
        wash: "#eef3f0",
        line: "#d7dedb",
        moss: "#185c52",
        sage: "#8aa39b",
        coral: "#c6283f",
        citron: "#f0c808",
        cobalt: "#255f85",
      },
      fontFamily: {
        display: ["Libre Bodoni", "Georgia", "Times New Roman", "serif"],
        body: [
          "Public Sans",
          "Avenir Next",
          "Trebuchet MS",
          "Verdana",
          "sans-serif",
        ],
        mono: ["IBM Plex Mono", "Consolas", "monospace"],
      },
      boxShadow: {
        editorial: "0 22px 60px rgba(17, 20, 20, 0.12)",
        lifted: "0 14px 34px rgba(17, 20, 20, 0.10)",
        insetline: "inset 0 0 0 1px rgba(17, 20, 20, 0.06)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        rise: "rise 240ms ease-out both",
      },
    },
  },
  plugins: [],
};
