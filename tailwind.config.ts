import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
      colors : {
        NavyBlue : "#344955",
        GreyLight : "#F3F3F6",
        Skylight : "#CAEEFD",
        NavyBlueLight : "#4BA0B5",
        Yellow : "#F6C343",
        Green : "#53A551",
        RedLight : "#CB444A",
        BlueLight : "#8AC1CF",
        Pink : "#oklch(70.4% 0.191 22.216)",
        Grey : "#BEBEBE",
        Red : "#FF0000",
        White : "#FFFFFF",
        Blue : "#3579F6",
      }
    },
  },
  plugins: [],
};
export default config;
