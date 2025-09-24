import {readFile} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import {renderWarning} from '@shopify/cli-kit/node/ui';
import {outputDebug} from '@shopify/cli-kit/node/output';
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

const EXPECTED_VERSION = '7.9.2';

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
    outputDebug(
      `Unable to read package.json for React Router version check: ${error}`,
    );
    return;
  }

  // Combine all dependencies into one object
  const allDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
    ...packageJson.peerDependencies,
  };

  // Check each React Router package
  for (const pkg of REACT_ROUTER_PACKAGES) {
    const installedVersion = allDeps[pkg];

    if (!installedVersion) {
      // Package not installed, skip
      continue;
    }

    // Clean the version string (remove ^, ~, etc.)
    const cleanVersion = installedVersion.replace(/^[\^~]/, '');

    // Check if it's compatible with our expected version
    if (!semver.satisfies(EXPECTED_VERSION, installedVersion)) {
      mismatches.push({
        package: pkg,
        installed: installedVersion,
        expected: EXPECTED_VERSION,
      });
    }
  }

  // If there are mismatches, show a warning
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
      headline: 'React Router version mismatch detected',
      body: [
        'Hydrogen requires React Router 7.8.x for proper functionality.',
        '',
        'Version mismatches found:',
        mismatchList,
        '',
        'To fix this issue, run:',
        ...commands.map((cmd) => `  ${cmd}`),
        '',
        'This may cause issues with routing, code splitting, and other features.',
      ].join('\n'),
    });
  }
}
