import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#1d1b16",
        cream: "#f7f0e4",
        clay: "#c96f4a",
        pine: "#29443a",
        sand: "#dcb98f",
        mist: "#ece5da",
      },
      boxShadow: {
        card: "0 24px 60px rgba(24, 22, 18, 0.14)",
      },
      fontFamily: {
        sans: ["Aptos", "Segoe UI", "Trebuchet MS", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
