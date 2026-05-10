import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        cream: "#f5f0e8",
      },
      backgroundImage: {
        "student-bg":
          "linear-gradient(180deg, #fafaf9 0%, #fdf4ff 60%, #ecfeff 100%)",
        "student-hero":
          "linear-gradient(135deg, #fce7f3 0%, #ddd6fe 50%, #cffafe 100%)",
        "card-purple": "linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)",
        "card-pink":   "linear-gradient(135deg, #f472b6 0%, #db2777 100%)",
        "card-amber":  "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
        "card-cyan":   "linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)",
        "card-emerald":"linear-gradient(135deg, #34d399 0%, #059669 100%)",
        "card-blue":   "linear-gradient(135deg, #60a5fa 0%, #2563eb 100%)",
        "card-rose":   "linear-gradient(135deg, #fb7185 0%, #e11d48 100%)",
        "pill-active": "linear-gradient(135deg, #fbcfe8 0%, #ddd6fe 100%)",
      },
      fontFamily: {
        baloo: ['"Baloo 2"', "cursive", "sans-serif"],
        nunito: ["Nunito", "sans-serif"],
      },
      keyframes: {
        floatUp: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        popIn: {
          "0%": { transform: "scale(0.8)", opacity: "0" },
          "70%": { transform: "scale(1.05)" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        slideUp: {
          from: { transform: "translateY(20px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-8px)" },
          "40%": { transform: "translateX(8px)" },
          "60%": { transform: "translateX(-6px)" },
          "80%": { transform: "translateX(6px)" },
        },
        pulse2: {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.85", transform: "scale(1.04)" },
        },
        starBurst: {
          "0%": { transform: "scale(0) rotate(-20deg)", opacity: "0" },
          "60%": { transform: "scale(1.3) rotate(8deg)", opacity: "1" },
          "100%": { transform: "scale(1) rotate(0deg)", opacity: "1" },
        },
        confettiFall: {
          "0%": { transform: "translateY(-20px) rotate(0deg)", opacity: "1" },
          "100%": { transform: "translateY(120px) rotate(360deg)", opacity: "0" },
        },
        wave: {
          "0%, 60%, 100%": { transform: "rotate(0deg)" },
          "10%": { transform: "rotate(14deg)" },
          "20%": { transform: "rotate(-8deg)" },
          "30%": { transform: "rotate(14deg)" },
          "40%": { transform: "rotate(-4deg)" },
          "50%": { transform: "rotate(10deg)" },
        },
        floatBig: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-14px)" },
        },
        pulseSoft: {
          "0%, 100%": { transform: "scale(1)", opacity: "1" },
          "50%": { transform: "scale(1.15)", opacity: "0.7" },
        },
        spinSlow: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
        bounceSoft: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
      },
      animation: {
        floatUp: "floatUp 3s ease-in-out infinite",
        popIn: "popIn 0.3s ease",
        slideUp: "slideUp 0.3s ease",
        shake: "shake 0.4s ease",
        pulse2: "pulse2 2s ease-in-out infinite",
        starBurst: "starBurst 0.4s ease",
        confettiFall: "confettiFall 1.5s ease-in forwards",
        wave: "wave 2.5s ease-in-out infinite",
        floatBig: "floatBig 3.5s ease-in-out infinite",
        pulseSoft: "pulseSoft 4s ease-in-out infinite",
        pulseSoftReverse: "pulseSoft 5s ease-in-out infinite reverse",
        spinSlow: "spinSlow 8s linear infinite",
        bounceSoft: "bounceSoft 2s ease-in-out infinite",
        shimmer: "shimmer 3s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
