import { describe, test, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Codemod Setup', () => {
  test('transformer function is exported from index', async () => {
    const transformerModule = await import('../src/index');
    expect(typeof transformerModule.default).toBe('function');
  });

  test('transformer has correct signature', async () => {
    const transformerModule = await import('../src/index');
    expect(transformerModule.default.length).toBe(3); // fileInfo, api, options
  });

  test('codemodrc.json is valid', () => {
    const configPath = path.join(__dirname, '../.codemodrc.json');
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    
    expect(config.name).toBe('shopify/hydrogen-react-router-migration');
    expect(config.engine).toBe('jscodeshift');
    expect(config.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  test('package.json has required dependencies', () => {
    const packagePath = path.join(__dirname, '../package.json');
    const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf-8'));
    
    expect(packageJson.dependencies).toHaveProperty('jscodeshift');
    expect(packageJson.dependencies).toHaveProperty('@types/jscodeshift');
  });

  test('directory structure is correct', () => {
    const srcDir = path.join(__dirname, '../src');
    const dirs = ['transformations', 'detectors', 'utils'];
    
    dirs.forEach(dir => {
      const dirPath = path.join(srcDir, dir);
      expect(fs.existsSync(dirPath)).toBe(true);
      expect(fs.statSync(dirPath).isDirectory()).toBe(true);
    });
  });
});