/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "mantle-green":  "#00E5A8",
        "mantle-teal2":  "#14B8A6",
        "mantle-purple": "#a78bfa",
        "mantle-dark":   "#020617",
        "mantle-card":   "rgba(12,18,32,0.85)",
        "mantle-border": "rgba(255,255,255,0.08)",
      },
      fontFamily: {
        sans:    ["Space Grotesk", "system-ui", "sans-serif"],
        ui:      ["Geist", "Inter", "system-ui", "sans-serif"],
        mono:    ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        DEFAULT: "8px",
        sm:      "6px",
        md:      "10px",
        lg:      "16px",
        xl:      "16px",
        "2xl":   "20px",
        "3xl":   "24px",
        full:    "9999px",
        none:    "0",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":  "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      animation: {
        "pulse-glow":     "glowPulse 2s ease-in-out infinite",
        "gradient-shift": "gradientShift 8s ease infinite",
        "float":          "orbDrift 6s ease-in-out infinite",
        "spin-slow":      "spin 8s linear infinite",
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};
