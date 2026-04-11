/**
 * CI check: dependency version changes in package.json require a changeset.
 *
 * Prevents the class of bug where a dependency is bumped in source but never
 * released to npm because no changeset was created. Monorepo CI tests
 * workspace-linked deps, so version range mismatches are invisible without this.
 *
 * Usage: node scripts/check-dependency-changesets.mjs
 * Exits non-zero if any published package has dependency changes without a changeset.
 *
 * Note on pull_request checkout behavior: GitHub Actions checks out a merge
 * commit (refs/pull/N/merge) for pull_request events. `HEAD` here is that
 * merge commit, not the PR tip. `git merge-base origin/main HEAD` still
 * produces the correct common ancestor for diffing.
 */

import {execSync} from 'child_process';
import fs from 'fs';
import path from 'path';

// Only check fields that affect what merchants resolve from npm.
// devDependencies are excluded because they are not installed by consumers
// and bumping them does not require a release.
const DEPENDENCY_FIELDS = [
  'dependencies',
  'peerDependencies',
  'optionalDependencies',
];

function getMergeBase() {
  return execSync('git merge-base origin/main HEAD', {
    encoding: 'utf8',
  }).trim();
}

function getChangedPackageJsonFiles(mergeBase) {
  const diffOutput = execSync(
    `git diff ${mergeBase} HEAD --name-only -- "packages/*/package.json"`,
    {encoding: 'utf8'},
  ).trim();

  if (!diffOutput) return [];
  return diffOutput.split('\n').filter(Boolean);
}

function hasDependencyChanges(mergeBase, filePath) {
  let oldContent;
  try {
    oldContent = JSON.parse(
      execSync(`git show ${mergeBase}:${filePath}`, {encoding: 'utf8'}),
    );
  } catch {
    // New package — no base version exists, so no dependency "change" to enforce
    return false;
  }

  const newContent = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  for (const field of DEPENDENCY_FIELDS) {
    const oldDeps = JSON.stringify(oldContent[field] || {});
    const newDeps = JSON.stringify(newContent[field] || {});
    if (oldDeps !== newDeps) return true;
  }

  return false;
}

function getPackageNameFromPath(filePath) {
  const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return content.name;
}

function getPackagesWithChangesets() {
  const changesetDir = '.changeset';
  const packages = new Set();

  const files = fs.readdirSync(changesetDir).filter((f) => f.endsWith('.md'));

  for (const file of files) {
    const content = fs.readFileSync(path.join(changesetDir, file), 'utf8');
    const frontmatter = content.match(/^---\n([\s\S]*?)\n---/m);
    if (!frontmatter) continue;

    // Extract package names from YAML frontmatter (format: "package-name": bump-type)
    const lines = frontmatter[1].split('\n');
    for (const line of lines) {
      const match = line.match(/^['"]?([^'":\s]+)['"]?\s*:/);
      if (match) packages.add(match[1]);
    }
  }

  return packages;
}

function getIgnoredPackages() {
  const config = JSON.parse(fs.readFileSync('.changeset/config.json', 'utf8'));
  return new Set(config.ignore || []);
}

function main() {
  const mergeBase = getMergeBase();
  const changedFiles = getChangedPackageJsonFiles(mergeBase);

  if (changedFiles.length === 0) {
    console.log(
      '✅ No package.json dependency changes detected in packages/.',
    );
    return;
  }

  const packagesWithChangesets = getPackagesWithChangesets();
  const ignoredPackages = getIgnoredPackages();
  const failures = [];

  for (const filePath of changedFiles) {
    if (!hasDependencyChanges(mergeBase, filePath)) continue;

    const packageName = getPackageNameFromPath(filePath);
    if (!packageName) continue;
    if (ignoredPackages.has(packageName)) continue;

    if (!packagesWithChangesets.has(packageName)) {
      failures.push({filePath, packageName});
    }
  }

  if (failures.length === 0) {
    console.log('✅ All dependency changes have corresponding changesets.');
    return;
  }

  console.error(
    '❌ The following packages have dependency version changes but no changeset:\n',
  );
  for (const {filePath, packageName} of failures) {
    console.error(`  • ${packageName} (${filePath})`);
  }
  console.error(
    '\nDependency changes require a changeset to be released to npm.',
  );
  console.error(
    'Without a changeset, merchants will be stuck on stale versions.',
  );
  console.error(
    '\nRun `npx changeset add` or manually create a changeset file.',
  );
  process.exit(1);
}

main();
