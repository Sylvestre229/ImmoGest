/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#0F1A17", soft: "#3A4A45", faint: "#7A8783" },
        paper: "#FBFAF6",
        surface: "#F0EDE4",
        line: "#DFDACD",
        brand: { DEFAULT: "#0E6E5C", dark: "#0A5446", light: "#E3F0EC" },
        ok: { DEFAULT: "#2E9E6B", soft: "#E6F4EC" },
        warn: { DEFAULT: "#D98324", soft: "#FCF0E1" },
        alert: { DEFAULT: "#C4352B", soft: "#FBE9E7" },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      borderRadius: { xl: "10px", "2xl": "14px" },
    },
  },
  plugins: [],
};
