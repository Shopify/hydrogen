#!/usr/bin/env node

/**
 * Creates the GitHub Releases for the packages Changesets just published,
 * without ever taking the repository's "Latest" release designation.
 *
 * `changesets/action` gives no control over GitHub's `make_latest` field
 * (changesets/action#340), so a release it creates from a back-fix branch can
 * take the "Latest" designation away from the current release line. This script
 * exists so the back-fix job can create the same releases itself and pass
 * `--latest=false`.
 *
 * The release body is built the same way the action builds it: the version's
 * section from the package's own CHANGELOG.md, so release pages keep looking
 * exactly as they did before.
 *
 * Input: PUBLISHED_PACKAGES, the `published-packages` output of
 * changesets/action, e.g.
 *   [{"name":"@shopify/hydrogen","version":"2026.4.8"}]
 *
 * Environment:
 *   GITHUB_REPOSITORY  owner/repo to publish to (set by GitHub Actions)
 *   DRY_RUN            set to "true" to print what would be created
 */

import {execFileSync} from 'node:child_process';
import {existsSync, readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

// Directories whose immediate children can be workspace packages. Anything not
// listed here (for example `docs/preview`) never publishes, so it never needs a
// release either.
const WORKSPACE_ROOTS = ['packages', 'templates', 'apps'];

const NOT_FOUND = /404|not found/i;

const repo = process.env.GITHUB_REPOSITORY;
const dryRun = process.env.DRY_RUN === 'true';

function main() {
  const published = readPublishedPackages();
  if (published.length === 0) {
    console.log('Nothing was published, so there are no releases to create.');
    return;
  }

  const packageDirs = mapPackageNameToDirectory();
  for (const {name, version} of published) {
    createRelease(packageDirs, name, version);
  }
}

function readPublishedPackages() {
  const raw = process.env.PUBLISHED_PACKAGES;
  if (raw === undefined || raw.trim() === '') {
    return [];
  }
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) {
    throw new Error(
      `PUBLISHED_PACKAGES must be an array, got ${typeof parsed}`,
    );
  }
  return parsed;
}

function mapPackageNameToDirectory() {
  const byName = new Map();
  for (const root of WORKSPACE_ROOTS) {
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root, {withFileTypes: true})) {
      if (!entry.isDirectory()) continue;
      const dir = join(root, entry.name);
      const manifestPath = join(dir, 'package.json');
      if (!existsSync(manifestPath)) continue;
      byName.set(readManifest(manifestPath).name, dir);
    }
  }
  return byName;
}

function readManifest(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function createRelease(packageDirs, packageName, version) {
  const tag = `${packageName}@${version}`;
  const dir = packageDirs.get(packageName);
  if (dir === undefined) {
    throw new Error(
      `No workspace package named ${packageName}, so ${tag} has no directory`,
    );
  }

  const changelogPath = join(dir, 'CHANGELOG.md');
  if (!existsSync(changelogPath)) {
    // changesets/action also skips the release when a package has no changelog.
    console.log(`Skipping ${tag}: no ${changelogPath}`);
    return;
  }

  const body = changelogEntry(
    readFileSync(changelogPath, 'utf8'),
    version,
    tag,
  );

  if (releaseExists(tag)) {
    console.log(`Skipping ${tag}: release already exists`);
    return;
  }

  const args = [
    'release',
    'create',
    tag,
    '--repo',
    repo,
    '--title',
    tag,
    '--notes-file',
    '-',
    // The whole point of this script.
    '--latest=false',
  ];
  if (version.includes('-')) {
    args.push('--prerelease');
  }

  if (dryRun) {
    console.log(`[dry run] gh ${args.join(' ')}\n${body}\n---`);
    return;
  }

  execFileSync('gh', args, {
    input: body,
    stdio: ['pipe', 'inherit', 'inherit'],
  });
  console.log(`Created ${tag} without marking it as latest`);
}

function releaseExists(tag) {
  if (dryRun) return false;
  try {
    execFileSync(
      'gh',
      ['api', `repos/${repo}/releases/tags/${encodeURIComponent(tag)}`],
      {
        stdio: ['ignore', 'ignore', 'pipe'],
      },
    );
    return true;
  } catch (error) {
    const stderr = String(error.stderr ?? '');
    if (NOT_FOUND.test(stderr)) return false;
    throw error;
  }
}

/**
 * Mirrors changesets/action's `getChangelogEntry`, including skipping code
 * blocks so a `#` comment inside one is not mistaken for a heading and matching
 * the closing heading at the same depth as the closing heading.
 */
function changelogEntry(changelog, version, tag) {
  let entryStart;
  let entryEnd;

  const heading = /^(#{1,6})\s(.*)$|^(`{3,})/gm;
  let match;
  while ((match = heading.exec(changelog)) !== null) {
    if (match[3] !== undefined) {
      const closingFence = new RegExp(`^${match[3]}`, 'gm');
      closingFence.lastIndex = heading.lastIndex;
      if (closingFence.exec(changelog) === null) {
        // An unterminated code block would swallow the rest of the file.
        break;
      }
      heading.lastIndex = closingFence.lastIndex;
      continue;
    }

    const depth = match[1].length;
    if (match[2].trim() === version) {
      entryStart = {index: heading.lastIndex, depth};
      continue;
    }
    if (entryStart !== undefined && depth === entryStart.depth) {
      entryEnd = match.index;
      break;
    }
  }

  if (entryStart === undefined) {
    throw new Error(`No "## ${version}" entry in the changelog for ${tag}`);
  }
  return changelog.slice(entryStart.index, entryEnd).trim();
}

main();
