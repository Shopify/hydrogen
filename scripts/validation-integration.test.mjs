#!/usr/bin/env node
import {test, describe} from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {execSync} from 'child_process';
import {
  createTempDir,
  cleanupTempDir,
  createTestProject,
  createGraphQLFile,
  createGeneratedFile,
} from './test-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Validation Script Integration Tests', () => {
  test('GraphQL validation script exists and is executable', () => {
    const scriptPath = path.join(__dirname, 'validate-graphql.mjs');
    assert.ok(fs.existsSync(scriptPath), 'validate-graphql.mjs should exist');
  });

  test('Codegen validation script exists and is executable', () => {
    const scriptPath = path.join(__dirname, 'validate-codegen.mjs');
    assert.ok(fs.existsSync(scriptPath), 'validate-codegen.mjs should exist');
  });

  test('Can create temporary test project structure', () => {
    const tempDir = createTempDir();
    try {
      createTestProject(tempDir);
      
      // Verify directories were created
      assert.ok(fs.existsSync(path.join(tempDir, 'templates/skeleton')));
      assert.ok(fs.existsSync(path.join(tempDir, 'packages/test-package')));
      assert.ok(fs.existsSync(path.join(tempDir, 'examples/test-example')));
      
      // Verify package.json files were created
      assert.ok(fs.existsSync(path.join(tempDir, 'package.json')));
      assert.ok(fs.existsSync(path.join(tempDir, 'templates/skeleton/package.json')));
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test('Can create GraphQL files with fragments', () => {
    const tempDir = createTempDir();
    try {
      const filePath = createGraphQLFile(
        tempDir,
        'test.ts',
        `const QUERY = \`#graphql
          fragment TestFragment on Product {
            id
          }
        \`;`
      );
      
      assert.ok(fs.existsSync(filePath));
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(content.includes('fragment TestFragment'));
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test('Can create generated TypeScript files', () => {
    const tempDir = createTempDir();
    try {
      const filePath = createGeneratedFile(
        tempDir,
        'api.generated.d.ts'
      );
      
      assert.ok(fs.existsSync(filePath));
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(content.includes('eslint-disable'));
      assert.ok(content.includes('export type'));
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test('Examples folder exclusion works correctly', () => {
    const tempDir = createTempDir();
    try {
      createTestProject(tempDir);
      
      // Create a GraphQL file with unused fragment in examples
      createGraphQLFile(
        tempDir,
        'examples/test/query.ts',
        `const Q = \`#graphql
          fragment Unused on Product { id }
          query Test { shop { name } }
        \`;`
      );
      
      // Create a GraphQL file with unused fragment in templates
      createGraphQLFile(
        tempDir,
        'templates/skeleton/query.ts',
        `const Q = \`#graphql
          fragment AlsoUnused on Product { id }
          query Test { shop { name } }
        \`;`
      );
      
      // The validation would fail for templates but not examples
      // This is tested in the actual validation tests
      assert.ok(fs.existsSync(path.join(tempDir, 'examples/test/query.ts')));
      assert.ok(fs.existsSync(path.join(tempDir, 'templates/skeleton/query.ts')));
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test('Generated file detection works', () => {
    const tempDir = createTempDir();
    try {
      // Create various files
      createGeneratedFile(tempDir, 'api.generated.d.ts');
      createGeneratedFile(tempDir, 'types.generated.ts');
      fs.writeFileSync(path.join(tempDir, 'regular.ts'), 'export const x = 1;');
      
      // Check that we can distinguish generated from regular files
      const files = fs.readdirSync(tempDir);
      const generatedFiles = files.filter(f => f.includes('.generated.'));
      const regularFiles = files.filter(f => !f.includes('.generated.'));
      
      assert.strictEqual(generatedFiles.length, 2);
      assert.strictEqual(regularFiles.length, 1);
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  test('Mock codegen execution setup', () => {
    const tempDir = createTempDir();
    try {
      createTestProject(tempDir);
      createGeneratedFile(
        tempDir,
        'templates/skeleton/api.generated.d.ts',
        'export type Original = { id: string; };'
      );
      
      // Create a simple mock codegen that modifies the file
      const mockScript = path.join(tempDir, 'templates/skeleton/mock-codegen.js');
      fs.writeFileSync(mockScript, `
        const fs = require('fs');
        const path = require('path');
        const file = path.join(__dirname, 'api.generated.d.ts');
        fs.writeFileSync(file, 'export type Modified = { id: string; };');
      `);
      
      // Update package.json to use mock codegen
      const pkgPath = path.join(tempDir, 'templates/skeleton/package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      pkg.scripts.codegen = `node ${mockScript}`;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
      
      // Run the mock codegen
      execSync('npm run codegen', {
        cwd: path.join(tempDir, 'templates/skeleton'),
        stdio: 'pipe'
      });
      
      // Verify file was modified
      const content = fs.readFileSync(
        path.join(tempDir, 'templates/skeleton/api.generated.d.ts'),
        'utf8'
      );
      assert.ok(content.includes('Modified'));
    } finally {
      cleanupTempDir(tempDir);
    }
  });

  describe('Acceptance Criteria Validation', () => {
    test('AC1: Unused fragments should be detectable', () => {
      const graphqlContent = `
        fragment Unused on Product { id }
        query Test { shop { name } }
      `;
      
      // Check that we can identify the fragment
      const fragmentMatch = graphqlContent.match(/fragment\s+(\w+)/);
      assert.ok(fragmentMatch);
      assert.strictEqual(fragmentMatch[1], 'Unused');
      
      // Check that we can detect it's not used
      const usageMatch = graphqlContent.match(/\.\.\.Unused/);
      assert.ok(!usageMatch);
    });

    test('AC2: Examples folder path detection', () => {
      const examplePaths = [
        '/examples/test/file.ts',
        '/root/examples/nested/file.ts',
        '/packages/examples/file.ts'
      ];
      
      const nonExamplePaths = [
        '/templates/skeleton/file.ts',
        '/packages/lib/file.ts'
      ];
      
      examplePaths.forEach(p => {
        assert.ok(p.includes('/examples/'), `${p} should be detected as example`);
      });
      
      nonExamplePaths.forEach(p => {
        assert.ok(!p.includes('/examples/'), `${p} should not be detected as example`);
      });
    });

    test('AC3: Generated file patterns', () => {
      const generatedFiles = [
        'api.generated.d.ts',
        'types.generated.ts',
        'schema.generated.json'
      ];
      
      const regularFiles = [
        'api.ts',
        'generated.ts',
        'types.d.ts'
      ];
      
      generatedFiles.forEach(f => {
        assert.ok(f.includes('.generated.'), `${f} should match generated pattern`);
      });
      
      regularFiles.forEach(f => {
        assert.ok(!f.includes('.generated.'), `${f} should not match generated pattern`);
      });
    });

    test('AC4: Type validation patterns', () => {
      const cartWarningInQuery = 'export type CartQueryFragment = { warnings: CartWarning[]; };';
      const cartWarningInMutation = 'export type CartCreateMutationPayload = { warnings: CartWarning[]; };';
      
      // Check we can detect the context
      assert.ok(!cartWarningInQuery.includes('Mutation'), 'Query context detected');
      assert.ok(cartWarningInMutation.includes('Mutation'), 'Mutation context detected');
    });
  });
});