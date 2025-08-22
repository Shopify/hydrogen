import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
} from 'vitest';
import {runInit} from './init.js';
import {exec} from '@shopify/cli-kit/node/system';
import {
  fileExists,
  readFile,
  rmSync,
} from '@shopify/cli-kit/node/fs';
import {joinPath} from '@shopify/cli-kit/node/path';
import path from 'node:path';
import {temporaryDirectory} from 'tempy';

describe('init - E2E Tailwind v4 Integration', () => {
  let testProjectPath: string;
  let cleanupFn: (() => void) | undefined;

  beforeAll(() => {
    // Create a temporary directory for our test project
    testProjectPath = temporaryDirectory();
    console.log(`Test project path: ${testProjectPath}`);
  });

  afterAll(async () => {
    // Clean up the test project
    if (testProjectPath && await fileExists(testProjectPath)) {
      try {
        await rmSync(testProjectPath);
      } catch (error) {
        console.warn('Failed to clean up test project:', error);
      }
    }
    if (cleanupFn) {
      cleanupFn();
    }
  });

  it('should scaffold a complete Tailwind v4 project with all optimizations', async () => {
    const projectName = 'test-tailwind-optimizations';
    const projectPath = joinPath(testProjectPath, projectName);

    console.log('Starting E2E test for Tailwind v4 scaffolding...');

    // Step 1: Run the actual init command with Tailwind styling
    console.log('Step 1: Running init command...');
    const project = await runInit({
      path: projectPath,
      language: 'ts',
      template: 'skeleton',
      styling: 'tailwind',
      markets: 'none',
      installDeps: false, // We'll install deps separately to control the process
      mockShop: true,
      git: false, // Skip git for testing
    });

    expect(project).toBeDefined();
    expect(project?.name).toBe(projectName);
    expect(project?.directory).toBe(projectPath);

    // Step 2: Verify all optimization files are created correctly
    console.log('Step 2: Verifying file creation...');
    
    // Check root.tsx has CSS preload hints with fetchPriority
    const rootPath = joinPath(projectPath, 'app', 'root.tsx');
    expect(await fileExists(rootPath)).toBe(true);
    const rootContent = await readFile(rootPath);
    
    // Should have Tailwind import instead of appStyles
    expect(rootContent).toContain('tailwindStyles');
    expect(rootContent).toContain('~/styles/tailwind.css?url');
    expect(rootContent).not.toContain('appStyles'); // Should be replaced
    
    // Should have preload hints with fetchPriority
    expect(rootContent).toContain("rel: 'preload'");
    expect(rootContent).toContain("as: 'style'");
    expect(rootContent).toContain("fetchPriority: 'high'");
    expect(rootContent).toContain('href: tailwindStyles');
    
    // Should have link tags updated
    expect(rootContent).toContain('<link rel="stylesheet" href={tailwindStyles}></link>');

    // Check react-router.config.ts has viteEnvironmentApi flag
    const reactRouterConfigPath = joinPath(projectPath, 'react-router.config.ts');
    expect(await fileExists(reactRouterConfigPath)).toBe(true);
    const reactRouterContent = await readFile(reactRouterConfigPath);
    expect(reactRouterContent).toContain('future: {');
    expect(reactRouterContent).toContain('unstable_viteEnvironmentApi: true');

    // Check vite.config.ts has Tailwind plugin
    const viteConfigPath = joinPath(projectPath, 'vite.config.ts');
    expect(await fileExists(viteConfigPath)).toBe(true);
    const viteContent = await readFile(viteConfigPath);
    expect(viteContent).toContain('@tailwindcss/vite');
    expect(viteContent).toContain('tailwindcss()');
    expect(viteContent).toContain('hydrogen()'); // Has Hydrogen plugin (includes cssCodeSplit: false)

    // Check Tailwind CSS file has v4 syntax
    const tailwindCssPath = joinPath(projectPath, 'app', 'styles', 'tailwind.css');
    expect(await fileExists(tailwindCssPath)).toBe(true);
    const tailwindCssContent = await readFile(tailwindCssPath);
    expect(tailwindCssContent).toContain("@import 'tailwindcss'"); // v4 syntax
    expect(tailwindCssContent).not.toContain('@tailwind'); // Not v3 syntax

    // Check package.json has correct Tailwind versions
    const packageJsonPath = joinPath(projectPath, 'package.json');
    expect(await fileExists(packageJsonPath)).toBe(true);
    const packageJsonContent = await readFile(packageJsonPath);
    const packageJson = JSON.parse(packageJsonContent);
    
    expect(packageJson.dependencies?.tailwindcss).toBe('^4.1.12');
    expect(packageJson.devDependencies?.['@tailwindcss/vite']).toBe('^4.1.12');
    
    // Should not have any beta references
    expect(packageJsonContent).not.toContain('beta');
    expect(packageJsonContent).not.toContain('alpha');

    // Step 3: Install dependencies
    console.log('Step 3: Installing dependencies...');
    await exec('npm', ['install', '--no-audit', '--no-fund'], {
      cwd: projectPath,
    });

    // Step 4: Run TypeScript check to ensure no type errors
    console.log('Step 4: Running TypeScript check...');
    const {stdout: tscOutput, exitCode: tscExitCode} = await exec(
      'npm',
      ['run', 'typecheck'],
      {
        cwd: projectPath,
      },
    );
    
    if (tscExitCode !== 0) {
      console.error('TypeScript errors found:', tscOutput);
    }
    expect(tscExitCode).toBe(0);

    // Step 5: Build the project to ensure it compiles
    console.log('Step 5: Building the project...');
    const {exitCode: buildExitCode} = await exec('npm', ['run', 'build'], {
      cwd: projectPath,
    });
    expect(buildExitCode).toBe(0);

    // Step 6: Verify build output
    console.log('Step 6: Verifying build output...');
    const distPath = joinPath(projectPath, 'dist');
    expect(await fileExists(distPath)).toBe(true);
    
    // Check that CSS files are generated in the build
    const clientBuildPath = joinPath(distPath, 'client');
    expect(await fileExists(clientBuildPath)).toBe(true);
    
    // Read the client build directory to find CSS files
    const {stdout: lsOutput} = await exec('ls', ['-la', clientBuildPath], {
      cwd: projectPath,
    });
    
    // Should have CSS files in the build (not code-split due to cssCodeSplit: false)
    expect(lsOutput).toMatch(/\.css/);
    
    // Step 7: Validate that critical optimizations are in place
    console.log('Step 7: Validating optimizations...');
    
    // The Hydrogen plugin should have cssCodeSplit: false by default
    // This is validated by checking that CSS is bundled together, not split
    // We can check this by looking for a single main CSS file rather than route-specific CSS
    const {stdout: findCssOutput} = await exec(
      'find',
      [clientBuildPath, '-name', '*.css', '-type', 'f'],
      {cwd: projectPath},
    );
    
    const cssFiles = findCssOutput.trim().split('\n').filter(Boolean);
    console.log(`Found ${cssFiles.length} CSS files in build`);
    
    // Should have consolidated CSS (not split per route)
    // With cssCodeSplit: false, we expect fewer CSS files
    expect(cssFiles.length).toBeGreaterThan(0);
    expect(cssFiles.length).toBeLessThanOrEqual(3); // Main CSS + maybe source maps

    console.log('✅ E2E test completed successfully!');
  }, 120000); // 2 minute timeout for E2E test

  it('should handle quickstart mode with Tailwind as default', async () => {
    const projectName = 'test-quickstart-tailwind';
    const projectPath = joinPath(testProjectPath, projectName);

    console.log('Testing quickstart mode with Tailwind...');

    // Run init in quickstart mode (should use Tailwind by default)
    const project = await runInit({
      path: projectPath,
      quickstart: true,
      installDeps: false,
      git: false,
    });

    expect(project).toBeDefined();
    
    // Verify Tailwind is set up by default in quickstart
    const rootPath = joinPath(projectPath, 'app', 'root.tsx');
    const rootContent = await readFile(rootPath);
    
    expect(rootContent).toContain('tailwindStyles');
    expect(rootContent).toContain('~/styles/tailwind.css?url');
    expect(rootContent).toContain("fetchPriority: 'high'");
    
    // Verify package.json has Tailwind
    const packageJsonPath = joinPath(projectPath, 'package.json');
    const packageJsonContent = await readFile(packageJsonPath);
    const packageJson = JSON.parse(packageJsonContent);
    
    expect(packageJson.dependencies?.tailwindcss).toBe('^4.1.12');
    
    console.log('✅ Quickstart test completed successfully!');
  }, 60000); // 1 minute timeout
});