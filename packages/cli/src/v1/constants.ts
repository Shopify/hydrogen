export const configurationFileNames = {
  hydrogen: 'hydrogen.config',
} as const;

export const supportedConfigExtensions = ['ts', 'js', 'mjs', 'cjs', 'json'];

export const dotEnvFileNames = {
  production: '.env',
};

export const genericConfigurationFileNames = {
  tailwind: 'tailwind.config',
  postCSS: 'postcss.config',
  eslint: '.eslintrc.js',
  typescript: {
    config: 'tsconfig.json',
  },
} as const;
