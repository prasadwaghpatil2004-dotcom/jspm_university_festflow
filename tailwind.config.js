/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "steel-charcoal": "#12151B",
        "frosted-surface": "#181C24",
        background: "var(--background)",
        card: "var(--card)",
      },
    },
  },
  plugins: [],
};
