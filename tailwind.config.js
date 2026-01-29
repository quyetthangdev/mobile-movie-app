/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: "#000000",
        secondary: "#111827",
        tertiary: "#1F2937",
        quaternary: "#374151",
        quinary: "#4B5563",
        senary: "#6B7280",
        light: {
          100: "#D6C6FF",
          200: "#A8B5DB",
          300: "#9CA4AB"
        },
        dark: {
          100: "#221f3d",
          200: "#0f0d23",
        }
      },
    },
  },
  plugins: [],
}