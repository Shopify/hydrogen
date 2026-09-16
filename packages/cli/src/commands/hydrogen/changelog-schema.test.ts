import {readFile} from 'node:fs/promises';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import semver from 'semver';
import {beforeAll, describe, expect, it} from 'vitest';
import * as upgradeModule from './upgrade.js';

/**
 * Validates the changelog.json schema and data integrity.
 *
 * Ported from the deleted `describe('Changelog validation')` block in
 * upgrade-flow.test.ts (~270 lines). These tests guard against malformed
 * changelog entries that could break the upgrade command at runtime.
 */

function assertDefined<T>(value: T): asserts value is NonNullable<T> {
  expect(value).toBeDefined();
}

describe('Changelog validation', () => {
  const allowedReleaseFields = new Set([
    'title',
    'version',
    'date',
    'hash',
    'commit',
    'pr',
    'dependencies',
    'devDependencies',
    'dependenciesMeta',
    'removeDependencies',
    'removeDevDependencies',
    'features',
    'fixes',
  ]);

  const allowedItemFields = new Set([
    'title',
    'info',
    'pr',
    'id',
    'breaking',
    'docs',
    'steps',
    'desc',
    'code',
    'description',
  ]);

  const allowedStepFields = new Set([
    'title',
    'info',
    'code',
    'file',
    'reel',
    'desc',
    'docs',
  ]);

  const urlRegex = /^https:\/\/.+/;
  const versionRegex = /^\d{4}\.\d+\.\d+$/;

  // Resolve from the file's own location to avoid dependence on process.cwd()
  const currentDir = dirname(fileURLToPath(import.meta.url));
  // This file lives at packages/cli/src/commands/hydrogen/ — navigate up to repo root
  const changelogPath = join(
    currentDir,
    '..',
    '..',
    '..',
    '..',
    '..',
    'docs',
    'changelog.json',
  );

  let changelog: Awaited<ReturnType<typeof upgradeModule.getChangelog>>;

  beforeAll(async () => {
    changelog = await upgradeModule.getChangelog();
  });

  it('is valid JSON and matches getChangelog() output', async () => {
    const changelogContent = await readFile(changelogPath, 'utf8');

    let parsedChangelog;
    try {
      parsedChangelog = JSON.parse(changelogContent);
    } catch (error) {
      throw new Error(
        `Invalid JSON in changelog.json: ${(error as Error).message}`,
      );
    }

    expect(changelog).toEqual(parsedChangelog);
  });

  it('has only allowed top-level fields', () => {
    const allowedChangelogFields = ['url', 'version', 'releases'];
    const rogueChangelogFields = Object.keys(changelog).filter(
      (key) => !allowedChangelogFields.includes(key),
    );
    expect(rogueChangelogFields).toEqual([]);
  });

  it('has required fields and valid formats in every release', () => {
    for (const release of changelog.releases) {
      assertDefined(release);

      expect(release.title).toBeDefined();
      expect(release.version).toBeDefined();
      expect(release.hash).toBeDefined();
      expect(release.commit).toBeDefined();
      expect(release.dependencies).toBeDefined();
      expect(release.features).toBeDefined();
      expect(release.fixes).toBeDefined();

      if (release.pr) {
        expect(typeof release.pr).toBe('string');
      }
      expect(release.commit).toMatch(urlRegex);
      expect(release.version).toMatch(versionRegex);

      if (release.date) {
        expect(typeof release.date).toBe('string');
        expect(release.date.length).toBeGreaterThan(0);
      }
    }
  });

  it('has no rogue fields in any release', () => {
    for (const release of changelog.releases) {
      assertDefined(release);

      const rogueReleaseFields = Object.keys(release).filter(
        (key) => !allowedReleaseFields.has(key),
      );
      expect(rogueReleaseFields).toEqual([]);
    }
  });

  it('has valid feature/fix items with no rogue fields', () => {
    const allItems = changelog.releases.flatMap((r) => [
      ...(r.features ?? []),
      ...(r.fixes ?? []),
    ]);
    expect(allItems.length).toBeGreaterThan(0);

    for (const release of changelog.releases) {
      assertDefined(release);

      for (const item of [
        ...(release.features ?? []),
        ...(release.fixes ?? []),
      ]) {
        assertDefined(item);

        const rogueItemFields = Object.keys(item).filter(
          (key) => !allowedItemFields.has(key),
        );
        expect(rogueItemFields).toEqual([]);
        expect(item.title).toBeDefined();

        if (item.pr) {
          expect(typeof item.pr).toBe('string');
        }
      }
    }
  });

  it('has valid steps with decodable base64 code', () => {
    const allSteps = changelog.releases.flatMap((r) =>
      [...(r.features ?? []), ...(r.fixes ?? [])].flatMap(
        (item) => item?.steps ?? [],
      ),
    );
    expect(allSteps.length).toBeGreaterThan(0);

    for (const release of changelog.releases) {
      assertDefined(release);

      for (const item of [
        ...(release.features ?? []),
        ...(release.fixes ?? []),
      ]) {
        if (!item?.steps) continue;

        expect(Array.isArray(item.steps)).toBe(true);
        for (const step of item.steps) {
          assertDefined(step);

          const rogueStepFields = Object.keys(step).filter(
            (key) => !allowedStepFields.has(key),
          );
          expect(rogueStepFields).toEqual([]);
          expect(step.title).toBeDefined();

          if (step.code) {
            expect(() =>
              Buffer.from(step.code, 'base64').toString(),
            ).not.toThrow();
          }
        }
      }
    }
  });

  it('has valid semver versions for all dependencies', () => {
    const allDeps = changelog.releases.flatMap((r) => [
      ...Object.entries(r.dependencies ?? {}),
      ...Object.entries(r.devDependencies ?? {}),
    ]);
    expect(allDeps.length).toBeGreaterThan(0);

    for (const release of changelog.releases) {
      assertDefined(release);

      for (const [pkg, version] of Object.entries(release.dependencies ?? {})) {
        expect(typeof pkg).toBe('string');
        expect(typeof version).toBe('string');
        expect(semver.validRange(version)).not.toBeNull();
      }

      for (const [pkg, version] of Object.entries(
        release.devDependencies ?? {},
      )) {
        expect(typeof pkg).toBe('string');
        expect(typeof version).toBe('string');
        expect(semver.validRange(version)).not.toBeNull();
      }
    }
  });

  it('has valid dependenciesMeta structure', () => {
    for (const release of changelog.releases) {
      if (!release?.dependenciesMeta) continue;

      for (const [pkg, meta] of Object.entries(release.dependenciesMeta)) {
        expect(typeof pkg).toBe('string');
        expect(typeof meta).toBe('object');
        expect(typeof meta.required).toBe('boolean');
        const rogueMetaFields = Object.keys(meta).filter(
          (key) => key !== 'required',
        );
        expect(rogueMetaFields).toEqual([]);
      }
    }
  });

  it('has valid removeDependencies and removeDevDependencies arrays', () => {
    for (const release of changelog.releases) {
      assertDefined(release);

      if (release.removeDependencies) {
        expect(Array.isArray(release.removeDependencies)).toBe(true);
        for (const dep of release.removeDependencies) {
          expect(typeof dep).toBe('string');
        }
      }

      if (release.removeDevDependencies) {
        expect(Array.isArray(release.removeDevDependencies)).toBe(true);
        for (const dep of release.removeDevDependencies) {
          expect(typeof dep).toBe('string');
        }
      }
    }
  });
});
