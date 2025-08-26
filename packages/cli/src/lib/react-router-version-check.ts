import {readFile} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {renderWarning} from '@shopify/cli-kit/node/ui';
import semver from 'semver';

type ReactRouterPackage =
  | 'react-router'
  | 'react-router-dom'
  | '@react-router/dev'
  | '@react-router/fs-routes';

type VersionMismatch = {
  package: ReactRouterPackage;
  installed: string;
  expected: string;
};

const REACT_ROUTER_PACKAGES: ReactRouterPackage[] = [
  'react-router',
  'react-router-dom',
  '@react-router/dev',
  '@react-router/fs-routes',
];

const EXPECTED_VERSION = '7.8.2';

/**
 * Checks if the installed React Router packages are compatible with Hydrogen's requirements
 */
export async function checkReactRouterVersions(appPath: string): Promise<void> {
  const mismatches: VersionMismatch[] = [];

  // Read the app's package.json to get declared versions
  const packageJsonPath = joinPath(appPath, 'package.json');
  let packageJson: any;

  try {
    packageJson = JSON.parse(await readFile(packageJsonPath));
  } catch (error) {
    // If we can't read package.json, skip the check silently
    // This could happen if running from a different directory or during CI/CD
    return;
  }

  const allDependencies = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  // Check each React Router package
  for (const pkgName of REACT_ROUTER_PACKAGES) {
    const declaredVersion = allDependencies[pkgName];

    if (!declaredVersion) {
      // Package not used in this project
      continue;
    }

    // Try to read the actual installed version from node_modules
    let installedVersion: string | undefined;
    try {
      const pkgJsonPath = joinPath(
        appPath,
        'node_modules',
        pkgName,
        'package.json',
      );
      const pkgJson = JSON.parse(await readFile(pkgJsonPath));
      installedVersion = pkgJson.version;
    } catch {
      // Package might not be installed yet
      continue;
    }

    // Check if the installed version satisfies the expected range
    if (
      installedVersion &&
      !semver.satisfies(installedVersion, EXPECTED_VERSION)
    ) {
      mismatches.push({
        package: pkgName,
        installed: installedVersion,
        expected: EXPECTED_VERSION,
      });
    }
  }

  // Display warning if there are mismatches
  if (mismatches.length > 0) {
    const mismatchList = mismatches
      .map(
        (m) =>
          `  • ${m.package}: installed ${m.installed}, expected ${m.expected}`,
      )
      .join('\n');

    // Separate packages by whether they're dev dependencies or not
    const devPackages = ['@react-router/dev', '@react-router/fs-routes'];
    const regularMismatches = mismatches.filter(
      (m) => !devPackages.includes(m.package),
    );
    const devMismatches = mismatches.filter((m) =>
      devPackages.includes(m.package),
    );

    // Build install commands
    const commands: string[] = [];

    if (regularMismatches.length > 0) {
      const regularList = regularMismatches
        .map((m) => `${m.package}@${EXPECTED_VERSION}`)
        .join(' ');
      commands.push(`npm install ${regularList}`);
    }

    if (devMismatches.length > 0) {
      const devList = devMismatches
        .map((m) => `${m.package}@${EXPECTED_VERSION}`)
        .join(' ');
      commands.push(`npm install -D ${devList}`);
    }

    renderWarning({
      headline: 'Unsupported React Router version detected',
      body: [
        'The following packages have incompatible versions:',
        mismatchList,
        '',
        `Please update your React Router packages to match Hydrogen's requirements.`,
        `Run: ${commands.join(' && ')}`,
      ].join('\n'),
    });
  }
}
