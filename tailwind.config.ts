import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      screens: {
        xs: "475px",
        "3xl": "1600px",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors: {
        NavyBlue: "#344955",
        GreyLight: "#F3F3F6",
        Skylight: "#CAEEFD",
        NavyBlueLight: "#4BA0B5",
        Yellow: "#F6C343",
        Green: "#53A551",
        RedLight: "#CB444A",
        BlueLight: "#8AC1CF",
        Pink: "#f87171",
        Grey: "#BEBEBE",
        Red: "#FF0000",
        White: "#FFFFFF",
        Blue: "#3579F6",
      },
      spacing: {
        "18": "4.5rem",
        "88": "22rem",
      },
      fontSize: {
        xs: ["0.75rem", { lineHeight: "1rem" }],
        sm: ["0.875rem", { lineHeight: "1.25rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.125rem", { lineHeight: "1.75rem" }],
        xl: ["1.25rem", { lineHeight: "1.75rem" }],
      },
    },
  },
  plugins: [require("@tailwindcss/line-clamp")],
};
export default config;
