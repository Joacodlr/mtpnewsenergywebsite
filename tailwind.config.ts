import type { Config } from "tailwindcss";

/**
 * MTP palette, read off mtpnoticias.com's own stylesheet and logo.
 *
 *   brand   #e11e25  the red of the logo and of their section rules
 *   ink     #182e3e  the blue-black their headlines and body copy are set in
 *   amber   #faab17  their "A dónde ir" section — used here sparingly
 *
 * `brand-deep` exists because the logo red is only just AA as text on white.
 * Anywhere red carries words rather than shapes, use the deep one.
 */
const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#182e3e",
        slatebg: "#f4f5f6",
        brand: {
          DEFAULT: "#e11e25",
          deep: "#b3151b",
          soft: "#fde8e9",
          amber: "#faab17",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(18px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.7s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
