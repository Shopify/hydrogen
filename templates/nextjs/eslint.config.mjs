import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.mjs"],
        },
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@next/next/no-img-element": "off",
      "@typescript-eslint/consistent-type-assertions": ["error", { assertionStyle: "never" }],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/switch-exhaustiveness-check": "error",
      complexity: ["error", 12],
      "max-depth": ["error", 3],
    },
  },
  {
    files: [
      "app/collections/**/page.tsx",
      "app/search/page.tsx",
      "components/CartLineItem.tsx",
      "components/CollectionBrowser.tsx",
      "components/ProductCard.tsx",
      "components/ProductDetails.tsx",
      "lib/filters.tsx",
    ],
    rules: {
      "@typescript-eslint/consistent-type-assertions": "off",
      complexity: "off",
      "max-depth": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
