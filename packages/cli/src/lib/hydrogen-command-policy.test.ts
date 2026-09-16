import {mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {mockAndCaptureOutput} from '@shopify/cli-kit/node/testing/output';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {
  applyHydrogenCommandPolicy,
  isHydrogenCommandDisabled,
  isHydrogenProject,
} from './hydrogen-command-policy.js';

describe('Hydrogen command policy', () => {
  const outputMock = mockAndCaptureOutput();
  let projectPath: string;

  beforeEach(() => {
    outputMock.clear();
    projectPath = mkdtempSync(join(tmpdir(), 'hydrogen-command-policy-'));
  });

  afterEach(() => {
    rmSync(projectPath, {force: true, recursive: true});
  });

  describe('applyHydrogenCommandPolicy()', () => {
    it('continues when command id is missing', () => {
      writeProjectPackageJson({
        dependencies: {'@shopify/hydrogen': 'workspace:*'},
      });
      writeDisabledCommands('hydrogen:dev');

      const isDisabled = applyHydrogenCommandPolicy({projectPath});

      expect(isDisabled).toBe(false);
      expect(outputMock.output()).toBe('');
    });

    it('continues when a command is not disabled', () => {
      writeProjectPackageJson({
        dependencies: {'@shopify/hydrogen': 'workspace:*'},
      });
      writeDisabledCommands('hydrogen:dev');

      const isDisabled = applyHydrogenCommandPolicy({
        id: 'hydrogen:env:pull',
        projectPath,
      });

      expect(isDisabled).toBe(false);
      expect(outputMock.output()).toBe('');
    });

    it('blocks commands listed in package metadata with generic guidance', () => {
      writeProjectPackageJson({
        dependencies: {'@shopify/hydrogen': 'workspace:*'},
      });
      writeDisabledCommands('hydrogen:setup:vite');

      const isDisabled = applyHydrogenCommandPolicy({
        id: 'hydrogen:setup:vite',
        projectPath,
      });

      expect(isDisabled).toBe(true);
      expect(outputMock.output()).toContain(
        '`shopify hydrogen setup vite` is not supported by this version of Hydrogen',
      );
      expect(outputMock.output()).toContain(
        'The installed version of @shopify/hydrogen disables this command.',
      );
      expect(outputMock.output()).toContain(
        'Use your framework or package tooling instead.',
      );
    });
  });

  describe('isHydrogenCommandDisabled()', () => {
    it('reads disabled commands from @shopify/hydrogen package metadata', () => {
      writeProjectPackageJson({
        dependencies: {'@shopify/hydrogen': 'workspace:*'},
      });
      writeDisabledCommands('hydrogen:setup:vite');

      expect(
        isHydrogenCommandDisabled(projectPath, 'hydrogen:setup:vite'),
      ).toBe(true);
      expect(isHydrogenCommandDisabled(projectPath, 'hydrogen:env:pull')).toBe(
        false,
      );
    });

    it('keeps commands enabled when disabled command metadata is missing', () => {
      writeProjectPackageJson({
        dependencies: {'@shopify/hydrogen': '2026.1.0'},
      });
      writeHydrogenPackageJson({});

      expect(
        isHydrogenCommandDisabled(projectPath, 'hydrogen:setup:vite'),
      ).toBe(false);
    });
  });

  describe('isHydrogenProject()', () => {
    it.each(['dependencies', 'devDependencies', 'peerDependencies'] as const)(
      'identifies projects declaring @shopify/hydrogen in %s',
      (dependencyType) => {
        writeProjectPackageJson({
          [dependencyType]: {'@shopify/hydrogen': 'workspace:*'},
        });

        expect(isHydrogenProject(projectPath)).toBe(true);
      },
    );

    it('does not identify projects from hoisted @shopify/hydrogen packages alone', () => {
      const workspacePath = mkdtempSync(
        join(tmpdir(), 'hydrogen-command-policy-workspace-'),
      );
      const nestedProjectPath = join(workspacePath, 'packages', 'not-hydrogen');

      mkdirSync(nestedProjectPath, {recursive: true});
      writeJson(join(nestedProjectPath, 'package.json'), {
        name: 'not-hydrogen',
      });
      writeHydrogenPackageJson(
        {shopify: {cli: {disabledCommands: ['hydrogen:setup:vite']}}},
        join(workspacePath, 'node_modules', '@shopify', 'hydrogen'),
      );

      try {
        expect(isHydrogenProject(nestedProjectPath)).toBe(false);
      } finally {
        rmSync(workspacePath, {force: true, recursive: true});
      }
    });
  });

  function writeProjectPackageJson(packageJson: Record<string, unknown>) {
    writeJson(join(projectPath, 'package.json'), packageJson);
  }

  function writeDisabledCommands(...disabledCommands: string[]) {
    writeHydrogenPackageJson({shopify: {cli: {disabledCommands}}});
  }

  function writeHydrogenPackageJson(
    packageJson: Record<string, unknown>,
    hydrogenPackagePath = join(
      projectPath,
      'node_modules',
      '@shopify',
      'hydrogen',
    ),
  ) {
    mkdirSync(hydrogenPackagePath, {recursive: true});
    writeJson(join(hydrogenPackagePath, 'package.json'), {
      name: '@shopify/hydrogen',
      exports: {'./package.json': './package.json'},
      ...packageJson,
    });
  }

  function writeJson(path: string, data: Record<string, unknown>) {
    writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  }
});
