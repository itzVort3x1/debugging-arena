import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        vscode: {
          bg: "#1e1e1e",
          "bg-elevated": "#252526",
          sidebar: "#252526",
          panel: "#181818",
          "tab-active": "#1e1e1e",
          "tab-inactive": "#2d2d2d",
          "tab-hover": "#1f1f1f",
          titlebar: "#3c3c3c",
          statusbar: "#007acc",
          border: "#3c3c3c",
          "border-subtle": "#2a2a2a",
          fg: "#d4d4d4",
          "fg-muted": "#858585",
          "fg-subtle": "#6a6a6a",
          accent: "#007acc",
          "accent-hover": "#1f8ad2",
          success: "#4ec9b0",
          error: "#f48771",
          warning: "#dcdcaa",
          info: "#9cdcfe",
          selection: "#264f78",
          "line-highlight": "#2a2d2e",
        },
      },
      fontFamily: {
        mono: [
          "Menlo",
          "Monaco",
          "Consolas",
          "Courier New",
          "monospace",
        ],
      },
      fontSize: {
        "code": ["13px", "1.5"],
      },
    },
  },
  plugins: [],
};
export default config;
