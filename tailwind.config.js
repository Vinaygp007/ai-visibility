/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-space)", "sans-serif"],
        mono: ["var(--font-jetbrains)", "monospace"],
      },
      colors: {
        bg: "var(--c-bg)",
        surface: "var(--c-surface)",
        surface2: "var(--c-surface2)",
        accent: "var(--c-accent)",
        accent2: "var(--c-accent2)",
        accent3: "var(--c-accent3)",
        muted: "var(--c-muted)",
        ctext: "var(--c-text)",
      },
      animation: {
        spin: "spin 0.8s linear infinite",
        fadeUp: "fadeUp 0.5s ease forwards",
      },
      keyframes: {
        fadeUp: {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
