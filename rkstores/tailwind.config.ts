import type { Config } from "tailwindcss";

// Design tokens for the whole site. Change the `brand` colours here to re-theme every page.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff", 100: "#e0e7ff", 200: "#c7d2fe", 300: "#a5b4fc", 400: "#818cf8",
          500: "#6366f1", 600: "#4f46e5", 700: "#4338ca", 800: "#3730a3", 900: "#312e81",
        },
        accent: { 400: "#fb7185", 500: "#f43f5e", 600: "#e11d48" },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15,23,42,.05), 0 4px 14px -4px rgba(15,23,42,.08)",
        lift: "0 2px 4px rgba(15,23,42,.06), 0 14px 32px -10px rgba(79,70,229,.28)",
      },
      backgroundImage: {
        "brand-gradient": "linear-gradient(135deg, #4f46e5 0%, #6366f1 55%, #7c3aed 100%)",
        "wa-gradient": "linear-gradient(135deg, #16a34a 0%, #22c55e 100%)",
        "hero-gradient": "linear-gradient(135deg, #312e81 0%, #4f46e5 50%, #7c3aed 100%)",
      },
      keyframes: {
        "fade-up": { "0%": { opacity: "0", transform: "translateY(10px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        "pop": { "0%": { transform: "scale(.8)", opacity: "0" }, "100%": { transform: "scale(1)", opacity: "1" } },
      },
      animation: {
        "fade-up": "fade-up .45s cubic-bezier(.2,.7,.2,1) both",
        "pop": "pop .25s ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
