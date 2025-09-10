import fs from 'fs';
import path from 'path';
import { REMIX_PACKAGES, HYDROGEN_VERSION_RANGE, REACT_ROUTER_VERSION_RANGE } from '../constants';
import { detectProjectLanguage, type ProjectLanguage } from './language';
import type { PrerequisiteResult } from '../types';

export function checkPrerequisites(projectRoot: string): PrerequisiteResult {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  
  if (!fs.existsSync(packageJsonPath)) {
    return {
      ready: false,
      message: 'No package.json found. Are you in a Hydrogen project?'
    };
  }
  
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const deps = { ...packageJson.dependencies || {}, ...packageJson.devDependencies || {} };
  
  // Check for Remix dependencies
  const foundRemixPackages = REMIX_PACKAGES.filter(pkg => deps[pkg]);
  
  if (foundRemixPackages.length > 0) {
    return {
      ready: false,
      message: formatRemixError(foundRemixPackages),
      details: {
        hasRemixDeps: true,
        hasReactRouter: false,
        hydrogenVersion: deps['@shopify/hydrogen'],
        reactRouterVersion: undefined
      }
    };
  }
  
  // Check React Router version
  const rrVersion = deps['react-router'];
  if (!rrVersion) {
    return {
      ready: false,
      message: `No react-router dependency found. 

Has the official Remix to React Router migration been run?

Please run:
npx codemod remix/2/react-router/upgrade

Then run this Hydrogen-specific codemod.`,
      details: {
        hasRemixDeps: false,
        hasReactRouter: false,
        hydrogenVersion: deps['@shopify/hydrogen'],
        reactRouterVersion: undefined
      }
    };
  }
  
  // Check if already on React Router 7.8.x
  if (rrVersion.includes('7.8') || rrVersion.includes('7.9')) {
    return {
      ready: false,
      message: 'Already on React Router 7.8.x or higher - no migration needed!',
      details: {
        hasRemixDeps: false,
        hasReactRouter: true,
        hydrogenVersion: deps['@shopify/hydrogen'],
        reactRouterVersion: rrVersion
      }
    };
  }
  
  // Check for Hydrogen
  const hydrogenVersion = deps['@shopify/hydrogen'];
  if (!hydrogenVersion) {
    return {
      ready: false,
      message: 'No @shopify/hydrogen dependency found. Is this a Hydrogen project?',
      details: {
        hasRemixDeps: false,
        hasReactRouter: true,
        hydrogenVersion: undefined,
        reactRouterVersion: rrVersion
      }
    };
  }
  
  // Detect project language
  const language = detectProjectLanguage(projectRoot);
  
  return {
    ready: true,
    details: {
      hasRemixDeps: false,
      hasReactRouter: true,
      hydrogenVersion,
      reactRouterVersion: rrVersion
    }
  };
}

export function getProjectInfo(projectRoot: string): {
  language: ProjectLanguage;
  packageName: string;
  version: string;
} {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  const language = detectProjectLanguage(projectRoot);
  
  return {
    language,
    packageName: packageJson.name || 'hydrogen-app',
    version: packageJson.version || '1.0.0'
  };
}

function formatRemixError(packages: readonly string[]): string {
  return `
❌ Remix dependencies detected!

Found the following Remix packages:
${packages.map(pkg => `  • ${pkg}`).join('\n')}

Please run the official Remix to React Router codemod first:
npx codemod remix/2/react-router/upgrade

After that completes successfully, run this Hydrogen-specific codemod:
npx codemod shopify/hydrogen-react-router-migration

Note: The official codemod handles generic Remix → React Router migrations.
This Hydrogen codemod handles Hydrogen-specific patterns only.
`;
}

export function formatSuccessMessage(details: PrerequisiteResult['details']): string {
  const language = detectProjectLanguage(process.cwd());
  
  return `
✅ Prerequisites Check Passed!

  • React Router ${details?.reactRouterVersion} ✓
  • No Remix dependencies ✓
  • Hydrogen ${details?.hydrogenVersion} ✓
  • Project type: ${language.majorityLanguage === 'mixed' 
      ? 'Mixed (TypeScript & JavaScript)' 
      : language.isTypeScript ? 'TypeScript' : 'JavaScript'} ✓

Ready to migrate to React Router 7.8.x...
`;
}