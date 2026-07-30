#!/usr/bin/env node

import { createHash } from "node:crypto";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(scriptDir, "..");
const sourceSkillsRoot = join(repoRoot, "packages", "hydrogen", "skills");
const templateSkillsRoots = [
  join(repoRoot, "templates", "react-router", ".agents", "skills"),
  join(repoRoot, "templates", "nextjs", ".agents", "skills"),
];

interface SyncTemplateSkillsOptions {
  check?: boolean;
  sourceRoot?: string;
  targets?: string[];
  log?: (message: string) => void;
}

if (isDirectInvocation()) {
  syncTemplateSkills({
    check: process.argv.includes("--check"),
  });
}

export function syncTemplateSkills(options: SyncTemplateSkillsOptions = {}): void {
  const check = options.check ?? false;
  const sourceRoot = options.sourceRoot ?? sourceSkillsRoot;
  const targets = options.targets ?? templateSkillsRoots;
  const log = options.log ?? console.log;

  assertDirectory(sourceRoot, "source skills");

  if (check) {
    const staleTargets = targets.flatMap((target) => compareTrees(sourceRoot, target));

    if (staleTargets.length > 0) {
      throw new Error(
        [
          "Template skills are stale.",
          "Run: pnpm sync:template-skills",
          "Then commit the updated template skill files.",
          "",
          ...staleTargets,
        ].join("\n"),
      );
    }

    log("Template skills are in sync.");
    return;
  }

  for (const target of targets) {
    rmSync(target, { recursive: true, force: true });
    mkdirSync(dirname(target), { recursive: true });
    cpSync(sourceRoot, target, { recursive: true });
    log(`Copied ${relative(process.cwd(), sourceRoot)} -> ${relative(process.cwd(), target)}`);
  }
}

function compareTrees(sourceRoot: string, targetRoot: string): string[] {
  if (!existsSync(targetRoot)) {
    return [`Missing template skills directory: ${targetRoot}`];
  }

  assertDirectory(targetRoot, "template skills");

  const sourceHashes = collectFileHashes(sourceRoot);
  const targetHashes = collectFileHashes(targetRoot);
  const allPaths = new Set([...sourceHashes.keys(), ...targetHashes.keys()]);
  const differences: string[] = [];

  for (const path of [...allPaths].toSorted()) {
    const sourceHash = sourceHashes.get(path);
    const targetHash = targetHashes.get(path);
    if (sourceHash === targetHash) continue;

    if (!sourceHash) {
      differences.push(`Unexpected template skill file: ${join(targetRoot, path)}`);
    } else if (!targetHash) {
      differences.push(`Missing template skill file: ${join(targetRoot, path)}`);
    } else {
      differences.push(`Outdated template skill file: ${join(targetRoot, path)}`);
    }
  }

  return differences;
}

function collectFileHashes(root: string): Map<string, string> {
  const hashes = new Map<string, string>();

  for (const path of collectFiles(root)) {
    const relativePath = relative(root, path).split(sep).join("/");
    const hash = createHash("sha256")
      .update(relativePath)
      .update("\0")
      .update(readFileSync(path))
      .digest("hex");
    hashes.set(relativePath, hash);
  }

  return hashes;
}

function collectFiles(root: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectFiles(path));
    } else if (entry.isFile()) {
      files.push(path);
    }
  }

  return files.toSorted();
}

function assertDirectory(path: string, label: string): void {
  if (!existsSync(path) || !statSync(path).isDirectory()) {
    throw new Error(`Missing ${label} directory: ${path}`);
  }
}

function isDirectInvocation(): boolean {
  const entrypoint = process.argv[1];
  return Boolean(entrypoint && import.meta.url === pathToFileURL(entrypoint).href);
}
