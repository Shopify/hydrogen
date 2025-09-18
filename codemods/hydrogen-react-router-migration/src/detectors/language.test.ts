import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { detectProjectLanguage, getTransformationStrategy } from './language';

describe('Language Detection', () => {
  let tempDir: string;
  
  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'test-'));
  });
  
  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
  
  test('detects TypeScript project with tsconfig.json', () => {
    // Create TypeScript project structure
    fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
      devDependencies: { typescript: '^5.0.0' }
    }));
    fs.mkdirSync(path.join(tempDir, 'app'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'app', 'root.tsx'), '');
    
    const result = detectProjectLanguage(tempDir);
    
    expect(result.isTypeScript).toBe(true);
    expect(result.hasTsConfig).toBe(true);
    expect(result.hasTypeScriptDependency).toBe(true);
    expect(result.fileExtensions.primary).toBe('.ts');
    expect(result.fileExtensions.component).toBe('.tsx');
  });
  
  test('detects JavaScript project without TypeScript', () => {
    // Create JavaScript project structure
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
      dependencies: { react: '^18.0.0' }
    }));
    fs.mkdirSync(path.join(tempDir, 'app'), { recursive: true });
    fs.writeFileSync(path.join(tempDir, 'app', 'root.jsx'), '');
    fs.writeFileSync(path.join(tempDir, 'app', 'entry.client.js'), '');
    
    const result = detectProjectLanguage(tempDir);
    
    expect(result.isTypeScript).toBe(false);
    expect(result.hasTsConfig).toBe(false);
    expect(result.hasTypeScriptDependency).toBe(false);
    expect(result.fileExtensions.primary).toBe('.js');
    expect(result.fileExtensions.component).toBe('.jsx');
    expect(result.majorityLanguage).toBe('javascript');
  });
  
  test('detects mixed codebase', () => {
    fs.writeFileSync(path.join(tempDir, 'package.json'), JSON.stringify({
      devDependencies: { typescript: '^5.0.0' }
    }));
    fs.writeFileSync(path.join(tempDir, 'tsconfig.json'), '{}');
    fs.mkdirSync(path.join(tempDir, 'app'), { recursive: true });
    
    // Mix of TS and JS files
    fs.writeFileSync(path.join(tempDir, 'app', 'root.tsx'), '');
    fs.writeFileSync(path.join(tempDir, 'app', 'entry.client.tsx'), '');
    fs.writeFileSync(path.join(tempDir, 'app', 'utils.js'), '');
    fs.writeFileSync(path.join(tempDir, 'app', 'helpers.js'), '');
    
    const result = detectProjectLanguage(tempDir);
    
    expect(result.isTypeScript).toBe(true); // Has TS config
    expect(result.majorityLanguage).toBe('mixed');
  });
  
  test('transformation strategy for TypeScript', () => {
    const language = {
      isTypeScript: true,
      hasTypeScriptDependency: true,
      hasTsConfig: true,
      fileExtensions: { primary: '.ts' as const, component: '.tsx' as const },
      routeFilePattern: '**/*.{ts,tsx}',
      majorityLanguage: 'typescript' as const
    };
    
    const strategy = getTransformationStrategy(language);
    
    expect(strategy.addTypeImport('path', 'Type'))
      .toBe("import type {Type} from 'path';");
    expect(strategy.addTypeAnnotation('param', 'ParamType'))
      .toBe('param: ParamType');
    expect(strategy.shouldUpdateTsConfig()).toBe(true);
    expect(strategy.getConfigFileName()).toBe('react-router.config.ts');
  });
  
  test('transformation strategy for JavaScript', () => {
    const language = {
      isTypeScript: false,
      hasTypeScriptDependency: false,
      hasTsConfig: false,
      fileExtensions: { primary: '.js' as const, component: '.jsx' as const },
      routeFilePattern: '**/*.{js,jsx}',
      majorityLanguage: 'javascript' as const
    };
    
    const strategy = getTransformationStrategy(language);
    
    expect(strategy.addTypeImport('path', 'Type'))
      .toBe("/** @typedef {import('path').Type} Type */");
    expect(strategy.addTypeAnnotation('param', 'ParamType'))
      .toContain('@param {ParamType} param');
    expect(strategy.shouldUpdateTsConfig()).toBe(false);
    expect(strategy.getConfigFileName()).toBe('react-router.config.js');
  });
});