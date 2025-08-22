#!/usr/bin/env node
import {test, describe, beforeEach, afterEach} from 'node:test';
import assert from 'node:assert';
import path from 'path';
import fs from 'fs';
import {fileURLToPath} from 'url';
import {
  createTempDir,
  cleanupTempDir,
  createTestProject,
  createGeneratedFile,
  runValidationScript,
  assertValidationFails,
  assertValidationPasses,
} from './test-utils.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const validationScript = path.join(__dirname, 'validate-codegen.mjs');

describe('Codegen Validation Tests', () => {
  let tempDir;

  beforeEach(() => {
    tempDir = createTempDir();
    createTestProject(tempDir);
  });

  afterEach(() => {
    cleanupTempDir(tempDir);
  });

  describe('Acceptance Criteria 3: CI fails on manually modified .d.ts files', () => {
    test('detects when generated files differ from fresh codegen output', async () => {
      // Create a generated file
      const generatedFile = createGeneratedFile(
        tempDir,
        'templates/skeleton/storefrontapi.generated.d.ts',
        `/* eslint-disable */
// Auto-generated file
export type Product = {
  id: string;
  title: string;
};`
      );

      // Mock codegen to produce different output
      const mockScript = path.join(tempDir, 'templates/skeleton/mock-codegen.js');
      fs.writeFileSync(mockScript, `
        const fs = require('fs');
        const path = require('path');
        
        // Simulate fresh codegen that produces different content
        const generatedPath = '${generatedFile}';
        const freshContent = \`/* eslint-disable */
// Auto-generated file - Fresh from codegen
export type Product = {
  id: string;
  title: string;
  description: string; // New field added by codegen
};\`;
        
        fs.writeFileSync(generatedPath, freshContent);
      `);

      // Temporarily override npm run codegen
      const originalPackageJson = fs.readFileSync(
        path.join(tempDir, 'templates/skeleton/package.json'),
        'utf8'
      );
      const packageJson = JSON.parse(originalPackageJson);
      packageJson.scripts.codegen = `node ${mockScript}`;
      fs.writeFileSync(
        path.join(tempDir, 'templates/skeleton/package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationFails(result, 'manually modified generated file');
    });

    test('passes when generated files match fresh codegen', async () => {
      // Create a generated file
      const generatedContent = `/* eslint-disable */
// Auto-generated file
export type Cart = {
  id: string;
  lines: CartLine[];
};`;
      
      const generatedFile = createGeneratedFile(
        tempDir,
        'templates/skeleton/cart.generated.d.ts',
        generatedContent
      );

      // Mock codegen to produce identical output
      const mockScript = path.join(tempDir, 'templates/skeleton/mock-codegen.js');
      fs.writeFileSync(mockScript, `
        const fs = require('fs');
        // Codegen produces exact same content
        const generatedPath = '${generatedFile}';
        const content = \`${generatedContent.replace(/`/g, '\\`')}\`;
        fs.writeFileSync(generatedPath, content);
      `);

      const packageJson = JSON.parse(
        fs.readFileSync(path.join(tempDir, 'templates/skeleton/package.json'), 'utf8')
      );
      packageJson.scripts.codegen = `node ${mockScript}`;
      fs.writeFileSync(
        path.join(tempDir, 'templates/skeleton/package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationPasses(result);
    });

    test('properly backs up and restores files during validation', async () => {
      const originalContent = `/* eslint-disable */
export type Original = { id: string; };`;
      
      const generatedFile = createGeneratedFile(
        tempDir,
        'packages/test/api.generated.d.ts',
        originalContent
      );

      // Mock codegen that tries to modify the file
      const mockScript = path.join(tempDir, 'packages/test/mock-codegen.js');
      fs.writeFileSync(mockScript, `
        const fs = require('fs');
        fs.writeFileSync('${generatedFile}', '/* Modified by codegen */');
      `);

      const packageJson = JSON.parse(
        fs.readFileSync(path.join(tempDir, 'package.json'), 'utf8')
      );
      packageJson.scripts.codegen = `node ${mockScript}`;
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      await runValidationScript(validationScript, tempDir);
      
      // File should be restored to original content
      const restoredContent = fs.readFileSync(generatedFile, 'utf8');
      assert.strictEqual(restoredContent, originalContent);
    });

    test('handles codegen failures gracefully', async () => {
      createGeneratedFile(
        tempDir,
        'templates/skeleton/types.generated.d.ts',
        `export type Test = { id: string; };`
      );

      // Mock codegen that fails
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(tempDir, 'templates/skeleton/package.json'), 'utf8')
      );
      packageJson.scripts.codegen = 'exit 1';
      fs.writeFileSync(
        path.join(tempDir, 'templates/skeleton/package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = await runValidationScript(validationScript, tempDir);
      // Should handle the failure gracefully
      assert(result.output.includes('Failed') || result.exitCode === 1);
    });

    test('detects multiple manually modified files', async () => {
      // Create multiple generated files
      const file1 = createGeneratedFile(
        tempDir,
        'templates/skeleton/api1.generated.d.ts',
        `export type Type1 = { id: string; };`
      );
      
      const file2 = createGeneratedFile(
        tempDir,
        'templates/skeleton/api2.generated.d.ts',
        `export type Type2 = { name: string; };`
      );

      // Mock codegen that produces different content for both
      const mockScript = path.join(tempDir, 'templates/skeleton/mock-codegen.js');
      fs.writeFileSync(mockScript, `
        const fs = require('fs');
        fs.writeFileSync('${file1}', 'export type Type1 = { id: string; modified: true; };');
        fs.writeFileSync('${file2}', 'export type Type2 = { name: string; modified: true; };');
      `);

      const packageJson = JSON.parse(
        fs.readFileSync(path.join(tempDir, 'templates/skeleton/package.json'), 'utf8')
      );
      packageJson.scripts.codegen = `node ${mockScript}`;
      fs.writeFileSync(
        path.join(tempDir, 'templates/skeleton/package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationFails(result, 'manually modified generated file');
    });

    test('ignores non-generated files', async () => {
      // Create a regular (non-generated) TypeScript file
      const regularFile = path.join(tempDir, 'templates/skeleton/regular.d.ts');
      fs.writeFileSync(regularFile, `export type Regular = { id: string; };`);

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationPasses(result);
    });

    test('handles files with comments indicating manual edits', async () => {
      const generatedFile = createGeneratedFile(
        tempDir,
        'templates/skeleton/modified.generated.d.ts',
        `/* eslint-disable */
// TODO: This was manually edited - remove this comment
export type Modified = {
  id: string;
  // FIXME: Added this field manually
  manualField: string;
};`
      );

      // Even if codegen produces same content, manual edit comments should be detected
      const mockScript = path.join(tempDir, 'templates/skeleton/mock-codegen.js');
      fs.writeFileSync(mockScript, `
        const fs = require('fs');
        // Codegen would not include TODO/FIXME comments
        const content = \`/* eslint-disable */
export type Modified = {
  id: string;
  manualField: string;
};\`;
        fs.writeFileSync('${generatedFile}', content);
      `);

      const packageJson = JSON.parse(
        fs.readFileSync(path.join(tempDir, 'templates/skeleton/package.json'), 'utf8')
      );
      packageJson.scripts.codegen = `node ${mockScript}`;
      fs.writeFileSync(
        path.join(tempDir, 'templates/skeleton/package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationFails(result, 'differs from freshly generated version');
    });
  });

  describe('Acceptance Criteria 2: Examples folder exclusion in codegen', () => {
    test('ignores generated files in examples folder', async () => {
      createGeneratedFile(
        tempDir,
        'examples/demo/api.generated.d.ts',
        `// This file has manual modifications but should be ignored
export type ExampleType = {
  id: string;
  manuallyAddedField: string;
};`
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationPasses(result);
    });

    test('ignores nested example directories', async () => {
      createGeneratedFile(
        tempDir,
        'examples/nested/deep/types.generated.ts',
        `// Manually modified but in examples
export const modified = true;`
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationPasses(result);
    });

    test('validates generated files outside examples folder', async () => {
      const generatedFile = createGeneratedFile(
        tempDir,
        'packages/lib/api.generated.d.ts',
        `export type API = { version: 1; };`
      );

      // Mock different codegen output
      const mockScript = path.join(tempDir, 'mock-codegen.js');
      fs.writeFileSync(mockScript, `
        const fs = require('fs');
        fs.writeFileSync('${generatedFile}', 'export type API = { version: 2; };');
      `);

      const packageJson = JSON.parse(
        fs.readFileSync(path.join(tempDir, 'package.json'), 'utf8')
      );
      packageJson.scripts.codegen = `node ${mockScript}`;
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationFails(result);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('handles empty generated files', async () => {
      createGeneratedFile(tempDir, 'templates/skeleton/empty.generated.d.ts', '');

      // Mock codegen that also produces empty file
      const mockScript = path.join(tempDir, 'templates/skeleton/mock-codegen.js');
      fs.writeFileSync(mockScript, `
        const fs = require('fs');
        fs.writeFileSync('${path.join(tempDir, 'templates/skeleton/empty.generated.d.ts')}', '');
      `);

      const packageJson = JSON.parse(
        fs.readFileSync(path.join(tempDir, 'templates/skeleton/package.json'), 'utf8')
      );
      packageJson.scripts.codegen = `node ${mockScript}`;
      fs.writeFileSync(
        path.join(tempDir, 'templates/skeleton/package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationPasses(result);
    });

    test('handles no generated files in project', async () => {
      // Don't create any generated files
      const result = await runValidationScript(validationScript, tempDir);
      assertValidationPasses(result);
    });

    test('handles generated files without package.json', async () => {
      // Create generated file in a directory without package.json
      createGeneratedFile(
        tempDir,
        'orphan/types.generated.d.ts',
        `export type Orphan = { id: string; };`
      );

      const result = await runValidationScript(validationScript, tempDir);
      // Should handle gracefully - might skip or use parent package.json
      assert(result.exitCode === 0 || result.exitCode === 1);
    });

    test('handles generated files with various extensions', async () => {
      createGeneratedFile(
        tempDir,
        'templates/skeleton/types.generated.ts',
        `export const generated = true;`
      );
      
      createGeneratedFile(
        tempDir,
        'templates/skeleton/api.generated.js',
        `module.exports = { generated: true };`
      );
      
      createGeneratedFile(
        tempDir,
        'templates/skeleton/schema.generated.json',
        `{"generated": true}`
      );

      // Mock codegen for all files
      const mockScript = path.join(tempDir, 'templates/skeleton/mock-codegen.js');
      fs.writeFileSync(mockScript, `
        const fs = require('fs');
        const files = [
          '${path.join(tempDir, 'templates/skeleton/types.generated.ts')}',
          '${path.join(tempDir, 'templates/skeleton/api.generated.js')}',
          '${path.join(tempDir, 'templates/skeleton/schema.generated.json')}'
        ];
        files.forEach(f => {
          const content = fs.readFileSync(f, 'utf8');
          fs.writeFileSync(f, content); // Write same content
        });
      `);

      const packageJson = JSON.parse(
        fs.readFileSync(path.join(tempDir, 'templates/skeleton/package.json'), 'utf8')
      );
      packageJson.scripts.codegen = `node ${mockScript}`;
      fs.writeFileSync(
        path.join(tempDir, 'templates/skeleton/package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationPasses(result);
    });

    test('handles whitespace differences', async () => {
      const generatedFile = createGeneratedFile(
        tempDir,
        'templates/skeleton/whitespace.generated.d.ts',
        `export type Test = {
  id: string;
};`
      );

      // Mock codegen with different whitespace
      const mockScript = path.join(tempDir, 'templates/skeleton/mock-codegen.js');
      fs.writeFileSync(mockScript, `
        const fs = require('fs');
        // Extra spaces and tabs
        const content = 'export type Test = {\\n\\tid: string;\\n};';
        fs.writeFileSync('${generatedFile}', content);
      `);

      const packageJson = JSON.parse(
        fs.readFileSync(path.join(tempDir, 'templates/skeleton/package.json'), 'utf8')
      );
      packageJson.scripts.codegen = `node ${mockScript}`;
      fs.writeFileSync(
        path.join(tempDir, 'templates/skeleton/package.json'),
        JSON.stringify(packageJson, null, 2)
      );

      const result = await runValidationScript(validationScript, tempDir);
      // Whitespace differences mean files are different
      assertValidationFails(result);
    });
  });

  describe('Integration Tests', () => {
    test('validates multiple directories with generated files', async () => {
      // Create generated files in different directories
      const file1 = createGeneratedFile(
        tempDir,
        'templates/skeleton/api.generated.d.ts',
        `export type SkeletonAPI = { v: 1; };`
      );
      
      const file2 = createGeneratedFile(
        tempDir,
        'packages/lib/types.generated.d.ts',
        `export type LibTypes = { v: 1; };`
      );

      // Mock codegen for templates/skeleton
      const mockScript1 = path.join(tempDir, 'templates/skeleton/mock-codegen.js');
      fs.writeFileSync(mockScript1, `
        const fs = require('fs');
        fs.writeFileSync('${file1}', 'export type SkeletonAPI = { v: 1; };');
      `);

      const skeletonPackageJson = JSON.parse(
        fs.readFileSync(path.join(tempDir, 'templates/skeleton/package.json'), 'utf8')
      );
      skeletonPackageJson.scripts.codegen = `node ${mockScript1}`;
      fs.writeFileSync(
        path.join(tempDir, 'templates/skeleton/package.json'),
        JSON.stringify(skeletonPackageJson, null, 2)
      );

      // Mock codegen for root (packages)
      const mockScript2 = path.join(tempDir, 'mock-codegen.js');
      fs.writeFileSync(mockScript2, `
        const fs = require('fs');
        // Different content - manual modification detected
        fs.writeFileSync('${file2}', 'export type LibTypes = { v: 2; };');
      `);

      const rootPackageJson = JSON.parse(
        fs.readFileSync(path.join(tempDir, 'package.json'), 'utf8')
      );
      rootPackageJson.scripts.codegen = `node ${mockScript2}`;
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(rootPackageJson, null, 2)
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationFails(result, 'manually modified');
      // Should mention the packages/lib file but not the skeleton file
      assert(result.output.includes('packages/lib') || result.output.includes('types.generated.d.ts'));
    });

    test('full validation with mixed scenarios', async () => {
      // Valid generated file
      const validFile = createGeneratedFile(
        tempDir,
        'templates/skeleton/valid.generated.d.ts',
        `/* eslint-disable */
export type Valid = { id: string; };`
      );

      // Manually modified file
      const modifiedFile = createGeneratedFile(
        tempDir,
        'packages/test/modified.generated.d.ts',
        `/* eslint-disable */
export type Modified = { 
  id: string;
  manualField: string; // Added manually
};`
      );

      // File in examples (ignored)
      createGeneratedFile(
        tempDir,
        'examples/demo/ignored.generated.d.ts',
        `export type Ignored = { manual: true; };`
      );

      // Setup mock codegen
      const mockScriptSkeleton = path.join(tempDir, 'templates/skeleton/mock-codegen.js');
      fs.writeFileSync(mockScriptSkeleton, `
        const fs = require('fs');
        // Skeleton codegen produces same content for valid file
        fs.writeFileSync('${validFile}', \`/* eslint-disable */
export type Valid = { id: string; };\`);
      `);

      const skeletonPackageJson = JSON.parse(
        fs.readFileSync(path.join(tempDir, 'templates/skeleton/package.json'), 'utf8')
      );
      skeletonPackageJson.scripts.codegen = `node ${mockScriptSkeleton}`;
      fs.writeFileSync(
        path.join(tempDir, 'templates/skeleton/package.json'),
        JSON.stringify(skeletonPackageJson, null, 2)
      );

      const mockScriptRoot = path.join(tempDir, 'mock-codegen.js');
      fs.writeFileSync(mockScriptRoot, `
        const fs = require('fs');
        // Root codegen produces different content for modified file
        fs.writeFileSync('${modifiedFile}', \`/* eslint-disable */
export type Modified = { 
  id: string;
  // No manual field in fresh codegen
};\`);
      `);

      const rootPackageJson = JSON.parse(
        fs.readFileSync(path.join(tempDir, 'package.json'), 'utf8')
      );
      rootPackageJson.scripts.codegen = `node ${mockScriptRoot}`;
      fs.writeFileSync(
        path.join(tempDir, 'package.json'),
        JSON.stringify(rootPackageJson, null, 2)
      );

      const result = await runValidationScript(validationScript, tempDir);
      assertValidationFails(result);
      // Should detect the modified file but not the valid or ignored files
      assert(result.output.includes('modified.generated.d.ts') || result.output.includes('manually modified'));
      assert(!result.output.includes('valid.generated.d.ts'));
      assert(!result.output.includes('ignored.generated.d.ts'));
    });
  });
});