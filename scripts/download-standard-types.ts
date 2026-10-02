#!/usr/bin/env node

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const vendorDir = join(repoRoot, "packages", "hydrogen", "vendor");

const filesToDownload = [
  {
    file: "standard-actions.d.ts",
    url: "https://cdn.shopify.com/storefront/standard-actions.d.ts",
  },
  {
    file: "standard-events.d.ts",
    url: "https://cdn.shopify.com/storefront/standard-events.d.ts",
  },
];

async function downloadFile(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

function normalizeStandardActionsTypes(file: string, source: string): string {
  if (file !== "standard-actions.d.ts") return source;

  // Hydrogen owns a richer ShopifyGlobal declaration in src/globals.ts, so
  // retain the action type but omit the CDN file's overlapping ambient global.
  return source
    .replace("cart: CartSummary;", "cart: CartSummary | null;")
    .replace(
      /\ndeclare global \{[\s\S]*?\n\}\n\nexport \{\};/,
      "\nexport type ShopifyStandardActions = typeof actions;\n\nexport {};",
    );
}

mkdirSync(vendorDir, { recursive: true });

for (const { file, url } of filesToDownload) {
  const target = join(vendorDir, file);
  writeFileSync(target, normalizeStandardActionsTypes(file, await downloadFile(url)));
  console.log(`Downloaded ${url} -> ${relative(repoRoot, target)}`);
}
