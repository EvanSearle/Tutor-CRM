import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          teal: "#1D9E75",
          "teal-light": "#E8F7F2",
          "teal-dark": "#167A5A",
        },
        surface: {
          DEFAULT: "#FAF9F7",
          card: "#FFFFFF",
          border: "#E8E5E0",
          muted: "#F3F1EE",
        },
        ink: {
          DEFAULT: "#1C1917",
          muted: "#6B6560",
          faint: "#9B9390",
        },
        status: {
          "active-bg": "#DCFCE7",
          "active-text": "#166534",
          "trial-bg": "#FEF9C3",
          "trial-text": "#854D0E",
          "prospect-bg": "#DBEAFE",
          "prospect-text": "#1E40AF",
          "paused-bg": "#F3F4F6",
          "paused-text": "#374151",
          "churned-bg": "#FEE2E2",
          "churned-text": "#991B1B",
        },
      },
      fontFamily: {
        sans: ["var(--font-dm-sans)", "sans-serif"],
        mono: ["var(--font-dm-mono)", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [],
};

export default config;
