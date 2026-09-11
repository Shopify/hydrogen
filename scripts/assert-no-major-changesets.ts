#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { parseChangesetFile } from "@changesets/parse";

const PREVIEW_PACKAGE = "@shopify/hydrogen";

const __dirname = dirname(fileURLToPath(import.meta.url));
const changesetDir = resolve(__dirname, "..", ".changeset");

const offenders: string[] = [];

for (const file of readdirSync(changesetDir)) {
  if (!file.endsWith(".md") || file === "README.md") continue;

  const { releases } = parseChangesetFile(readFileSync(join(changesetDir, file), "utf8"));

  for (const release of releases) {
    if (release.name === PREVIEW_PACKAGE && release.type === "major") {
      offenders.push(`  .changeset/${file}: ${release.name} is ${release.type}`);
    }
  }
}

if (offenders.length > 0) {
  console.error(
    `Preview releases only move the -preview.<n> suffix, and a major bump would move the base version. Change these to patch or minor:`,
  );
  console.error(offenders.join("\n"));
  process.exit(1);
}
