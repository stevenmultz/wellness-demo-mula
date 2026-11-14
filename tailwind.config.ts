import path from "path";
import type { Config } from "tailwindcss";

const obsidianChromeScale = {
  50: "#F4F6F9",
  100: "#E8ECF1", // Primary text / Polished silver
  200: "#DCE2E9", // Light border / Cool silver
  300: "#C7D0DA", // Chrome highlight
  400: "#A1AAB5", // Secondary text
  500: "#707B88", // Muted text / Metallic slate
  600: "#525E6E", // Deep metallic accent
  700: "#2A323C", // Primary structural border
  800: "#20262E", // Interactive surface / Subtle border
  850: "#171C22", // Elevated surface
  900: "#11151A", // Secondary background
  950: "#0B0D10", // Main background (Deep Obsidian)
};

const config: Config = {
  darkMode: "class",
  content: [
    path.join(__dirname, "./src/pages/**/*.{js,ts,jsx,tsx,mdx}"),
    path.join(__dirname, "./src/components/**/*.{js,ts,jsx,tsx,mdx}"),
    path.join(__dirname, "./src/app/**/*.{js,ts,jsx,tsx,mdx}"),
    path.join(__dirname, "./src/wellness/**/*.{js,ts,jsx,tsx,mdx}"),
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-geometric)",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
        geometric: ["var(--font-geometric)", "system-ui", "sans-serif"],
        mono: [
          "var(--font-mono)",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },
      colors: {
        zinc: obsidianChromeScale,
        chrome: {
          ...obsidianChromeScale,
          highlight: "#C7D0DA",
          metallic: "#8996A5",
        },
        steel: {
          light: "#F4F6F9",
          surface: "#E8ECF1",
          border: "#C7D0DA",
          deep: "#525E6E",
        },
        obsidian: {
          base: "#0B0D10",
          secondary: "#11151A",
          card: "#171C22",
          surface: "#20262E",
          border: "#2A323C",
          subtle: "#202730",
        },
      },
    },
  },
  plugins: [],
};
export default config;
