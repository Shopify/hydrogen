import {readFileSync} from 'node:fs';
import semver from 'semver';
import {describe, expect, it} from 'vitest';

type PackageJson = {
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

type PackagePeerCheck = {
  packageName: string;
  packageJson: PackageJson;
  reactRouterPackages: string[];
};

const packagePeerChecks: PackagePeerCheck[] = [
  {
    packageName: '@shopify/hydrogen',
    packageJson: readPackageJson(
      new URL('../../../hydrogen/package.json', import.meta.url),
    ),
    reactRouterPackages: ['react-router', '@react-router/dev'],
  },
  {
    packageName: '@shopify/cli-hydrogen',
    packageJson: readPackageJson(
      new URL('../../package.json', import.meta.url),
    ),
    reactRouterPackages: ['@react-router/dev'],
  },
  {
    packageName: '@shopify/remix-oxygen',
    packageJson: readPackageJson(
      new URL('../../../remix-oxygen/package.json', import.meta.url),
    ),
    reactRouterPackages: ['react-router'],
  },
];

function readPackageJson(fileUrl: URL) {
  return JSON.parse(readFileSync(fileUrl, 'utf8')) as PackageJson;
}

function getDependencyVersion(
  packageJson: PackageJson,
  dependencyName: string,
) {
  const dependencyVersion = packageJson.devDependencies?.[dependencyName];

  if (!dependencyVersion) {
    throw new Error(`Missing devDependency ${dependencyName}.`);
  }

  return dependencyVersion;
}

function getPeerRange(packageJson: PackageJson, dependencyName: string) {
  const peerRange = packageJson.peerDependencies?.[dependencyName];

  if (!peerRange) {
    throw new Error(`Missing peerDependency ${dependencyName}.`);
  }

  return peerRange;
}

function getNextCompatibleMinorVersion(version: string) {
  const nextMinorVersion = semver.inc(version, 'minor');

  if (!nextMinorVersion) {
    throw new Error(`Expected ${version} to be a valid semver version.`);
  }

  return nextMinorVersion;
}

describe('React Router peer dependency ranges', () => {
  it('accepts the runtime-tested version and newer compatible minors', () => {
    for (const {
      packageName,
      packageJson,
      reactRouterPackages,
    } of packagePeerChecks) {
      for (const reactRouterPackage of reactRouterPackages) {
        const runtimeTestedVersion = getDependencyVersion(
          packageJson,
          reactRouterPackage,
        );
        const peerRange = getPeerRange(packageJson, reactRouterPackage);
        const nextCompatibleMinorVersion =
          getNextCompatibleMinorVersion(runtimeTestedVersion);

        expect(
          semver.satisfies(runtimeTestedVersion, peerRange),
          `${packageName} ${reactRouterPackage} peer range should include its runtime-tested devDependency version`,
        ).toBe(true);
        expect(
          semver.satisfies(nextCompatibleMinorVersion, peerRange),
          `${packageName} ${reactRouterPackage} peer range should allow newer React Router 7.x minors`,
        ).toBe(true);
      }
    }
  });
});
