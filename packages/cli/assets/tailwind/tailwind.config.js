import formsPlugin from '@tailwindcss/forms';
import typographyPlugin from '@tailwindcss/typography';

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./{src-dir}/**/*.{js,ts,jsx,tsx}'],
  plugins: [formsPlugin, typographyPlugin],
};
