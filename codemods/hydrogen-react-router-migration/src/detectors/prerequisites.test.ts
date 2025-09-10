import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { checkPrerequisites } from './prerequisites';

describe('Prerequisites Checker', () => {
  let tempDir: string;
  
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
  });
  
  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
  
  test('fails when package.json is missing', () => {
    const result = checkPrerequisites(tempDir);
    
    expect(result.ready).toBe(false);
    expect(result.message).toContain('No package.json found');
  });
  
  test('fails when Remix dependencies are present', () => {
    const packageJson = {
      dependencies: {
        '@remix-run/react': '^2.0.0',
        '@shopify/hydrogen': '2025.5.0',
        'react-router': '7.6.0'
      }
    };
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson)
    );
    
    const result = checkPrerequisites(tempDir);
    
    expect(result.ready).toBe(false);
    expect(result.message).toContain('Remix dependencies detected');
    expect(result.message).toContain('@remix-run/react');
    expect(result.message).toContain('npx codemod remix/2/react-router/upgrade');
  });
  
  test('fails when React Router is missing', () => {
    const packageJson = {
      dependencies: {
        '@shopify/hydrogen': '2025.5.0'
      }
    };
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson)
    );
    
    const result = checkPrerequisites(tempDir);
    
    expect(result.ready).toBe(false);
    expect(result.message).toContain('No react-router dependency found');
  });
  
  test('fails when already on React Router 7.8.x', () => {
    const packageJson = {
      dependencies: {
        '@shopify/hydrogen': '2025.5.0',
        'react-router': '7.8.2'
      }
    };
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson)
    );
    
    const result = checkPrerequisites(tempDir);
    
    expect(result.ready).toBe(false);
    expect(result.message).toContain('Already on React Router 7.8.x');
  });
  
  test('fails when Hydrogen is missing', () => {
    const packageJson = {
      dependencies: {
        'react-router': '7.6.0'
      }
    };
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson)
    );
    
    const result = checkPrerequisites(tempDir);
    
    expect(result.ready).toBe(false);
    expect(result.message).toContain('No @shopify/hydrogen dependency found');
  });
  
  test('passes when all prerequisites are met', () => {
    const packageJson = {
      dependencies: {
        '@shopify/hydrogen': '2025.5.0',
        'react-router': '7.6.0'
      }
    };
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson)
    );
    
    // Create app directory for language detection
    fs.mkdirSync(path.join(tempDir, 'app'), { recursive: true });
    
    const result = checkPrerequisites(tempDir);
    
    expect(result.ready).toBe(true);
    expect(result.details?.hasRemixDeps).toBe(false);
    expect(result.details?.hasReactRouter).toBe(true);
    expect(result.details?.hydrogenVersion).toBe('2025.5.0');
    expect(result.details?.reactRouterVersion).toBe('7.6.0');
  });
  
  test('checks devDependencies as well', () => {
    const packageJson = {
      dependencies: {
        '@shopify/hydrogen': '2025.5.0'
      },
      devDependencies: {
        'react-router': '7.6.0'
      }
    };
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify(packageJson)
    );
    
    const result = checkPrerequisites(tempDir);
    
    expect(result.ready).toBe(true);
  });
});