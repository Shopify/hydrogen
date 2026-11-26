#!/usr/bin/env node

/**
 * Publishes a back-fix release, choosing the npm dist-tag per package.
 *
 * `changeset publish --tag <branch>` applies one tag to every package, but a
 * back-fix branch is not the older line for all of them. Only the packages in
 * RELEASED_FROM_MAIN have a newer line on `main` that owns `latest`. Every other
 * package is released from this branch alone, so it has to publish to `latest`
 * or `latest` never moves (as happened from 2026.4.5 / 13.1.0 onwards).
 *
 * Changesets cannot express per-package tags on the command line, and npm lets
 * the CLI `--tag` that Changesets always passes override `publishConfig.tag`.
 * So this packs the release, rewrites each release's tag in the publish plan,
 * and publishes from the packed artifacts.
 *
 * Usage: node scripts/publish-backfix-release.mjs <branch-tag>
 * Environment:
 *   DRY_RUN  set to "true" to pack and print the plan without publishing
 */

import {execFileSync} from 'node:child_process';
import {mkdtempSync, readFileSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

const RELEASED_FROM_MAIN = new Set([
  '@shopify/hydrogen',
  '@shopify/mini-oxygen',
]);

const branchTag = process.argv[2];
const dryRun = process.env.DRY_RUN === 'true';

async function main() {
  if (!branchTag) {
    throw new Error('Usage: publish-backfix-release.mjs <branch-tag>');
  }

  const packDir = mkdtempSync(join(tmpdir(), 'backfix-pack-'));
  execFileSync('pnpm', ['changeset', 'pack', '--out-dir', packDir], {
    stdio: 'inherit',
  });

  const planPath = join(packDir, 'publish-plan.json');
  const planFile = JSON.parse(readFileSync(planPath, 'utf8'));
  const releases = planFile.plan
    .flat()
    .filter((release) => release.kind === 'publish');

  for (const release of releases) {
    // Anything other than `latest` here means Changesets chose the tag itself,
    // e.g. in pre mode, which this script would otherwise silently override.
    if (release.tag !== 'latest') {
      throw new Error(
        `${release.name}@${release.version} was planned for "${release.tag}". ` +
          `Pre mode is not supported for back-fix publishes.`,
      );
    }
    release.tag = RELEASED_FROM_MAIN.has(release.name) ? branchTag : 'latest';
    if (release.tag === 'latest') {
      await assertNotBehindLatest(release);
    }
    console.log(`${release.name}@${release.version} -> ${release.tag}`);
  }
  writeFileSync(planPath, JSON.stringify(planFile, null, 2));

  if (dryRun) {
    console.log(`[dry run] skipping publish of ${packDir}`);
    return;
  }

  execFileSync('pnpm', ['changeset', 'publish', '--from-pack-dir', packDir], {
    stdio: 'inherit',
  });
}

/**
 * Moving `latest` backwards would send every new install to an older release.
 * If a package starts being released from `main` and RELEASED_FROM_MAIN is not
 * updated, this stops the publish before anything reaches npm.
 */
async function assertNotBehindLatest({name, version}) {
  const response = await fetch(
    `https://registry.npmjs.org/${name.replace('/', '%2F')}`,
    {
      headers: {accept: 'application/vnd.npm.install-v1+json'},
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (response.status === 404) return;
  if (!response.ok) {
    throw new Error(`Could not read ${name} from npm: HTTP ${response.status}`);
  }
  const latest = (await response.json())['dist-tags']?.latest;
  if (latest && compareReleaseVersions(version, latest) < 0) {
    throw new Error(
      `${name}@${version} would move "latest" back from ${latest}. ` +
        `If ${name} is now released from main, add it to RELEASED_FROM_MAIN.`,
    );
  }
}

/**
 * Only plain `x.y.z` versions are compared, and anything else throws: a
 * prerelease must never reach `latest`, and the check must not pass just
 * because a version failed to parse.
 */
function compareReleaseVersions(a, b) {
  const [pa, pb] = [a, b].map((version) => {
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
    if (!match) {
      throw new Error(`Cannot compare "${version}" as a release version`);
    }
    return match.slice(1).map(Number);
  });
  for (let i = 0; i < 3; i++) {
    if (pa[i] !== pb[i]) return pa[i] - pb[i];
  }
  return 0;
}

await main();
