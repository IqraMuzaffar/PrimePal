import type { Config } from "tailwindcss";

const withAlpha = (cssVar: string) =>
  `hsl(var(--${cssVar}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        heading: ["var(--font-heading)", "'Playfair Display'", "Georgia", "serif"],
      },
      colors: {
        background: withAlpha("background"),
        foreground: withAlpha("foreground"),
        card: {
          DEFAULT: withAlpha("card"),
          foreground: withAlpha("card-foreground"),
        },
        popover: {
          DEFAULT: withAlpha("popover"),
          foreground: withAlpha("popover-foreground"),
        },
        primary: {
          DEFAULT: withAlpha("primary"),
          foreground: withAlpha("primary-foreground"),
        },
        secondary: {
          DEFAULT: withAlpha("secondary"),
          foreground: withAlpha("secondary-foreground"),
        },
        muted: {
          DEFAULT: withAlpha("muted"),
          foreground: withAlpha("muted-foreground"),
        },
        accent: {
          DEFAULT: withAlpha("accent"),
          foreground: withAlpha("accent-foreground"),
        },
        destructive: {
          DEFAULT: withAlpha("destructive"),
          foreground: withAlpha("destructive-foreground"),
        },
        gold: {
          DEFAULT: withAlpha("gold"),
          light: withAlpha("gold-light"),
        },
        teal: {
          DEFAULT: withAlpha("teal"),
          light: withAlpha("teal-light"),
        },
        emerald: {
          DEFAULT: withAlpha("emerald"),
        },
        border: withAlpha("border"),
        input: withAlpha("input"),
        ring: withAlpha("ring"),
        chart: {
          "1": withAlpha("chart-1"),
          "2": withAlpha("chart-2"),
          "3": withAlpha("chart-3"),
          "4": withAlpha("chart-4"),
          "5": withAlpha("chart-5"),
        },
      },
      borderRadius: {
        "4xl": "calc(var(--radius) * 2.6)",
        "3xl": "calc(var(--radius) * 2.2)",
        "2xl": "calc(var(--radius) * 1.8)",
        xl: "calc(var(--radius) * 1.4)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        card: "0 4px 16px rgba(0, 0, 0, 0.06)",
        "card-hover": "0 8px 32px rgba(0, 0, 0, 0.1)",
        "gold-glow": "0 8px 32px hsla(38, 80%, 55%, 0.2)",
        "teal-glow": "0 8px 32px hsla(172, 66%, 30%, 0.2)",
        "dark-card": "0 4px 20px rgba(0, 0, 0, 0.4)",
        "dark-card-hover": "0 6px 28px rgba(0, 0, 0, 0.55)",
      },
      keyframes: {
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "glow-breathe": {
          "0%, 100%": { opacity: "0.22" },
          "50%": { opacity: "0.38" },
        },
      },
      animation: {
        "fade-in-up":
          "fade-in-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards",
        "glow-breathe": "glow-breathe 4s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
