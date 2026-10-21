import { defineConfig } from "oxfmt";

export default defineConfig({
  printWidth: 100,
  tabWidth: 2,
  useTabs: false,
  semi: true,
  singleQuote: false,
  trailingComma: "all",
  sortImports: true,
  sortTailwindcss: true,
  sortPackageJson: true,
  ignorePatterns: [
    ".changeset/pre.json",
    "dist/**",
    "build/**",
    ".next/**",
    "node_modules/**",
    "**/vendor/**",
    "**/generated/**",
    "**/public/*",
    // The Remix example's browser source lives in `public/` folders.
    "!examples/remix/app/**/public/*",
    "**/static/*",
    "**/playwright-report/**",
    "**/.react-router/**",
    "**/.last-run.json",
    "pnpm-lock.yaml",
    "patches/**",
    // MiniOxygen keeps its existing formatting instead of being reformatted.
    "packages/mini-oxygen/**",
    "*.md",
    "*.svg",
    "*.ico",
    "*.png",
    "*.jpg",
    "*.type-test.ts",
  ],
});
