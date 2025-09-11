import * as fs from 'fs';
import * as path from 'path';

export interface ReactRouterMigrationStatus {
  isApplied: boolean;
  indicators: string[];
  missingIndicators: string[];
}

/**
 * Detects if the React Router v7 migration codemod has been applied to the project
 */
export function detectReactRouterMigration(projectRoot: string): ReactRouterMigrationStatus {
  const indicators: string[] = [];
  const missingIndicators: string[] = [];
  
  // Check package.json for React Router packages
  const packageJsonPath = path.join(projectRoot, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    // Check for React Router v7 packages
    if (deps['react-router'] && deps['react-router'].startsWith('^7')) {
      indicators.push('react-router v7 found in package.json');
    } else {
      missingIndicators.push('react-router v7 not found in package.json');
    }
    
    if (deps['@react-router/dev'] || deps['@react-router/node']) {
      indicators.push('React Router dev packages found');
    }
    
    // Check if old Remix packages are still present (they shouldn't be after migration)
    if (deps['@remix-run/react'] || deps['@remix-run/node'] || deps['@remix-run/dev']) {
      missingIndicators.push('Old Remix packages still present in package.json');
    }
  } else {
    missingIndicators.push('package.json not found');
  }
  
  // Check for React Router config file
  const reactRouterConfig = path.join(projectRoot, 'react-router.config.ts');
  const reactRouterConfigJs = path.join(projectRoot, 'react-router.config.js');
  
  if (fs.existsSync(reactRouterConfig) || fs.existsSync(reactRouterConfigJs)) {
    indicators.push('react-router.config file found');
  } else {
    missingIndicators.push('react-router.config file not found');
  }
  
  // Check vite.config for React Router plugin
  const viteConfig = path.join(projectRoot, 'vite.config.ts');
  const viteConfigJs = path.join(projectRoot, 'vite.config.js');
  
  if (fs.existsSync(viteConfig) || fs.existsSync(viteConfigJs)) {
    const viteContent = fs.readFileSync(fs.existsSync(viteConfig) ? viteConfig : viteConfigJs, 'utf-8');
    
    if (viteContent.includes('@react-router/dev/vite') || viteContent.includes('reactRouter')) {
      indicators.push('React Router Vite plugin configured');
    } else if (viteContent.includes('@remix-run/dev')) {
      missingIndicators.push('Still using Remix Vite plugin');
    }
  }
  
  // Check if app directory has +types folders (React Router v7 pattern)
  const routesDir = path.join(projectRoot, 'app', 'routes');
  if (fs.existsSync(routesDir)) {
    const hasTypesFolder = fs.readdirSync(routesDir).some(file => 
      file.startsWith('+types') || file === '.react-router'
    );
    
    if (hasTypesFolder) {
      indicators.push('React Router +types folders found');
    }
  }
  
  // Check for entry files with React Router patterns
  const entryClient = path.join(projectRoot, 'app', 'entry.client.tsx');
  const entryClientJs = path.join(projectRoot, 'app', 'entry.client.jsx');
  
  if (fs.existsSync(entryClient) || fs.existsSync(entryClientJs)) {
    const entryContent = fs.readFileSync(
      fs.existsSync(entryClient) ? entryClient : entryClientJs, 
      'utf-8'
    );
    
    if (entryContent.includes('HydratedRouter') || entryContent.includes('startTransition')) {
      indicators.push('React Router entry patterns found');
    } else if (entryContent.includes('RemixBrowser')) {
      missingIndicators.push('Still using RemixBrowser in entry.client');
    }
  }
  
  // Check for common import patterns in a sample route file
  const sampleRouteFiles = [
    path.join(projectRoot, 'app', 'root.tsx'),
    path.join(projectRoot, 'app', 'root.jsx'),
    path.join(projectRoot, 'app', 'root.ts'),
    path.join(projectRoot, 'app', 'root.js'),
  ];
  
  for (const routeFile of sampleRouteFiles) {
    if (fs.existsSync(routeFile)) {
      const content = fs.readFileSync(routeFile, 'utf-8');
      
      if (content.includes("from 'react-router'") || content.includes('from "react-router"')) {
        indicators.push('React Router imports found in root file');
      }
      
      if (content.includes("from '@remix-run/react'") || content.includes('from "@remix-run/react"')) {
        missingIndicators.push('Still importing from @remix-run/react in root file');
      }
      
      break;
    }
  }
  
  // Determine if migration has been applied
  const isApplied = indicators.length > 0 && 
                    indicators.length > missingIndicators.length &&
                    indicators.some(i => i.includes('react-router'));
  
  return {
    isApplied,
    indicators,
    missingIndicators
  };
}

/**
 * Throws an error if React Router migration hasn't been applied
 */
export function requireReactRouterMigration(projectRoot: string): void {
  const status = detectReactRouterMigration(projectRoot);
  
  if (!status.isApplied) {
    const message = [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '⚠️  React Router v7 migration has not been applied to this project',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      '',
      'This codemod requires the official React Router migration to be run first.',
      '',
      '👉 Please run:',
      '',
      '   npx codemod remix/2/react-router/upgrade',
      '',
      'This will:',
      '  • Upgrade from Remix v2 to React Router v7',
      '  • Transform imports from @remix-run/* to react-router',
      '  • Update your build configuration',
      '  • Generate route types',
      '',
      'After running the React Router migration, you can then run this',
      'Hydrogen-specific migration.',
      '',
      'Missing indicators:',
      ...status.missingIndicators.map(i => `  ❌ ${i}`),
      '',
      'Found indicators:',
      ...status.indicators.map(i => `  ✅ ${i}`),
      '',
      'For more information, see:',
      '  • https://reactrouter.com/upgrading/v7',
      '  • https://github.com/codemod-com/codemod/tree/main/packages/codemods/remix/2/react-router/upgrade',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    ].join('\n');
    
    throw new Error(message);
  }
}