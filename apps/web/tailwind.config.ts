import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: { DEFAULT: "1rem", md: "1.5rem" }, screens: { "2xl": "1200px" } },
    extend: {
      colors: {
        brand: {
          DEFAULT: "var(--brand)",
          dark: "var(--brand-dark)",
          light: "var(--brand-light)",
          lime: "var(--brand-lime)",
          soft: "var(--brand-soft)",
        },
        ink: { DEFAULT: "var(--ink)", muted: "var(--ink-muted)" },
        surface: { DEFAULT: "var(--surface)", alt: "var(--surface-alt)" },
        line: "var(--line)",
        steel: "var(--steel)",
        danger: "var(--danger)",
      },
      fontFamily: { sans: ["Poppins", "system-ui", "Segoe UI", "sans-serif"] },
      borderRadius: { xl: "0.9rem", "2xl": "1.25rem" },
    },
  },
  plugins: [],
};

export default config;
