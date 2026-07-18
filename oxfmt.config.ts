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
    // Standalone, generated template artifacts (own lockfile/.npmrc, pinned
    // @shopify/hydrogen) that are copy-pasted into new repos by the build
    // pipeline. Not workspace members; not hand-formatted here.
    "templates/**",
    "dist/**",
    "build/**",
    ".next/**",
    "node_modules/**",
    "**/vendor/**",
    "**/public/*",
    "**/static/*",
    "**/playwright-report/**",
    "**/.tanstack/**",
    "examples/tanstack-start/app/routeTree.gen.ts",
    "**/.react-router/**",
    "**/.last-run.json",
    "pnpm-lock.yaml",
    "patches/**",
    "*.md",
    "*.svg",
    "*.ico",
    "*.png",
    "*.jpg",
    "*.type-test.ts",
  ],
});
