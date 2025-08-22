#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import {fileURLToPath} from 'url';
import {execSync} from 'child_process';
import {randomBytes} from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Create a temporary test directory
 */
export function createTempDir() {
  const tempDir = path.join(
    __dirname,
    '..',
    'temp',
    `test-${randomBytes(8).toString('hex')}`
  );
  fs.mkdirSync(tempDir, {recursive: true});
  return tempDir;
}

/**
 * Clean up a temporary directory
 */
export function cleanupTempDir(tempDir) {
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, {recursive: true, force: true});
  }
}

/**
 * Create a test project structure
 */
export function createTestProject(tempDir) {
  const dirs = [
    'templates/skeleton',
    'packages/test-package',
    'examples/test-example',
  ];
  
  for (const dir of dirs) {
    fs.mkdirSync(path.join(tempDir, dir), {recursive: true});
  }
  
  // Create a basic package.json
  fs.writeFileSync(
    path.join(tempDir, 'package.json'),
    JSON.stringify({
      name: 'test-project',
      scripts: {
        codegen: 'echo "Running codegen"',
      },
    }, null, 2)
  );
  
  // Create package.json in templates/skeleton
  fs.writeFileSync(
    path.join(tempDir, 'templates/skeleton/package.json'),
    JSON.stringify({
      name: 'skeleton',
      scripts: {
        codegen: 'echo "Running skeleton codegen"',
      },
    }, null, 2)
  );
  
  return tempDir;
}

/**
 * Create a GraphQL file with specified content
 */
export function createGraphQLFile(dir, filename, content) {
  const filePath = path.join(dir, filename);
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  fs.writeFileSync(filePath, content);
  return filePath;
}

/**
 * Create a generated TypeScript definition file
 */
export function createGeneratedFile(dir, filename, content) {
  const filePath = path.join(dir, filename);
  fs.mkdirSync(path.dirname(filePath), {recursive: true});
  
  // Default generated file content if not provided
  const defaultContent = content || `/* eslint-disable */
/* @ts-nocheck */
// This file is auto-generated

export type Product = {
  id: string;
  title: string;
};

export type CartFragment = {
  id: string;
  lines: Array<{
    id: string;
    quantity: number;
  }>;
};
`;
  
  fs.writeFileSync(filePath, defaultContent);
  return filePath;
}

/**
 * Run a validation script and capture output
 */
export async function runValidationScript(scriptPath, workingDir) {
  try {
    const output = execSync(`node ${scriptPath}`, {
      cwd: workingDir,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    return {
      success: true,
      output,
      exitCode: 0,
    };
  } catch (error) {
    return {
      success: false,
      output: error.stdout || error.stderr || error.message,
      exitCode: error.status || 1,
    };
  }
}

/**
 * Mock a codegen execution
 */
export function mockCodegenExecution(dir, options = {}) {
  const {shouldFail = false, modifyFiles = false} = options;
  
  // Create a mock codegen script
  const mockScript = `
    const fs = require('fs');
    const path = require('path');
    
    ${shouldFail ? 'process.exit(1);' : ''}
    
    // Find generated files and potentially modify them
    const files = fs.readdirSync('${dir}', {recursive: true})
      .filter(f => f.includes('.generated.'));
    
    for (const file of files) {
      const filePath = path.join('${dir}', file);
      if (fs.statSync(filePath).isFile()) {
        const content = fs.readFileSync(filePath, 'utf8');
        ${modifyFiles ? 
          "fs.writeFileSync(filePath, content + '\\n// Fresh codegen output');" : 
          "// No modifications"
        }
      }
    }
  `;
  
  const scriptPath = path.join(dir, 'mock-codegen.js');
  fs.writeFileSync(scriptPath, mockScript);
  
  return scriptPath;
}

/**
 * Assert that validation fails with expected message
 */
export function assertValidationFails(result, expectedMessage) {
  if (result.success) {
    throw new Error(`Expected validation to fail, but it passed`);
  }
  
  if (result.exitCode !== 1) {
    throw new Error(`Expected exit code 1, got ${result.exitCode}`);
  }
  
  if (expectedMessage && !result.output.includes(expectedMessage)) {
    throw new Error(
      `Expected output to contain "${expectedMessage}", but got:\n${result.output}`
    );
  }
}

/**
 * Assert that validation passes
 */
export function assertValidationPasses(result) {
  if (!result.success) {
    throw new Error(
      `Expected validation to pass, but it failed with:\n${result.output}`
    );
  }
  
  if (result.exitCode !== 0) {
    throw new Error(`Expected exit code 0, got ${result.exitCode}`);
  }
}

/**
 * Create a mock GraphQL schema file
 */
export function createMockSchema(dir) {
  const schemaPath = path.join(dir, 'storefront.schema.json');
  const schema = {
    data: {
      __schema: {
        types: [
          {
            name: 'Product',
            fields: [
              {name: 'id', type: {name: 'ID'}},
              {name: 'title', type: {name: 'String'}},
              {name: 'description', type: {name: 'String'}},
            ],
          },
          {
            name: 'Cart',
            fields: [
              {name: 'id', type: {name: 'ID'}},
              {name: 'lines', type: {name: 'CartLineConnection'}},
            ],
          },
          {
            name: 'CartCreatePayload',
            fields: [
              {name: 'cart', type: {name: 'Cart'}},
              {name: 'warnings', type: {name: 'CartWarning'}},
            ],
          },
          {
            name: 'CartWarning',
            fields: [
              {name: 'code', type: {name: 'String'}},
              {name: 'message', type: {name: 'String'}},
            ],
          },
        ],
      },
    },
  };
  
  fs.writeFileSync(schemaPath, JSON.stringify(schema, null, 2));
  return schemaPath;
}