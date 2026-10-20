#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const FRONTMATTER = /^---\n([\s\S]*?)\n---/;
const RELEASE_LINE = /^\s*["']?([^"':\s]+)["']?\s*:/;
// Markdown files in .changeset that changesets itself doesn't treat as changesets.
const NON_CHANGESET_FILES = new Set(["README.md", "AGENTS.md", "CLAUDE.md", "GEMINI.md"]);

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const changesetDir = join(repoRoot, ".changeset");

const { ignore } = JSON.parse(readFileSync(join(changesetDir, "config.json"), "utf8"));
const ignorePatterns = (Array.isArray(ignore) ? ignore : []).map(globToRegExp);
const errors: string[] = [];

for (const file of readdirSync(changesetDir)) {
  if (!file.endsWith(".md") || file.startsWith(".") || NON_CHANGESET_FILES.has(file)) continue;

  const contents = readFileSync(join(changesetDir, file), "utf8");
  const frontmatter = FRONTMATTER.exec(contents);
  if (!frontmatter) continue;

  // Changesets skips ignored packages without an error, so their changesets never release:
  // https://github.com/changesets/changesets/issues/436
  for (const line of frontmatter[1].split("\n")) {
    const name = RELEASE_LINE.exec(line)?.[1];
    if (name && ignorePatterns.some((pattern) => pattern.test(name))) {
      errors.push(
        `.changeset/${file} bumps ${name}, which .changeset/config.json ignores. Remove it, or delete the changeset if it is the only package.`,
      );
    }
  }

  const summary = contents.slice(frontmatter[0].length).trim();
  if (summary.startsWith("#")) {
    errors.push(
      `.changeset/${file} starts with a heading (${summary.split("\n")[0]}). Start the summary with plain text; headings can follow it.`,
    );
  }
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exit(1);
}

console.log("No changeset issues found.");

function globToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*");
  return new RegExp(`^${escaped}$`);
}
