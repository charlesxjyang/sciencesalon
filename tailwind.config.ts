import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Iowan Old Style', 'Palatino Linotype', 'URW Palladio L', 'serif'],
        sans: ['Avenir Next', 'Avenir', 'Montserrat', 'Corbel', 'URW Gothic', 'source-sans-pro', 'sans-serif'],
      },
      colors: {
        cream: '#FDFBF7',
        ink: '#1a1a1a',
        sage: '#7C9082',
        gold: '#C4A962',
        paper: '#F5F1E8',
      },
    },
  },
  plugins: [],
};
export default config;
