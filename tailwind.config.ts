import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2523",
        paper: "#f7f7f4",
        line: "#e7e4dd",
        muted: "#6f746f",
        accent: "#0f766e",
        rise: "#b42318",
        fall: "#067647"
      },
      boxShadow: {
        subtle: "0 1px 2px rgba(31, 37, 35, 0.06), 0 12px 32px rgba(31, 37, 35, 0.04)"
      }
    }
  },
  plugins: []
};

export default config;
