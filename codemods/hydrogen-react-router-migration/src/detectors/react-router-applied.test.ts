import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { detectReactRouterMigration, requireReactRouterMigration } from './react-router-applied';

describe('React Router Migration Detection', () => {
  let testDir: string;
  
  beforeEach(() => {
    // Create a temporary test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rr-test-'));
  });
  
  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });
  
  test('detects React Router v7 in package.json', () => {
    const packageJson = {
      dependencies: {
        'react-router': '^7.0.0',
        '@react-router/dev': '^7.0.0'
      }
    };
    
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    const status = detectReactRouterMigration(testDir);
    
    expect(status.isApplied).toBe(true);
    expect(status.indicators).toContain('react-router v7 found in package.json');
    expect(status.indicators).toContain('React Router dev packages found');
  });
  
  test('detects missing React Router migration', () => {
    const packageJson = {
      dependencies: {
        '@remix-run/react': '^2.0.0',
        '@remix-run/node': '^2.0.0'
      }
    };
    
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    const status = detectReactRouterMigration(testDir);
    
    expect(status.isApplied).toBe(false);
    expect(status.missingIndicators).toContain('react-router v7 not found in package.json');
    expect(status.missingIndicators).toContain('Old Remix packages still present in package.json');
  });
  
  test('detects React Router config file', () => {
    const packageJson = {
      dependencies: {
        'react-router': '^7.0.0'
      }
    };
    
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    fs.writeFileSync(
      path.join(testDir, 'react-router.config.ts'),
      'export default { appDirectory: "app" }'
    );
    
    const status = detectReactRouterMigration(testDir);
    
    expect(status.isApplied).toBe(true);
    expect(status.indicators).toContain('react-router.config file found');
  });
  
  test('detects React Router Vite plugin', () => {
    const packageJson = {
      dependencies: {
        'react-router': '^7.0.0'
      }
    };
    
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    fs.writeFileSync(
      path.join(testDir, 'vite.config.ts'),
      `
import { reactRouter } from '@react-router/dev/vite';

export default {
  plugins: [reactRouter()]
};`
    );
    
    const status = detectReactRouterMigration(testDir);
    
    expect(status.isApplied).toBe(true);
    expect(status.indicators).toContain('React Router Vite plugin configured');
  });
  
  test('detects old Remix patterns', () => {
    const packageJson = {
      dependencies: {
        '@remix-run/react': '^2.0.0'
      }
    };
    
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    fs.writeFileSync(
      path.join(testDir, 'vite.config.ts'),
      `
import { vitePlugin as remix } from '@remix-run/dev';

export default {
  plugins: [remix()]
};`
    );
    
    const status = detectReactRouterMigration(testDir);
    
    expect(status.isApplied).toBe(false);
    expect(status.missingIndicators).toContain('Still using Remix Vite plugin');
  });
  
  test('detects React Router imports in root file', () => {
    const packageJson = {
      dependencies: {
        'react-router': '^7.0.0'
      }
    };
    
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    // Create app directory
    fs.mkdirSync(path.join(testDir, 'app'));
    
    fs.writeFileSync(
      path.join(testDir, 'app', 'root.tsx'),
      `
import { Outlet } from 'react-router';

export default function Root() {
  return <Outlet />;
}`
    );
    
    const status = detectReactRouterMigration(testDir);
    
    expect(status.isApplied).toBe(true);
    expect(status.indicators).toContain('React Router imports found in root file');
  });
  
  test('throws error when migration not applied', () => {
    const packageJson = {
      dependencies: {
        '@remix-run/react': '^2.0.0'
      }
    };
    
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    expect(() => {
      requireReactRouterMigration(testDir);
    }).toThrow('React Router v7 migration has not been applied');
  });
  
  test('does not throw when migration is applied', () => {
    const packageJson = {
      dependencies: {
        'react-router': '^7.0.0',
        '@react-router/dev': '^7.0.0'
      }
    };
    
    fs.writeFileSync(
      path.join(testDir, 'package.json'),
      JSON.stringify(packageJson, null, 2)
    );
    
    expect(() => {
      requireReactRouterMigration(testDir);
    }).not.toThrow();
  });
});