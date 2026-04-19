/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{vue,ts}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: "#10141a",
        paper: "#eef2f6",
        surface: "#f7f9fb",
        wash: "#e5ebf1",
        line: "#cfd8e3",
        moss: "#2f7c6e",
        sage: "#91a9b8",
        coral: "#c96b34",
        citron: "#f2c56a",
        cobalt: "#1f4d6d",
        brand: "#1f4d6d",
      },
      fontFamily: {
        display: ["Cormorant Garamond", "STSong", "Songti SC", "serif"],
        body: ["Manrope", "PingFang SC", "Microsoft YaHei", "sans-serif"],
        mono: ["JetBrains Mono", "Consolas", "monospace"],
      },
      boxShadow: {
        editorial: "0 22px 56px rgba(16, 20, 26, 0.11)",
        lifted: "0 14px 36px rgba(16, 20, 26, 0.13)",
        insetline: "inset 0 0 0 1px rgba(16, 20, 26, 0.08)",
      },
      keyframes: {
        rise: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        rise: "rise 280ms ease-out both",
      },
    },
  },
  plugins: [],
};
