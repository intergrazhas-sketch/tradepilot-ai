/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          900: "#15171C",
          700: "#3A3D46",
          500: "#6B6E78",
          300: "#A6A8B0",
        },
        canvas: "#F7F6F3",
        surface: "#FFFFFF",
        line: "#E7E5DF",
        brand: {
          50: "#EEF0FF",
          100: "#DEE1FF",
          400: "#7B7FF0",
          500: "#5458E8",
          600: "#4144C9",
          700: "#3335A0",
        },
        profit: {
          500: "#0E9F87",
          50: "#E7F8F4",
        },
        warn: {
          500: "#D97A2E",
          50: "#FDF1E6",
        },
        danger: {
          500: "#D6493B",
          50: "#FBEAE8",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(21,23,28,0.04), 0 1px 8px rgba(21,23,28,0.04)",
      },
      borderRadius: {
        xl: "0.875rem",
      },
    },
  },
  plugins: [],
};
