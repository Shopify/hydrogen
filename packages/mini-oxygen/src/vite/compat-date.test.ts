import {mkdtempSync, mkdirSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {afterEach, describe, expect, it} from 'vitest';
import {
  getCompatibilityDateFromHydrogenVersion,
  getHydrogenCompatibilityDate,
} from './compat-date.js';

const tempRoots: string[] = [];

function createRootWithHydrogenPackageJson(source: string) {
  const root = mkdtempSync(join(tmpdir(), 'mini-oxygen-'));
  tempRoots.push(root);

  const hydrogenPackageRoot = join(
    root,
    'node_modules',
    '@shopify',
    'hydrogen',
  );

  mkdirSync(hydrogenPackageRoot, {recursive: true});
  writeFileSync(join(root, 'package.json'), JSON.stringify({}));
  writeFileSync(join(hydrogenPackageRoot, 'package.json'), source);

  return root;
}

function createRootWithHydrogenVersion(version: string) {
  return createRootWithHydrogenPackageJson(
    JSON.stringify({
      name: '@shopify/hydrogen',
      version,
      exports: {'./package.json': './package.json'},
    }),
  );
}

describe('Hydrogen compatibility dates', () => {
  afterEach(() => {
    for (const root of tempRoots.splice(0)) {
      rmSync(root, {recursive: true, force: true});
    }
  });

  it('infers the first day of the Hydrogen version month', () => {
    expect(getCompatibilityDateFromHydrogenVersion('2026.4.4')).toBe(
      '2026-04-01',
    );
    expect(getCompatibilityDateFromHydrogenVersion('2026.10.0-next.0')).toBe(
      '2026-10-01',
    );
  });

  it('uses a fixed compatibility date for non-calver Hydrogen versions', () => {
    expect(getCompatibilityDateFromHydrogenVersion('0.0.0-next')).toBe(
      '2026-04-01',
    );
    expect(
      getCompatibilityDateFromHydrogenVersion('0.0.0-next-20260624000000'),
    ).toBe('2026-04-01');
    expect(getCompatibilityDateFromHydrogenVersion('4.1.0')).toBe('2026-04-01');
    expect(getCompatibilityDateFromHydrogenVersion('2026.13.0')).toBe(
      '2026-04-01',
    );
  });

  it('reads the resolved Hydrogen package version from the project root', () => {
    const root = createRootWithHydrogenVersion('2026.4.4');

    expect(getHydrogenCompatibilityDate(root)).toBe('2026-04-01');
  });

  it('returns undefined when Hydrogen package metadata cannot be read', () => {
    const root = createRootWithHydrogenPackageJson('{');

    expect(getHydrogenCompatibilityDate(root)).toBeUndefined();
  });
});
