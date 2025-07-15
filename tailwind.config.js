// tailwind.config.js
export const content = [
  "./src/**/*.{js,jsx,ts,tsx}",
];
export const theme = {
  extend: {},
};
export const plugins = [
  require('@tailwindcss/forms'), // ✅ Add this line
];


